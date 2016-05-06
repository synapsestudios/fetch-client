/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../lib/client';
import PluginError from '../lib/plugin-error';

import EventEmitter2 from 'eventemitter2';
import * as events from '../lib/events';

// polyfills
import { Request, Response } from 'whatwg-fetch';
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

      return myClient.fetch('http://google.com/', { method: 'get' }).then(() => {
        expect(cb).to.have.been.calledOnce;
        expect(cb.args[0][0]).to.be.instanceof(Request);
        expect(cb.args[0][0]).to.have.property('url', 'http://google.com/');
        expect(cb.args[0][0]).to.have.property('method', 'GET');
      });
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
      const response = new Response(null, { status: 400, statusText: 'whatever 400' });
      GLOBAL.fetch = sinon.spy(() => Promise.resolve(response));

      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on(events.REQUEST_FAIL, cb);

      const promise = myClient.fetch('http://google.com/', { method: 'get' });

      return expect(promise).to.be.fulfilled.then(x => {
        expect(cb).to.have.been.calledOnce;
        expect(cb.args[0][0]).to.be.instanceof(Request);
        expect(cb.args[0][0]).to.have.property('url', 'http://google.com/');
        expect(cb.args[0][0]).to.have.property('method', 'GET');
        expect(cb.args[0][1]).to.equal(response);
      });
    });

    it('should emit error event', () => {
      GLOBAL.fetch = sinon.spy(() => Promise.reject('test'));

      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on(events.REQUEST_ERROR, cb);

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

  describe('plugin', () => {
    describe('basic plugin functionality', () => {
      it('can be added', () => {
        const myClient = new Client();
        const myPlugin = { foo: 'foo' };

        myClient.addPlugin(myPlugin);
        expect(myClient._plugins).to.deep.equal([myPlugin]);

        const mySecondPlugin = { bar: 'bar' };
        myClient.addPlugin(mySecondPlugin);
        expect(myClient._plugins).to.deep.equal([myPlugin, mySecondPlugin]);
      });

      it('can be removed', () => {
        const myClient = new Client();
        const myPlugin = { foo: 'foo', name: 'myPlugin' };
        const mySecondPlugin = { bar: 'bar', name: 'mySecondPlugin' };
        const myThirdPlugin = { baz: 'baz', name: 'myThirdPlugin' };

        myClient.addPlugin(myPlugin);
        myClient.addPlugin(mySecondPlugin);

        // add a clone of the second one and make sure it's removed
        myClient.addPlugin({ ...mySecondPlugin });
        myClient.addPlugin(myThirdPlugin);

        myClient.removePlugin('mySecondPlugin');

        expect(myClient._plugins).to.deep.equal([myPlugin, myThirdPlugin]);
      });

      it('can emit custom events', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const cb = sinon.spy();
        myClient.on('custom_event', cb);

        class MyPlugin {
          onStart(request) {
            this.client.eventEmitter.emit('custom_event');
            return request;
          }
        }

        const myPlugin = new MyPlugin();
        myClient.addPlugin(myPlugin);

        myClient.fetch('http://whatever.com');
        expect(cb).to.have.been.calledOnce;
      });

      it('can register helper methods on the client object', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const newMethod = sinon.spy();

        myClient.addPlugin({
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
        const myPlugin = { onStart };

        myClient.addPlugin(myPlugin);

        return myClient.fetch().then(() => {
          expect(onStart).to.have.been.calledOnce;
        });
      });

      it('doesn\'t break when onStart is left out', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const myPlugin = { arbitrary: 'object' };
        myClient.addPlugin(myPlugin);

        const promise = myClient.fetch();
        return expect(promise).to.be.fulfilled;
      });

      it('calls onStart with the previous onStart return value', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const onStart1 = sinon.spy((request) => 'test');
        const onStart2 = sinon.spy((request) => request);

        const myClient = new Client();
        myClient.addPlugin({ onStart: onStart1 });
        myClient.addPlugin({ onStart: onStart2 });

        myClient.fetch();
        expect(onStart2).to.have.been.calledWith('test');
      });

      it('stops calling onStarts when false returned', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();

        const onStart1 = sinon.spy(false);
        const onStart2 = sinon.spy();
        myClient.addPlugin({ onStart: onStart1 });
        myClient.addPlugin({ onStart: onStart2 });

        return myClient.fetch().catch(err => {
          expect(onStart1).to.have.been.calledOnce;
          expect(onStart2).to.have.callCount(0);
        });
      });

      it('cancels the request when onStart returns false', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addPlugin({ onStart: () => false });

        const promise = myClient.fetch();
        expect(GLOBAL.fetch).to.not.be.called;
        return expect(promise).to.be.rejected;
      });

      it('cancels the request when onStart throws an error', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addPlugin({
          onStart: () => {
            throw new PluginError();
          },
        });

        const promise = myClient.fetch();
        expect(GLOBAL.fetch).to.not.be.called;
        return expect(promise).to.be.rejected;
      });

      it('rejects with a custom error object', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addPlugin({ onStart: () => false });

        const promise = myClient.fetch();
        expect(GLOBAL.fetch).to.not.be.called;
        return expect(promise).to.be.rejected
          .then(err => {
            expect(err.name).to.equal('PluginError');
          });
      });

      it('calls multiple plugin in the order they were added', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const onStart1 = sinon.spy((request) => request);
        const onStart2 = sinon.spy((request) => request);
        const onStart3 = sinon.spy((request) => request);

        const myClient = new Client();
        myClient.addPlugin({ onStart: onStart1 });
        myClient.addPlugin({ onStart: onStart2 });
        myClient.addPlugin({ onStart: onStart3 });

        myClient.fetch();
        expect(onStart1).to.be.calledBefore(onStart2);
        expect(onStart2).to.be.calledBefore(onStart3);
      });
    });

    describe('onSuccess functionality', () => {
      it('calls onSuccess when a request succeeds', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const myPlugin = { onSuccess: sinon.spy() };
        myClient.addPlugin(myPlugin);

        return myClient.fetch().then(() => {
          expect(myPlugin.onSuccess).to.have.been.calledOnce;
        });
      });

      it('passes request and response to onSuccess', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const myPlugin = { onSuccess: sinon.spy() };
        myClient.addPlugin(myPlugin);

        return myClient.fetch().then(() => {
          expect(myPlugin.onSuccess.args[0][0]).to.be.instanceof(Request);
          expect(myPlugin.onSuccess.args[0][1]).to.equal('test');
        });
      });

      it('does not call onSuccess when a request fails', () => {
        GLOBAL.fetch = sinon.spy(() => Promise.reject('test'));
        const myClient = new Client();
        const myPlugin = { onSuccess: sinon.spy(), onFail: sinon.spy() };
        myClient.addPlugin(myPlugin);

        return myClient.fetch().catch((err) => {
          expect(myPlugin.onSuccess).to.have.callCount(0);
        });
      });
    });

    const plugins = ['onError', 'onFail'];

    const responses = [
      Promise.resolve('test'),
      Promise.resolve(new Response(null, { status: 400 })),
    ];

    let i;
    for (i = 0; i < plugins.length; i += 1) {
      const method = plugins[i];
      const response = responses[i];
      describe(`${method} functionality`, () => {
        it(`calls ${method} when a request fails`, () => {
          GLOBAL.fetch = sinon.spy(() => response);
          const myClient = new Client();
          const myPlugin = {};
          myPlugin[method] = sinon.spy();
          myClient.addPlugin(myPlugin);

          return myClient.fetch().catch(() => {
            expect(myPlugin[method]).to.have.been.calledOnce;
          });
        });

        it(`passes request and error to ${plugins[i]}`, () => {
          GLOBAL.fetch = sinon.spy(() => response);
          const myClient = new Client();
          const myPlugin = {};
          myPlugin[method] = sinon.spy();
          myClient.addPlugin(myPlugin);

          return myClient.fetch().catch(() => {
            expect(myPlugin[method].args[0][0]).to.be.instanceof(Request);
            expect(myPlugin[method].args[0][1]).to.equal('test');
          });
        });

        it(`does not call ${plugins[i]} when a request succeeds`, () => {
          GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
          const myClient = new Client();
          const myPlugin = { onSuccess: sinon.spy() };
          myPlugin[method] = sinon.spy();
          myClient.addPlugin(myPlugin);

          return myClient.fetch().then(() => {
            expect(myPlugin[method]).to.have.callCount(0);
          });
        });
      });
    }
  });
});
