export default class MiddlewareError extends Error {
  constructor(message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.name = 'MiddlewareError';
  }
}
