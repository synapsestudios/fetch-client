/* eslint no-unused-vars:0, no-unused-expressions:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Uploader from '../src/resumable-uploader';
import EventEmitter2 from 'eventemitter2';
import * as events from '../src/events';
import { Request, fetch } from 'whatwg-fetch';
GLOBAL.Request = Request;
GLOBAL.File = require('file-api').File;

describe('uploader', () => {
  let uploader;
  let mockResumableEventEmitter;
  let uploadedFile;
  describe('events', () => {
    beforeEach(() => {
      mockResumableEventEmitter = new EventEmitter2();
      const MockResumable = function mockRes() {
        this.support = true;
        this.addFile = () => {};
        this.on = mockResumableEventEmitter.on.bind(mockResumableEventEmitter);
        this.emit = mockResumableEventEmitter.emit.bind(mockResumableEventEmitter);
      };
      uploadedFile = new GLOBAL.File('./uploader-test.js');
      Uploader.__Rewire__('Resumable', MockResumable);
      uploader = new Uploader('/api-path', uploadedFile);
    });

    afterEach(() => {
      Uploader.__ResetDependency__('Resumable');
    });

    it('should emit starting event', () => {
      const cb = sinon.spy();
      uploader.on(events.REQUEST_START, cb);

      uploader.upload().then(() => {
        expect(cb).to.have.been.calledOnce;
      });
    });

    it('should emit success event on fileSuccess event', () => {
      const cb = sinon.spy();

      uploader.on(events.REQUEST_SUCCESS, cb);

      const promise = uploader.upload();
      mockResumableEventEmitter.emit('fileSuccess', 'file', '"message"');

      return expect(promise).to.be.fulfilled.then(() => {
        expect(cb).to.have.been.calledOnce;
      });
    });

    it('should emit failure event', () => {
      const cb = sinon.spy();

      uploader.on(events.REQUEST_FAILURE, cb);

      const promise = uploader.upload();
      mockResumableEventEmitter.emit('fileError', 'file', '"message"');

      return expect(promise).to.be.rejected.then(() => {
        expect(cb).to.have.been.calledOnce;
      });
    });

    it('should emit upload progress events', () => {
      const cb = sinon.spy();

      uploader.on(events.UPLOAD_PROGRESS, cb);

      const promise = uploader.upload();
      uploadedFile.progress = () => 0.50;
      mockResumableEventEmitter.emit('fileProgress', uploadedFile);

      expect(cb).to.have.been.calledOnce;
      expect(cb).to.have.been.calledWith(50);
    });
  });
});
