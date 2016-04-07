const fetch = require('whatwg-fetch').fetch;

module.exports = function Client(defaults) {
  return {
    fetch: (path, options) => fetch(path, options),
  };
};
