import EventEmitter2 from 'eventemitter2';
import * as events from './events';
import MiddlewareError from './middleware-error';
import merge from 'merge';

const _defaults = {
  post: {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  put: {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
  patch: {
    method: 'post',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  },
};

export default class Client {
  constructor(defaults) {
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
          const mutatedResponse = this._callOnSuccesses(request, response);
          this.eventEmitter.emit(events.REQUEST_SUCCESS, request, mutatedResponse);
          return mutatedResponse;
        })
        .catch(err => {
          const mutatedError = this._callOnFails(request, err);
          this.eventEmitter.emit(events.REQUEST_FAIL, request, mutatedError);
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
  get(path, options) {
    const _options = options || {};
    _options.method = 'get';
    return this.fetch(path, _options);
  }

  post(path, body, options) {
    let _options = { ...this.defaults.post };
    _options.body = JSON.stringify(body);
    _options = merge.recursive(true, _options, options);
    _options.method = 'post';
    return this.fetch(path, _options);
  }

  put(path, body, options) {
    let _options = { ...this.defaults.put };
    _options.body = JSON.stringify(body);
    _options = merge.recursive(true, _options, options);
    _options.method = 'put';
    return this.fetch(path, _options);
  }

  patch(path, body, options) {
    let _options = { ...this.defaults.patch };
    _options.body = JSON.stringify(body);
    _options = merge.recursive(true, _options, options);
    _options.method = 'patch';
    return this.fetch(path, _options);
  }

  delete(path, options) {
    const _options = options || {};
    _options.method = 'delete';
    return this.fetch(path, _options);
  }

  upload(path, input, options) {
    const _options = options || {};
    _options.method = 'post';

    const data = new FormData();
    let i;
    for (i = 0; i < input.files.length; i++) {
      data.append('files[]', input.files[i]);
    }

    _options.body = data;
    return this.fetch(path, _options);
  }
}
