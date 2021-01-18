/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../src/client';
import PluginError from '../src/plugin-error';

// polyfills
import { Request, Response } from 'whatwg-fetch';
global.Request = Request;

describe('client', () => {
  it('should not fail to instantiate', () => {
    const myClient = new Client({ arbitrary: 'object' });
  });

  it('handles Request object in fetch call', () => {
    const myClient = new Client({});
    global.fetch = sinon.spy(() => Promise.resolve('test'));

    const request = new Request();
    return myClient
      .fetch(request)
      .then(() => expect(global.fetch).to.be.calledWith(request));
  });

  it('should convert falsy values to empty string when calling _getFullPath() without a path', () => {
    const myClientWithUrl = new Client({ url: 'http://something.com' });
    const fullPathWithUrl = myClientWithUrl._getFullPath();

    const myClientWithoutUrl = new Client();
    const fullPathWithoutUrl = myClientWithoutUrl._getFullPath();

    expect(fullPathWithUrl).to.equal('http://something.com/');
    expect(fullPathWithoutUrl).to.equal('');
  });

  describe('timeout', function () {
    this.timeout(11000);

    it('has a default timeout', () => {
      global.fetch = sinon.spy(
        () => new Promise((resolve, reject) => setTimeout(reject, 15000))
      );
      const myClient = new Client();
      const promise = myClient.fetch('http://google.com/', { method: 'get' });
      return expect(promise).to.be.rejected.then((error) => {
        expect(error.name).to.equal('TimeoutError');
        expect(error.timeout).to.equal(10000);
      });
    });

    it('should honor global timeout', () => {
      global.fetch = sinon.spy(
        () => new Promise((resolve, reject) => setTimeout(reject, 15000))
      );
      const myClient = new Client({ timeout: 1000 });
      const promise = myClient.fetch('http://google.com/', { method: 'get' });
      return expect(promise).to.be.rejected.then((error) => {
        expect(error.name).to.equal('TimeoutError');
        expect(error.timeout).to.equal(1000);
      });
    });

    it('should honor timeout override', () => {
      global.fetch = sinon.spy(
        () => new Promise((resolve, reject) => setTimeout(reject, 15000))
      );
      const myClient = new Client();
      const promise = myClient.fetch('http://google.com/', {
        method: 'get',
        timeout: 1000,
      });
      return expect(promise).to.be.rejected.then((error) => {
        expect(error.name).to.equal('TimeoutError');
        expect(error.timeout).to.equal(1000);
      });
    });
  });

  describe('get', () => {
    it('sets headers from defaults', () => {
      const myClient = new Client({
        get: { headers: { 'X-TEST': 'FOO' } },
      });
      global.fetch = sinon.spy(() => Promise.resolve('test'));
      myClient.get('path').then(() => {
        expect(global.fetch).to.have.been.called;
        expect(global.fetch.args[0][0].headers.get('X-TEST')).to.equal('FOO');
      });
    });

    it('merges passed in headers with defaults', () => {
      const myClient = new Client({
        get: { headers: { 'X-TEST': 'FOO' } },
      });
      global.fetch = sinon.spy(() => Promise.resolve('test'));
      myClient
        .get('path', {}, { headers: { 'X-PASSED-IN': 'VALUE' } })
        .then(() => {
          expect(global.fetch).to.have.been.called;
          expect(global.fetch.args[0][0].headers.get('X-TEST')).to.equal('FOO');
          expect(global.fetch.args[0][0].headers.get('X-PASSED-IN')).to.equal(
            'VALUE'
          );
        });
    });

    it('uses passed in headers if there are no defaults', () => {
      const myClient = new Client();
      global.fetch = sinon.spy(() => Promise.resolve('test'));
      myClient
        .get('path', {}, { headers: { 'X-PASSED-IN': 'VALUE' } })
        .then(() => {
          expect(global.fetch).to.have.been.called;
          expect(global.fetch.args[0][0].headers.get('X-PASSED-IN')).to.equal(
            'VALUE'
          );
        });
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

      it('can register helper methods on the client object', () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
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
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const onStart = sinon.spy((request) => request);
        const myPlugin = { onStart };

        myClient.addPlugin(myPlugin);

        return myClient.fetch().then(() => {
          expect(onStart).to.have.been.calledOnce;
        });
      });

      it("doesn't break when onStart is left out", () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const myPlugin = { arbitrary: 'object' };
        myClient.addPlugin(myPlugin);

        const promise = myClient.fetch();
        return expect(promise).to.be.fulfilled;
      });

      it('calls onStart with the previous onStart return value', () => {
        const onStart1ReturnValue = { test: 'test' };
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const onStart1 = sinon.spy((request) => onStart1ReturnValue);
        const onStart2 = sinon.spy((request) => request);

        const myClient = new Client();
        myClient.addPlugin({ onStart: onStart1 });
        myClient.addPlugin({ onStart: onStart2 });

        return myClient.fetch().then(() => {
          expect(onStart2).to.have.been.calledWith(onStart1ReturnValue);
        });
      });

      it('stops calling onStarts when false returned', () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();

        const onStart1 = sinon.spy(false);
        const onStart2 = sinon.spy();
        myClient.addPlugin({ onStart: onStart1 });
        myClient.addPlugin({ onStart: onStart2 });

        return myClient.fetch().catch((err) => {
          expect(onStart1).to.have.been.calledOnce;
          expect(onStart2).to.have.callCount(0);
        });
      });

      it('cancels the request when onStart returns false', () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addPlugin({ onStart: () => false });

        const promise = myClient.fetch();
        expect(global.fetch).to.not.be.called;
        return expect(promise).to.be.rejected;
      });

      it('cancels the request when onStart throws an error', () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addPlugin({
          onStart: () => {
            throw new PluginError();
          },
        });

        const promise = myClient.fetch();
        expect(global.fetch).to.not.be.called;
        return expect(promise).to.be.rejected;
      });

      it('rejects with a custom error object', () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        myClient.addPlugin({ onStart: () => false });

        const promise = myClient.fetch();
        expect(global.fetch).to.not.be.called;
        return expect(promise).to.be.rejected.then((err) => {
          expect(err.name).to.equal('PluginError');
        });
      });

      it('calls multiple plugin in the order they were added', () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const onStart1 = sinon.spy((request) => request);
        const onStart2 = sinon.spy((request) => request);
        const onStart3 = sinon.spy((request) => request);

        const myClient = new Client();
        myClient.addPlugin({ onStart: onStart1 });
        myClient.addPlugin({ onStart: onStart2 });
        myClient.addPlugin({ onStart: onStart3 });

        return myClient.fetch().then(() => {
          expect(onStart1).to.be.calledBefore(onStart2);
          expect(onStart2).to.be.calledBefore(onStart3);
        });
      });
    });

    describe('onSuccess functionality', () => {
      it('calls onSuccess when a request succeeds', () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const myPlugin = { onSuccess: sinon.spy() };
        myClient.addPlugin(myPlugin);

        return myClient.fetch().then(() => {
          expect(myPlugin.onSuccess).to.have.been.calledOnce;
        });
      });

      it('passes request and response to onSuccess', () => {
        global.fetch = sinon.spy(() => Promise.resolve('test'));
        const myClient = new Client();
        const myPlugin = { onSuccess: sinon.spy() };
        myClient.addPlugin(myPlugin);

        return myClient.fetch().then(() => {
          expect(myPlugin.onSuccess.args[0][0]).to.be.instanceof(Request);
          expect(myPlugin.onSuccess.args[0][1]).to.equal('test');
        });
      });

      it('does not call onSuccess when a request fails', () => {
        global.fetch = sinon.spy(() => Promise.reject('test'));
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
          global.fetch = sinon.spy(() => response);
          const myClient = new Client();
          const myPlugin = {};
          myPlugin[method] = sinon.spy();
          myClient.addPlugin(myPlugin);

          return myClient.fetch().catch(() => {
            expect(myPlugin[method]).to.have.been.calledOnce;
          });
        });

        it(`passes request and error to ${plugins[i]}`, () => {
          global.fetch = sinon.spy(() => response);
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
          global.fetch = sinon.spy(() => Promise.resolve('test'));
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
