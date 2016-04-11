import EventEmitter2 from 'eventemitter2';
import * as events from './events';
import MiddlewareError from './middleware-error';

export default class Client {
  constructor(defaults) {
    this.defaults = defaults;
    this.eventEmitter = new EventEmitter2();
    this._middleware = [];
  }

  /**
   * Loops through middleware calling onStart on all
   * middlewhere where onStart is defined. When a middleware's
   * onStart returns false then we stop execution and return false.
   */
  _callOnStarts(request) {
    let i = 0;
    let mutatedRequest = request;

    while (i < this._middleware.length && mutatedRequest) {
      if (this._middleware[i].onStart) {
        mutatedRequest = this._middleware[i].onStart(mutatedRequest);
      }
      i += 1;
    }

    return mutatedRequest;
  }

  _callOnSuccesses(request, response) {
    let i = 0;
    let mutatedResponse = response;

    while (i < this._middleware.length) {
      if (this._middleware[i].onSuccess) {
        mutatedResponse = this._middleware[i].onSuccess(request, mutatedResponse);
      }
      i += 1;
    }

    return mutatedResponse;
  }

  _addHelpers(helpers) {
    if (helpers) {
      Object.keys(helpers).forEach((key) => {
        this[key] = helpers[key];
      });
    }
  }

  fetch(path, options) {
    let request = new Request(path, options);
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
          this.eventEmitter.emit(events.REQUEST_SUCCESS, request, response);
          const mutatedResponse = this._callOnSuccesses(request, response);
          return mutatedResponse;
        })
        .catch(err => {
          this.eventEmitter.emit(events.REQUEST_FAIL, request, err);
          throw err;
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
}
