import EventEmitter2 from 'eventemitter2';
export default class Client {
  constructor(defaults) {
    this.defaults = defaults;
    this.eventEmitter = new EventEmitter2();
  }

  fetch(path, options) {
    const request = new Request(path, options);
    this.eventEmitter.emit('request_start', request);

    return fetch(request)
      .then(response => {
        this.eventEmitter.emit('request_success', request, response);
        return response;
      })
      .catch(err => {
        this.eventEmitter.emit('request_fail', request, err);
        throw err;
      });
  }

  on(event, cb) {
    this.eventEmitter.on(event, cb)
  }
}
