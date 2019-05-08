/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import clone from 'lodash.clonedeep';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../../src/client';
import oauthPluginOriginal from '../../src/plugins/oauth';

// polyfills
import { Request, Response } from 'whatwg-fetch';

describe('oauth-plugin', () => {
  beforeEach(() => {
    GLOBAL.fetch = null;
  });

  it('does not get stuck in an infinite loop when refreshToken fails', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401 = new Response(JSON.stringify({ body: 'content' }), { status: 401 });
    GLOBAL.fetch = sinon.spy(() => Promise.resolve(response401));

    const failedRefreshResponse = new Response('', { status: 400 });
    oauthPlugin.helpers.refreshToken = () => Promise.resolve(failedRefreshResponse);
    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => 'REFRESH_TOKEN');
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    const request = new Request('/some/endpoint');
    return client.post(request).then(() => {
      expect(GLOBAL.fetch).to.be.calledOnce;
    });
  });

  it('refreshes token and tries request again when request 401s', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401 = new Response(JSON.stringify({ body: 'content' }), { status: 401 });
    const response200 = new Response(JSON.stringify({ body: 'content' }), { status: 200 });
    GLOBAL.fetch = sinon.stub();
    GLOBAL.fetch.onCall(0).returns(Promise.resolve(response401));
    GLOBAL.fetch.onCall(1).returns(Promise.resolve(response200));

    const refreshResponse = new Response(JSON.stringify({}), { status: 200 });
    oauthPlugin.helpers.refreshToken = () => Promise.resolve(refreshResponse);
    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => 'REFRESH_TOKEN');
    const refreshCallback = sinon.spy(() => Promise.resolve());
    client.setOnRefreshResponse(refreshCallback);
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    const request = new Request('/some/endpoint');
    return client.post(request).then(() => {
      expect(GLOBAL.fetch).to.be.calledTwice;
      expect(refreshCallback).to.be.calledOnce;
    });
  });

  it('does not send multiple refresh requests if multiple simulatenous requests 401', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401i = new Response(JSON.stringify({ body: 'content' }), { status: 401 });
    const response401ii = new Response(JSON.stringify({ body: 'content' }), { status: 401 });
    const response200 = new Response(JSON.stringify({ body: 'content' }), { status: 200 });
    GLOBAL.fetch = sinon.stub();
    // Both initial requests 401
    GLOBAL.fetch.onCall(0).returns(
      new Promise((resolve) => setTimeout(() => resolve(response401i), 25)),
    );
    GLOBAL.fetch.onCall(1).returns(
      new Promise((resolve) => setTimeout(() => resolve(response401ii), 50)),
    );
    // On retry, they succeed
    GLOBAL.fetch.onCall(2).returns(
      new Promise((resolve) => setTimeout(() => resolve(response200), 25)),
    );
    GLOBAL.fetch.onCall(3).returns(
      new Promise((resolve) => setTimeout(() => resolve(response200), 25)),
    );

    const refreshResponse = new Response(JSON.stringify({}), { status: 200 });
    oauthPlugin.helpers.refreshToken = sinon.spy(
      () => new Promise(resolve => setTimeout(() => resolve(refreshResponse), 50))
    );
    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => 'REFRESH_TOKEN');
    const refreshCallback = sinon.spy(() => Promise.resolve());
    client.setOnRefreshResponse(refreshCallback);
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    const request = new Request('/some/endpoint');
    const request2 = new Request('/some/endpoint');
    return Promise.all([
      client.post(request),
      client.post(request2),
    ]).then(() => {
      expect(GLOBAL.fetch.callCount).to.equal(4);
      expect(oauthPlugin.helpers.refreshToken).to.be.calledOnce;
    });
  });

  it('does not send multiple refresh reqs if reqs that 401 happen in quick succession', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401 = new Response(JSON.stringify({ body: 'content' }), { status: 401 });
    const response200 = new Response(JSON.stringify({ body: 'content' }), { status: 200 });
    const response200ii = new Response(JSON.stringify({ body: 'content' }), { status: 200 });
    GLOBAL.fetch = sinon.stub();
    // Requests in quick succession both 401
    GLOBAL.fetch.onCall(0).returns(
      new Promise((resolve) => setTimeout(() => resolve(response401), 1)),
    );
    // The second request won't be attempted while refreshing
    GLOBAL.fetch.onCall(1).returns(
      new Promise((resolve) => setTimeout(() => resolve(response200), 1)),
    );
    GLOBAL.fetch.onCall(2).returns(
      new Promise((resolve) => setTimeout(() => resolve(response200ii), 250)),
    );

    const refreshResponse = new Response(JSON.stringify({}), { status: 200 });
    oauthPlugin.helpers.refreshToken = sinon.spy(
      () => new Promise(resolve => setTimeout(() => resolve(refreshResponse), 50))
    );
    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => 'REFRESH_TOKEN');
    const refreshCallback = sinon.spy(() => Promise.resolve());
    client.setOnRefreshResponse(refreshCallback);
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    const request = new Request('/some/endpoint');
    const request2 = new Request('/some/other/endpoint');
    return Promise.all([
      client.post(request),
      // Second request 5 ms later
      new Promise(resolve => setTimeout(() => resolve(client.post(request2)), 5)),
    ]).then((resolutions) => {
      expect(GLOBAL.fetch.callCount).to.equal(3);
      expect(oauthPlugin.helpers.refreshToken).to.be.calledOnce;
      // requests resolve to the response object
      expect(resolutions[0]).to.equal(response200ii); // Not sure why this one is first but it's fine
      expect(resolutions[1]).to.equal(response200);
    });
  });
});
