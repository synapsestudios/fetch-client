/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import clone from 'lodash.clonedeep';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../../src/client';
import jwtPluginOriginal from '../../src/plugins/jwt';
import { AUTH_EXPIRED, AUTH_FAILED } from '../../src/events';

// polyfills
import { Request, Response } from 'whatwg-fetch';
GLOBAL.btoa = (str) => new Buffer(str, 'binary').toString('base64');
GLOBAL.atob = (str) => new Buffer(str, 'base64').toString('binary');

describe('jwt-plugin', () => {
  let jwtPlugin;

  const getToken = (payload) => `${btoa('{}')}.${btoa(JSON.stringify(payload))}.${btoa('{}')}`;

  beforeEach(() => {
    GLOBAL.fetch = null;
    jwtPlugin = clone(jwtPluginOriginal);
  });

  it('throws error if getJwtToken without setting it first', () => {
    const client = new Client();
    client.addPlugin(jwtPlugin);

    expect(client.getJwtToken).to.throw(Error);
  });

  it('sets Authorization header to value returned by getJwtToken', () => {
    GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
    const token = getToken({ exp: 1 });
    const request = new Request();
    const client = new Client();
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    client.post(request);

    expect(request.headers.get('Authorization')).to.equal(token);
  });

  [false, null, undefined].forEach(falsyVal => {
    it(`does not include Authorization header if getJwtToken returns ${falsyVal}`, () => {
      const response = new Response(JSON.stringify({ body: 'content' }), { status: 200 });
      GLOBAL.fetch = sinon.spy(() => Promise.resolve(response));
      const client = new Client();
      client.addPlugin(jwtPlugin);
      client.setJwtTokenGetter(() => falsyVal);
      const request = new Request();

      client.post(request);

      expect(request.headers.has('Authorization')).to.equal(false);
    });
  });

  it('resolves with response on failure', () => {
    const response = new Response("{ body: 'content' }", { status: 401 });
    GLOBAL.fetch = sinon.spy(() => Promise.resolve(response));
    const token = getToken({ exp: 1 });
    const request = new Request();
    const client = new Client();
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    return expect(client.post(request)).to.be.fulfilled.then(resolution => {
      expect(resolution).to.equal(response);
    });
  });

  it('emits AUTH_EXPIRED event if request 401s and token is expired', () => {
    const response = new Response("{ body: 'content' }", { status: 401 });
    GLOBAL.fetch = sinon.spy(() => Promise.resolve(response));
    const token = getToken({ exp: 1 });
    const request = new Request();
    const client = new Client();
    const failedSpy = sinon.spy();
    const expiredSpy = sinon.spy();
    client.on(AUTH_EXPIRED, expiredSpy);
    client.on(AUTH_FAILED, failedSpy);
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    return client.post(request).then(() => {
      expect(failedSpy).to.not.have.been.called;
      expect(expiredSpy).to.have.been.called;
      expect(expiredSpy.args[0][0]).to.equal(request);
      expect(expiredSpy.args[0][1]).to.equal(response);
    });
  });

  it('emits AUTH_FAILED event if request 401s but token is not expired', () => {
    const response = new Response("{ body: 'content' }", { status: 401 });
    GLOBAL.fetch = sinon.spy(() => Promise.resolve(response));
    const token = getToken({ exp: (new Date().getTime() / 1000) + 1000 });
    const request = new Request();
    const client = new Client();
    const failedSpy = sinon.spy();
    const expiredSpy = sinon.spy();
    client.on(AUTH_EXPIRED, expiredSpy);
    client.on(AUTH_FAILED, failedSpy);
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    return client.post(request).then(() => {
      expect(failedSpy).to.have.been.called;
      expect(expiredSpy).not.to.have.been.called;
      expect(failedSpy.args[0][0]).to.equal(request);
      expect(failedSpy.args[0][1]).to.equal(response);
    });
  });

  it('emits AUTH_FAILED event if request 401s and token is null', () => {
    const response = new Response("{ body: 'content' }", { status: 401 });
    GLOBAL.fetch = sinon.spy(() => Promise.resolve(response));
    const token = null;
    const request = new Request();
    const client = new Client();
    const failedSpy = sinon.spy();
    const expiredSpy = sinon.spy();
    client.on(AUTH_EXPIRED, expiredSpy);
    client.on(AUTH_FAILED, failedSpy);
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    return client.post(request).then(() => {
      expect(failedSpy).to.have.been.called;
      expect(expiredSpy).not.to.have.been.called;
      expect(failedSpy.args[0][0]).to.equal(request);
      expect(failedSpy.args[0][1]).to.equal(response);
    });
  });

  it('emits AUTH_FAILED event if request 401s and decoded token is invalid JSON', () => {
    const response = new Response("{ body: 'content' }", { status: 401 });
    GLOBAL.fetch = sinon.spy(() => Promise.resolve(response));
    const token = 'foo';
    const request = new Request();
    const client = new Client();
    const failedSpy = sinon.spy();
    const expiredSpy = sinon.spy();
    client.on(AUTH_EXPIRED, expiredSpy);
    client.on(AUTH_FAILED, failedSpy);
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    return client.post(request).then(() => {
      expect(failedSpy).to.have.been.called;
      expect(expiredSpy).not.to.have.been.called;
      expect(failedSpy.args[0][0]).to.equal(request);
      expect(failedSpy.args[0][1]).to.equal(response);
    });
  });

  it('does not emit either custom event if request fails with non-401', () => {
    const response = new Response("{ body: 'content' }", { status: 500 });
    GLOBAL.fetch = sinon.spy(() => Promise.resolve(response));
    const token = getToken({ exp: (new Date().getTime() / 1000) + 1000 });
    const request = new Request();
    const client = new Client();
    const failedSpy = sinon.spy();
    const expiredSpy = sinon.spy();
    client.on(AUTH_EXPIRED, expiredSpy);
    client.on(AUTH_FAILED, failedSpy);
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    return client.post(request).then(() => {
      expect(failedSpy).not.to.have.been.called;
      expect(expiredSpy).not.to.have.been.called;
    });
  });
});
