import EventEmitter2 from 'eventemitter2';
import * as events from './events';
import PluginError from './plugin-error';
import merge from 'merge';
import { defaults as _defaults, allowedEncodings } from './defaults';

class TimeoutError extends Error {
  constructor(timeout) {
    super('Request timed out');
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

export default class Client {
  constructor(defaults) {
    const encodingIsInvalid = () => defaults &&
      typeof defaults.encoding !== 'undefined' &&
      allowedEncodings.indexOf(defaults.encoding) === -1;

    if (encodingIsInvalid()) {
      throw new Error(`${defaults.encoding} is not an allowed encoding value.`);
    }

    this.defaults = merge.recursive(true, this._getDefaults(), defaults);

    if (this.defaults.url) {
      this.defaults.sep = this.defaults.url[this.defaults.url.length - 1] === '/' ? '' : '/';
    }

    this.eventEmitter = new EventEmitter2();
    this._plugins = [];
  }

  _getDefaults() {
    return _defaults;
  }

  async _callPluginMethod(method, mutableArgIdx, earlyExit, ...args) {
    let i = 0;

    const shouldContinue = () => (earlyExit ? args[mutableArgIdx] : true);

    while (i < this._plugins.length && shouldContinue()) {
      if (this._plugins[i][method]) {
        args[mutableArgIdx] = await this._plugins[i][method](...args);
      }
      i += 1;
    }

    return args[mutableArgIdx];
  }

  _callOnStarts(request) {
    return this._callPluginMethod('onStart', 0, true, request);
  }

  _callOnSuccesses(request, response) {
    return this._callPluginMethod('onSuccess', 1, false, request, response);
  }

  _callOnCompletes(request, response, clonedRequest) {
    return this._callPluginMethod('onComplete', 1, false, request, response, clonedRequest);
  }

  _callOnFails(request, response) {
    return this._callPluginMethod('onFail', 1, false, request, response);
  }

  _callOnErrors(request, response) {
    return this._callPluginMethod('onError', 1, false, request, response);
  }

  _addHelpers(helpers) {
    if (helpers) {
      Object.keys(helpers).forEach((key) => {
        this[key] = helpers[key];
      });
    }
  }

  _getFullPath(path) {
    let fullPath = path || '';
    if (this.defaults && this.defaults.url) {
      fullPath = `${this.defaults.url}${this.defaults.sep}${fullPath}`;
    }
    return fullPath;
  }

  _getRequest(path, options) {
    const fullPath = this._getFullPath(path);
    return new Request(fullPath, options);
  }

  async fetch(path, options) {
    let request;
    let onStartError;

    if (path instanceof Request) {
      request = path;
    } else {
      request = this._getRequest(path, options);
    }

    this.eventEmitter.emit(events.REQUEST_START, request);
    const clonedRequest = request.clone();
    try {
      request = await this._callOnStarts(request);
    } catch (err) {
      onStartError = err;
    }

    if (request && !onStartError) {
      try {
        const response = await Promise.race([
          fetch(request),
          new Promise((_, reject) => setTimeout(
            () => reject(new TimeoutError((options && options.timeout) || this.defaults.timeout)),
            (options && options.timeout) || this.defaults.timeout
          )),
        ]);

        let mutatedResponse = await this._callOnCompletes(request, response, clonedRequest);

        if (mutatedResponse.status >= 400) {
          mutatedResponse = await this._callOnFails(request, mutatedResponse);
          this.eventEmitter.emit(events.REQUEST_FAILURE, request, mutatedResponse);
        } else {
          mutatedResponse = await this._callOnSuccesses(request, mutatedResponse);
          this.eventEmitter.emit(events.REQUEST_SUCCESS, request, mutatedResponse);
        }

        return mutatedResponse;
      } catch (err) {
        const mutatedError = await this._callOnErrors(request, err);
        this.eventEmitter.emit(events.REQUEST_ERROR, request, mutatedError);
        throw mutatedError;
      }
    }

    throw onStartError || new PluginError();
  }

  addPlugin(plugin) {
    plugin.client = this;
    this._plugins.push(plugin);
    this._addHelpers(plugin.helpers);
    if (plugin.onAddPlugin) {
      plugin.onAddPlugin(this);
    }
  }

  removePlugin(name) {
    let i = 0;
    for (i; i < this._plugins.length; i++) {
      if (this._plugins[i].name === name) {
        this._plugins.splice(i, 1);
        i -= 1;
      }
    }
  }

  on(event, cb) {
    this.eventEmitter.on(event, cb);
  }

  /* ---- HELPERS ---- */

  _formAppendArrayOrObject(formObject, data, key, forQueryString) {
    if (Array.isArray(data)) {
      data.forEach((val) => {
        if (typeof(val) === 'object') {
          this._formAppendArrayOrObject(formObject, val, `${key}[]`);
        } else {
          if (! forQueryString || this.defaults.bracketStyleArrays) {
            formObject.append(`${key}[]`, val);
          } else {
            formObject.append(`${key}`, val);
          }
        }
      });
    } else {
      Object.keys(data).forEach(val => {
        if (typeof(data[val]) === 'object') {
          this._formAppendArrayOrObject(formObject, data[val], `${key}[${val}]`);
        } else {
          formObject.append(`${key}[${val}]`, data[val]);
        }
      });
    }
  }

  _encodeForm(body, formObject, forQueryString) {
    Object.keys(body).forEach((val) => {
      if (typeof(body[val]) === 'object') {
        this._formAppendArrayOrObject(formObject, body[val], `${val}`, forQueryString);
      } else {
        formObject.append(val, body[val]);
      }
    });

    return formObject;
  }

  _getEncodingTypeFromContentType(contentType) {
    let encodingType = false;
    if (contentType) {
      if (contentType.match(/text\/.+/i)) {
        encodingType = 'text';
      } else {
        switch (contentType) {
          case 'application/json':
            encodingType = 'json';
            break;
          case 'multipart/form-data':
            encodingType = 'form-data';
            break;
          case 'application/x-www-form-urlencoded':
            encodingType = 'x-www-form-urlencoded';
            break;
          default:
        }
      }
    }

    return encodingType;
  }

  _encode(body, contentType) {
    let _body = body;
    let _contentType = contentType;

    let encodingType = this._getEncodingTypeFromContentType(_contentType);
    encodingType = encodingType || this.defaults.encoding;

    if (_body instanceof FormData || _body instanceof URLSearchParams) {
      return { body: _body, contentType: false };
    }

    let formObject;
    switch (encodingType) {
      case 'json':
        _body = JSON.stringify(_body);
        _contentType = 'application/json';
        break;
      case 'text':
        _contentType = _contentType || 'text/plain';
        break;
      case 'form-data':
        formObject = new FormData();
        _body = this._encodeForm(_body, formObject);
        _contentType = false;
        break;
      case 'x-www-form-urlencoded':
        formObject = new URLSearchParams();
        _body = this._encodeForm(_body, formObject).toString();
        _contentType = 'application/x-www-form-urlencoded';
        break;
      default:
    }

    return { body: _body, contentType: _contentType };
  }

  _buildOptions(method, body, options) {
    let _options = { ...this.defaults[method] };
    _options = merge.recursive(true, _options, options);

    if (body) {
      const { body: encodedBody, contentType } = this._encode(
        body,
        _options.headers['Content-Type']
      );

      if (contentType === false) {
        delete _options.headers['Content-Type'];
      } else {
        _options.headers['Content-Type'] = contentType;
      }

      _options.body = encodedBody;
    }
    return _options;
  }

  get(path, body, options) {
    const _options = this._buildOptions('get', undefined, options);
    let queryString = '';

    if (body && Object.keys(body).length) {
      queryString = this.defaults.queryStringifier.bind(this)(body);
    }

    _options.method = 'GET';

    return this.fetch((path || '') + queryString, _options);
  }

  post(path, body, options) {
    const _options = this._buildOptions('post', body, options);
    _options.method = 'POST';
    return this.fetch(path, _options);
  }

  put(path, body, options) {
    const _options = this._buildOptions('put', body, options);
    _options.method = 'PUT';
    return this.fetch(path, _options);
  }

  patch(path, body, options) {
    const _options = this._buildOptions('patch', body, options);
    _options.method = 'PATCH';
    return this.fetch(path, _options);
  }

  delete(path, options) {
    const _options = options || {};
    _options.method = 'DELETE';
    return this.fetch(path, _options);
  }
}
