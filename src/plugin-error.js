export default class PluginError extends Error {
  constructor(message, fileName, lineNumber) {
    super(message, fileName, lineNumber);
    this.name = 'PluginError';
  }
}
