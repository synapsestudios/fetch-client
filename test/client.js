/* eslint no-unused-vars:0, no-unused-expressions:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../lib/client';
import MiddlewareError from '../lib/middleware-error';

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

  describe('middleware', () => {
    describe('basic middleware functionality', () => {
      it('can be added', () => {
        const myClient = new Client();
        const myMiddleware = { foo: 'foo' };

        myClient.addMiddleware(myMiddleware);
        expect(myClient._middleware).to.deep.equal([myMiddleware]);

        const mySecondMiddleware = { bar: 'bar' };
        myClient.addMiddleware(mySecondMiddleware);
        expect(myClient._middleware).to.deep.equal([myMiddleware, mySecondMiddleware]);
      });

      it('can be removed', () => {
        const myClient = new Client();
        const myMiddleware = { foo: 'foo', name: 'myMiddleware' };
        const mySecondMiddleware = { bar: 'bar', name: 'mySecondMiddleware' };
        const myThirdMiddleware = { baz: 'baz', name: 'myThirdMiddleware' };

        myClient.addMiddleware(myMiddleware);
        myClient.addMiddleware(mySecondMiddleware);

        // add a clone of the second one and make sure it's removed
        myClient.addMiddleware({ ...mySecondMiddleware });
        myClient.addMiddleware(myThirdMiddleware);

        myClient.removeMiddleware('mySecondMiddleware');

        expect(myClient._middleware).to.deep.equal([myMiddleware, myThirdMiddleware]);
      });

      it('can emit custom events', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const cb = sinon.spy();
        myClient.on('custom_event', cb);

        class MyMiddleware {
          onStart(request) {
            this.client.eventEmitter.emit('custom_event');
            return request;
          }
        }

        const myMiddleware = new MyMiddleware();
        myClient.addMiddleware(myMiddleware);

        myClient.fetch('http://whatever.com');
        expect(cb).to.have.been.calledOnce;
      });

      it('can register helper methods on the client object', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const newMethod = sinon.spy();

        myClient.addMiddleware({
          helpers: {
            newMethod,
          },
        });

        expect(myClient.newMethod).to.equal(newMethod);
      });
    });

    describe('onStart functionality', () => {
      it('calls onStart', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const onStart = sinon.spy((request) => request);
        const myMiddleware = { onStart };

        myClient.addMiddleware(myMiddleware);

        return myClient.fetch().then(() => {
          expect(onStart).to.have.been.calledOnce;
        });
      });

      it('doesn\'t break when onStart is left out', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const myMiddleware = { arbitrary: 'object' };
        myClient.addMiddleware(myMiddleware);

        const promise = myClient.fetch();
        return expect(promise).to.be.fulfilled;
      });

      it('calls onStart with the previous onStart return value', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const onStart1 = sinon.spy((request) => 'test');
        const onStart2 = sinon.spy((request) => request);

        const myClient = new Client();
        myClient.addMiddleware({ onStart: onStart1 });
        myClient.addMiddleware({ onStart: onStart2 });

        myClient.fetch();
        expect(onStart2).to.have.been.calledWith('test');
      });

      it('cancels the request when onStart returns false', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addMiddleware({ onStart: () => false });

        const promise = myClient.fetch();
        expect(GLOBAL.fetch).to.not.be.called;
        return expect(promise).to.be.rejected;
      });

      it('cancels the request when onStart throws an error', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addMiddleware({
          onStart: () => {
            throw new MiddlewareError();
          },
        });

        const promise = myClient.fetch();
        expect(GLOBAL.fetch).to.not.be.called;
        return expect(promise).to.be.rejected;
      });

      it('rejects with a custom error object', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addMiddleware({ onStart: () => false });

        const promise = myClient.fetch();
        expect(GLOBAL.fetch).to.not.be.called;
        return expect(promise).to.be.rejected
          .then(err => {
            expect(err.name).to.equal('MiddlewareError');
          });
      });

      it('calls multiple middleware in the order they were added', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const onStart1 = sinon.spy((request) => request);
        const onStart2 = sinon.spy((request) => request);
        const onStart3 = sinon.spy((request) => request);

        const myClient = new Client();
        myClient.addMiddleware({ onStart: onStart1 });
        myClient.addMiddleware({ onStart: onStart2 });
        myClient.addMiddleware({ onStart: onStart3 });

        myClient.fetch();
        expect(onStart1).to.be.calledBefore(onStart2);
        expect(onStart2).to.be.calledBefore(onStart3);
      });
    });

    describe('onSuccess functionality', () => {
      it('calls onSuccess when a request succeeds');
      it('passes request and response to onSuccess');
      it('does not call onSuccess when a request fails');
    });

    describe('onFail functionality', () => {
      it('calls onFail when a request fails');
      it('passes request and error to onFail');
      it('does not call onFail when a request succeeds');
    });
  });
});
