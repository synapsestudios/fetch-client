/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import clone from 'lodash.clonedeep';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../../src/client';
import JwtPlugin from '../../src/plugins/jwt';

// polyfills
import { Request, Response } from 'whatwg-fetch';
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

describe('jwt-plugin', () => {
  let jwtPlugin;

  const getToken = (payload) =>
    `${btoa('{}')}.${btoa(JSON.stringify(payload))}.${btoa('{}')}`;

  beforeEach(() => {
    global.fetch = null;
    jwtPlugin = new JwtPlugin();
  });

  it('throws error if getJwtToken without setting it first', () => {
    const client = new Client();
    client.addPlugin(jwtPlugin);

    expect(client.getJwtToken).to.throw(Error);
  });

  it('sets Authorization header to value returned by getJwtToken', () => {
    global.fetch = sinon.spy(() => Promise.resolve('test'));
    const token = getToken({ exp: 1 });
    const request = new Request();
    const client = new Client();
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    client.post(request);

    expect(request.headers.get('Authorization')).to.equal(token);
  });

  [false, null, undefined].forEach((falsyVal) => {
    it(`does not include Authorization header if getJwtToken returns ${falsyVal}`, () => {
      const response = new Response(JSON.stringify({ body: 'content' }), {
        status: 200,
      });
      global.fetch = sinon.spy(() => Promise.resolve(response));
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
    global.fetch = sinon.spy(() => Promise.resolve(response));
    const token = getToken({ exp: 1 });
    const request = new Request();
    const client = new Client();
    client.addPlugin(jwtPlugin);
    client.setJwtTokenGetter(() => token);

    return expect(client.post(request)).to.be.fulfilled.then((resolution) => {
      expect(resolution).to.equal(response);
    });
  });
});
