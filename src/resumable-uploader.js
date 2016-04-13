import Resumable from 'resumablejs';
import * as events from './events';
import Client from './client';

export default class ResumableUploader extends Client {
  upload(path, fileToUpload, options = {}) {
    const resumable = new Resumable({
      headers: options.headers,
      target: path,
      method: 'octet',
      query: options.query || {},
    });

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
  }
}
