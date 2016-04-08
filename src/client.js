import EventEmitter2 from 'eventemitter2';
import * as events from './events';

export default class Client {
  constructor(defaults) {
    this.defaults = defaults;
    this.eventEmitter = new EventEmitter2();
  }

  fetch(path, options) {
    const request = new Request(path, options);
    this.eventEmitter.emit(events.REQUEST_START, request);

    return fetch(request)
      .then(response => {
        this.eventEmitter.emit(events.REQUEST_SUCCESS, request, response);
        return response;
      })
      .catch(err => {
        this.eventEmitter.emit(events.REQUEST_FAIL, request, err);
        throw err;
      });
  }

  on(event, cb) {
    this.eventEmitter.on(event, cb);
  }
}
