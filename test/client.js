/* eslint no-unused-vars:0, no-unused-expressions:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../lib/client';

import EventEmitter2 from 'eventemitter2';
import * as events from '../lib/events';
import { Request, fetch } from 'whatwg-fetch';
GLOBAL.Request = Request;

describe('client', () => {
  it('should not fail to instantiate', () => {
    const myClient = new Client({ arbitrary: 'object' });
  });

  describe('events', () => {
    it('should emit starting event', () => {
      GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));

      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on(events.REQUEST_START, cb);

      myClient.fetch('http://google.com/', { method: 'get' });
      expect(cb).to.have.been.calledOnce;
      expect(cb.args[0][0]).to.be.instanceof(Request);
      expect(cb.args[0][0]).to.have.property('url', 'http://google.com/');
      expect(cb.args[0][0]).to.have.property('method', 'GET');
    });

    it('should emit success event', () => {
      GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));

      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on(events.REQUEST_SUCCESS, cb);

      const promise = myClient.fetch('http://google.com/', { method: 'get' });

      return expect(promise).to.be.fulfilled.then(x => {
        expect(cb).to.have.been.calledOnce;
        expect(cb.args[0][0]).to.be.instanceof(Request);
        expect(cb.args[0][0]).to.have.property('url', 'http://google.com/');
        expect(cb.args[0][0]).to.have.property('method', 'GET');
        expect(cb.args[0][1]).to.equal('test');
      });
    });

    it('should emit fail event', () => {
      GLOBAL.fetch = sinon.spy(() => Promise.reject('test'));

      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on(events.REQUEST_FAIL, cb);

      const promise = myClient.fetch('http://google.com/', { method: 'get' });

      return expect(promise).to.be.rejected.then(x => {
        expect(cb).to.have.been.calledOnce;
        expect(cb.args[0][0]).to.be.instanceof(Request);
        expect(cb.args[0][0]).to.have.property('url', 'http://google.com/');
        expect(cb.args[0][0]).to.have.property('method', 'GET');
        expect(cb.args[0][1]).to.equal('test');
      });
    });

    it('should return an event emitter object', () => {
      const myClient = new Client();
      expect(myClient.eventEmitter).to.be.instanceof(EventEmitter2);
    });
  });
});
