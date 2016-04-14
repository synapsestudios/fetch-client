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
  let mockResumableEventEmitter;
  let fileToUpload;

  describe('upload', () => {
    const getUploader = (resumablePrototypeAttribs) => {
      mockResumableEventEmitter = new EventEmitter2();
      const resumablePrototype = Object.assign(
        {},
        {
          support: true,
          addFile: () => {},
          upload: () => {},
          on: mockResumableEventEmitter.on.bind(mockResumableEventEmitter),
          emit: mockResumableEventEmitter.emit.bind(mockResumableEventEmitter),
        },
        resumablePrototypeAttribs
      );
      const MockResumable = function MockResConstructor() {};
      MockResumable.prototype = resumablePrototype;
      Uploader.__Rewire__('Resumable', MockResumable);
      fileToUpload = new GLOBAL.File('./uploader-test.js');
      return new Uploader();
    };

    afterEach(() => {
      Uploader.__ResetDependency__('Resumable');
    });

    it('should emit starting event', () => {
      const spy = sinon.spy();
      const uploader = getUploader();

      uploader.on(events.REQUEST_START, spy);

      uploader.upload('/api-path', fileToUpload);
    });

    it('should emit success event on fileSuccess event', () => {
      const spy = sinon.spy();
      const uploader = getUploader();

      uploader.on(events.REQUEST_SUCCESS, spy);

      const promise = uploader.upload('/api-path', fileToUpload);
      mockResumableEventEmitter.emit('fileSuccess', 'file', '"message"');

      return expect(promise).to.be.fulfilled.then(() => {
        expect(spy).to.have.been.calledOnce;
      });
    });

    it('should emit failure event', () => {
      const spy = sinon.spy();
      const uploader = getUploader();

      uploader.on(events.REQUEST_FAILURE, spy);

      const promise = uploader.upload('/api-path', fileToUpload);
      mockResumableEventEmitter.emit('fileError', 'file', '"message"');

      return expect(promise).to.be.rejected.then(() => {
        expect(spy).to.have.been.calledOnce;
      });
    });

    it('should emit upload progress events', () => {
      const spy = sinon.spy();
      const uploader = getUploader();

      uploader.on(events.UPLOAD_PROGRESS, spy);

      uploader.upload('/api-path', fileToUpload);
      fileToUpload.progress = () => 0.50;
      mockResumableEventEmitter.emit('fileProgress', fileToUpload);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(50);
    });

    it('throws Error if resumable not supported', () => {
      const uploader = getUploader({ support: false });

      expect(uploader.upload).to.throw(Error, 'not supported');
    });

    it('adds file to resumable', () => {
      const spy = sinon.spy();
      const uploader = getUploader({ addFile: spy });

      uploader.upload('/api-path', fileToUpload);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(fileToUpload);
    });

    it('starts upload when file added', () => {
      const spy = sinon.spy();
      const uploader = getUploader({ upload: spy });

      uploader.upload('/api-path', fileToUpload);
      mockResumableEventEmitter.emit('fileAdded', fileToUpload);

      expect(spy).to.have.been.calledOnce;
    });
  });
});
