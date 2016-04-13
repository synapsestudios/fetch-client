/* eslint no-unused-vars:0, no-unused-expressions:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Uploader from '../src/resumable-uploader';
import EventEmitter2 from 'eventemitter2';
import * as events from '../lib/events';
import { Request, fetch } from 'whatwg-fetch';
GLOBAL.Request = Request;
GLOBAL.File = require('file-api').File;

describe('uploader', () => {
  const mockResumable = function MockResumable() {
    this.support = true;
    this.addFile = () => {};
    this.on = () => {};
  };
  Uploader.__Rewire__('Resumable', mockResumable);

  let uploader;
  describe('events', () => {
    beforeEach(() => {
      uploader = new Uploader('/api-path', new GLOBAL.File('./uploader-test.js'));
    });

    it('should emit starting event', () => {
      const cb = sinon.spy();
      uploader.on(events.REQUEST_START, cb);

      uploader.upload().then(() => {
        expect(cb).to.have.been.calledOnce;
      });
    });
  });
});
