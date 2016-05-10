import Resumable from 'resumablejs';
import * as events from '../events';

export default {
  onAddPlugin() {
    this.defaults.post = {
      method: 'post',
      headers: {},
    };
  },

  helpers: {
    upload(path, fileToUpload, _options = {}) {
      // Set defaults
      const options = Object.assign(
        {},
        {
          headers: this.defaults.post.headers,
          target: `${this.defaults.url}${path}`,
          method: 'multipart',
          query: {},
          testChunks: false,
          chunkSize: 1000,
          maxChunkRetries: 3,
          simultaneousUploads: 1,
        },
        _options
      );

      // Add any headers set by plugins
      let request = this._getRequest(path, { headers: options.headers });
      request = this._callOnStarts(request);
      for (const pair of request.headers.entries()) {
        options.headers[pair[0]] = pair[1];
      }

      const resumable = new Resumable(options);

      if (! resumable.support) {
        throw new Error('resumable.js not supported', resumable);
      }

      this.eventEmitter.emit(events.REQUEST_START);

      resumable.addFile(fileToUpload);

      resumable.on('fileAdded', file => {
        resumable.upload();
      });

      return new Promise((resolve, reject) => {
        resumable.on('fileSuccess', (file, message) => {
          this.eventEmitter.emit(
            events.REQUEST_SUCCESS,
            JSON.parse(message)
          );
          resolve(JSON.parse(message));
        });

        resumable.on('fileError', (file, message) => {
          this.eventEmitter.emit(
            events.REQUEST_FAILURE,
            JSON.parse(message)
          );
          reject(JSON.parse(message));
        });

        resumable.on('fileProgress', file => {
          this.eventEmitter.emit(
            events.UPLOAD_PROGRESS,
            parseInt(file.progress() * 100, 10)
          );
        });
      });
    },
  },
};
