import EventEmitter2 from 'eventemitter2';
import * as events from './events';
import MiddlewareError from './middleware-error';
import merge from 'merge';
import { defaults as _defaults, allowedEncodings } from './defaults';

export default class Client {
  constructor(defaults) {
    const encodingIsInvalid = () => defaults &&
      typeof defaults.encoding !== 'undefined' &&
      allowedEncodings.indexOf(defaults.encoding) === -1;

    if (encodingIsInvalid()) {
      throw new Error(`${defaults.encoding} is not an allowed encoding value.`);
    }

    this.defaults = merge.recursive(true, _defaults, defaults);

    if (this.defaults.url) {
      this.defaults.sep = this.defaults.url[this.defaults.url.length - 1] === '/' ? '' : '/';
    }

    this.eventEmitter = new EventEmitter2();
    this._middleware = [];
  }

  _callMiddlewareMethod(method, mutableArgIdx, earlyExit, ...args) {
    let i = 0;

    const shouldContinue = () => (earlyExit ? args[mutableArgIdx] : true);

    while (i < this._middleware.length && shouldContinue()) {
      if (this._middleware[i][method]) {
        args[mutableArgIdx] = this._middleware[i][method](...args);
      }
      i += 1;
    }

    return args[mutableArgIdx];
  }

  _callOnStarts(request) {
    return this._callMiddlewareMethod('onStart', 0, true, request);
  }

  _callOnSuccesses(request, response) {
    return this._callMiddlewareMethod('onSuccess', 1, false, request, response);
  }

  _callOnFails(request, response) {
    return this._callMiddlewareMethod('onFail', 1, false, request, response);
  }

  _callOnErrors(request, response) {
    return this._callMiddlewareMethod('onError', 1, false, request, response);
  }
  _addHelpers(helpers) {
    if (helpers) {
      Object.keys(helpers).forEach((key) => {
        this[key] = helpers[key];
      });
    }
  }

  fetch(path, options) {
    let fullPath = path;
    if (this.defaults && this.defaults.url) {
      fullPath = `${this.defaults.url}${this.defaults.sep}${path}`;
    }

    let request = new Request(fullPath, options);
    this.eventEmitter.emit(events.REQUEST_START, request);

    let onStartError;
    try {
      request = this._callOnStarts(request);
    } catch (err) {
      onStartError = err;
    }

    let fetchPromise;
    if (request && !onStartError) {
      fetchPromise = fetch(request)
        .then(response => {
          let mutatedResponse;
          if (response.status >= 400) {
            mutatedResponse = this._callOnFails(request, response);
            this.eventEmitter.emit(events.REQUEST_FAIL, request, mutatedResponse);
          } else {
            mutatedResponse = this._callOnSuccesses(request, response);
            this.eventEmitter.emit(events.REQUEST_SUCCESS, request, mutatedResponse);
          }

          return mutatedResponse;
        })
        .catch(err => {
          const mutatedError = this._callOnErrors(request, err);
          this.eventEmitter.emit(events.REQUEST_ERROR, request, mutatedError);
          throw mutatedError;
        });
    } else {
      const err = onStartError || new MiddlewareError();
      fetchPromise = Promise.reject(err);
    }

    return fetchPromise;
  }

  addMiddleware(middleware) {
    middleware.client = this;
    this._middleware.push(middleware);
    this._addHelpers(middleware.helpers);
  }

  removeMiddleware(name) {
    let i = 0;
    for (i; i < this._middleware.length; i++) {
      if (this._middleware[i].name === name) {
        this._middleware.splice(i, 1);
        i -= 1;
      }
    }
  }

  on(event, cb) {
    this.eventEmitter.on(event, cb);
  }

  /* ---- HELPERS ---- */

  _formAppendArrayOrObject(formObject, data, key) {
    if (Array.isArray(data)) {
      data.forEach((val) => {
        if (typeof(val) === 'object') {
          this._formAppendArrayOrObject(formObject, val, `${key}[]`);
        } else {
          formObject.append(`${key}[]`, val);
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

  _encodeForm(body, formObject) {
    Object.keys(body).forEach((val) => {
      if (typeof(body[val]) === 'object') {
        this._formAppendArrayOrObject(formObject, body[val], `${val}`);
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
        _contentType = undefined;
        break;
      case 'x-www-form-urlencoded':
        formObject = new URLSearchParams();
        _body = this._encodeForm(_body, formObject);
        _contentType = undefined;
        break;
      default:
    }

    return { body: _body, contentType: _contentType };
  }

  _buildOptionsWithBody(method, body, options) {
    let _options = { ...this.defaults[method] };
    _options = merge.recursive(true, _options, options);

    const { body: encodedBody, contentType } = this._encode(body, _options.headers['Content-Type']);
    if (contentType === false) {
      delete _options.headers['Content-Type'];
    } else {
      _options.headers['Content-Type'] = contentType;
    }

    _options.body = encodedBody;
    return _options;
  }

  get(path, options) {
    const _options = options || {};
    _options.method = 'get';
    return this.fetch(path, _options);
  }

  post(path, body, options) {
    const _options = this._buildOptionsWithBody('post', body, options);
    _options.method = 'post';
    return this.fetch(path, _options);
  }

  put(path, body, options) {
    const _options = this._buildOptionsWithBody('put', body, options);
    _options.method = 'put';
    return this.fetch(path, _options);
  }

  patch(path, body, options) {
    const _options = this._buildOptionsWithBody('patch', body, options);
    _options.method = 'patch';
    return this.fetch(path, _options);
  }

  delete(path, options) {
    const _options = options || {};
    _options.method = 'delete';
    return this.fetch(path, _options);
  }
}
