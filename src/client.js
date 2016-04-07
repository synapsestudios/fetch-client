var fetch = require('whatwg-fetch').fetch;
var Request = require('whatwg-fetch').Request;
var EventEmitter2 = require('eventemitter2');

module.exports = function Client(defaults) {
  const eventEmitter = new EventEmitter2();
  return {
    fetch: (path, options) => {
      const request = new Request(path, options);
      eventEmitter.emit('request_start', request);

      return fetch(request)
        .then(response => {
          eventEmitter.emit('request_success', request, response);
          return response;
        })
        .catch(err => {
          eventEmitter.emit('request_fail', request, err);
          throw err;
        });
    },

    // expose the event emitter for more advanced eventing
    eventEmitter,

    // event shortcuts
    on: (event, cb) => eventEmitter.on(event, cb),
  };
};
