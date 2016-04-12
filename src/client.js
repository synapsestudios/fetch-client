import EventEmitter2 from 'eventemitter2';
import * as events from './events';
import MiddlewareError from './middleware-error';

export default class Client {
  constructor(defaults) {
    this.defaults = defaults || {};
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
    return this.fetch(path, options);
  }

  post(path, body, options) {
    return this.fetch(path, options);
  }

  put(path, body, options) {
    return this.fetch(path, options);
  }

  path(path, body, options) {
    return this.fetch(path, options);
  }

  delete(path, options) {
    return this.fetch(path, options);
  }

  upload(path, file, options) {
    return this.fetch(path, options);
  }
}
