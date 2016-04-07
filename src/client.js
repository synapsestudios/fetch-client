export default class Client {
  constructor(defaults) {
    this.defaults = defaults;
  }

  fetch(path, options) {
    return fetch(path, options);
  }
}
