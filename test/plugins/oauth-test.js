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
    global.fetch = null;
  });

  it('does not get stuck in an infinite loop when refreshToken fails', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401 = new Response(JSON.stringify({ body: 'content' }), {
      status: 401,
    });
    global.fetch = sinon.spy(() => Promise.resolve(response401));

    const failedRefreshResponse = new Response('', { status: 400 });
    oauthPlugin.helpers.refreshToken = () =>
      Promise.resolve(failedRefreshResponse);
    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => 'REFRESH_TOKEN');
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    const request = new Request('/some/endpoint');
    return client.post(request).then(() => {
      expect(global.fetch).to.be.calledOnce;
    });
  });

  it('refreshes token and tries request again when request 401s', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401 = new Response(JSON.stringify({ body: 'content' }), {
      status: 401,
    });
    const response200 = new Response(JSON.stringify({ body: 'content' }), {
      status: 200,
    });
    global.fetch = sinon.stub();
    global.fetch.onCall(0).returns(Promise.resolve(response401));
    global.fetch.onCall(1).returns(Promise.resolve(response200));

    const refreshResponse = new Response(JSON.stringify({}), { status: 200 });
    oauthPlugin.helpers.refreshToken = () => Promise.resolve(refreshResponse);
    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => 'REFRESH_TOKEN');
    const refreshCallback = sinon.spy(() => Promise.resolve());
    client.setOnRefreshResponse(refreshCallback);
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    const request = new Request('/some/endpoint');
    return client.post(request).then((response) => {
      expect(global.fetch).to.be.calledTwice;
      expect(refreshCallback).to.be.calledOnce;
      expect(response).to.equal(response200);
    });
  });

  it('does not send multiple refresh requests if multiple simulatenous requests 401', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401i = new Response(JSON.stringify({ body: 'content' }), {
      status: 401,
    });
    const response401ii = new Response(JSON.stringify({ body: 'content' }), {
      status: 401,
    });
    const response200 = new Response(JSON.stringify({ body: 'content' }), {
      status: 200,
    });
    global.fetch = sinon.stub();
    // Both initial requests 401
    global.fetch
      .onCall(0)
      .returns(
        new Promise((resolve) => setTimeout(() => resolve(response401i), 25))
      );
    global.fetch
      .onCall(1)
      .returns(
        new Promise((resolve) => setTimeout(() => resolve(response401ii), 50))
      );
    // On retry, they succeed
    global.fetch
      .onCall(2)
      .returns(
        new Promise((resolve) => setTimeout(() => resolve(response200), 25))
      );
    global.fetch
      .onCall(3)
      .returns(
        new Promise((resolve) => setTimeout(() => resolve(response200), 25))
      );

    let refreshTokenIndex = 1;
    const refreshResponse = new Response(JSON.stringify({}), { status: 200 });
    oauthPlugin.helpers.refreshToken = sinon.spy(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve(new Response(JSON.stringify({}), { status: 200 })),
            50
          )
        )
    );
    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => `REFRESH_TOKEN_${refreshTokenIndex}`);
    const refreshCallback = sinon.spy(() => {
      refreshTokenIndex += 1;
      return Promise.resolve();
    });
    client.setOnRefreshResponse(refreshCallback);
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    const request = new Request('/some/endpoint');
    const request2 = new Request('/some/endpoint');
    return Promise.all([client.post(request), client.post(request2)]).then(
      () => {
        expect(global.fetch.callCount).to.equal(4);
        expect(oauthPlugin.helpers.refreshToken).to.be.calledOnce;
      }
    );
  });

  it('does not send multiple refresh reqs if reqs that 401 happen in quick succession', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401 = new Response(JSON.stringify({ body: 'content' }), {
      status: 401,
    });
    const response200 = new Response(JSON.stringify({ body: 'content' }), {
      status: 200,
    });
    const response200ii = new Response(JSON.stringify({ body: 'content' }), {
      status: 200,
    });
    global.fetch = sinon.stub();
    global.fetch
      .onCall(0)
      .returns(
        new Promise((resolve) => setTimeout(() => resolve(response401), 1))
      );
    // The second request won't be attempted while refreshing
    global.fetch
      .onCall(1)
      .returns(
        new Promise((resolve) => setTimeout(() => resolve(response200), 1))
      );
    global.fetch
      .onCall(2)
      .returns(
        new Promise((resolve) => setTimeout(() => resolve(response200ii), 250))
      );

    const refreshResponse = new Response(JSON.stringify({}), { status: 200 });
    oauthPlugin.helpers.refreshToken = sinon.spy(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(refreshResponse), 50))
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
      new Promise((resolve) =>
        setTimeout(() => resolve(client.post(request2)), 5)
      ),
    ]).then((resolutions) => {
      expect(global.fetch.callCount).to.equal(3);
      expect(oauthPlugin.helpers.refreshToken).to.be.calledOnce;
      // requests resolve to the response object
      expect(resolutions[0]).to.equal(response200ii); // Not sure why this one is first but it's fine
      expect(resolutions[1]).to.equal(response200);
    });
  });

  it('does not concatenate headers when retrying the request', () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const response401 = new Response(JSON.stringify({ body: 'content' }), {
      status: 401,
    });
    const response200 = new Response(JSON.stringify({ body: 'content' }), {
      status: 200,
    });
    global.fetch = sinon.stub();
    global.fetch.onCall(0).returns(Promise.resolve(response401));
    global.fetch.onCall(1).returns(Promise.resolve(response200));

    const refreshResponse = new Response(JSON.stringify({}), { status: 200 });
    oauthPlugin.helpers.refreshToken = () => Promise.resolve(refreshResponse);
    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => 'REFRESH_TOKEN');
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    client.setOnRefreshResponse(
      async ({ access_token, refresh_token, id_token }) => {
        client.setBearerTokenGetter(() => 'NEW_TOKEN');
      }
    );

    const request = new Request('/some/endpoint');
    return client.post(request).then((response) => {
      expect(global.fetch.args[1][0].headers.get('authorization')).to.equal(
        'Bearer NEW_TOKEN'
      );
    });
  });

  it('does not reuse request objects', async () => {
    const client = new Client();
    const oauthPlugin = clone(oauthPluginOriginal);
    client.addPlugin(oauthPlugin);

    const body = JSON.stringify({ hi: 'there' });
    const request = new Request('/some/endpoint', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

    global.fetch = sinon.stub();
    const response401 = new Response(JSON.stringify({ body: 'content' }), {
      status: 401,
    });
    global.fetch.onCall(0).returns(Promise.resolve(response401));

    const response200 = new Response(JSON.stringify({ body: 'content' }), {
      status: 200,
    });
    global.fetch.onCall(1).returns(Promise.resolve(response200));

    const refreshResponse = new Response(JSON.stringify({}), { status: 200 });
    oauthPlugin.helpers.refreshToken = () => Promise.resolve(refreshResponse);

    client.setBearerTokenGetter(() => 'TOKEN');
    client.setRefreshTokenGetter(() => 'REFRESH_TOKEN');
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });
    client.setOnRefreshResponse(
      async ({ access_token, refresh_token, id_token }) => {
        client.setBearerTokenGetter(() => 'NEW_TOKEN');
      }
    );

    return client
      .post(request)
      .then((response) => {
        const newRequest = global.fetch.args[1][0];
        expect(newRequest).to.not.equal(request);
        expect(newRequest.url).to.equal(request.url);
        expect(newRequest.method).to.equal(request.method);
        expect(newRequest.referrer).to.equal(request.referrer);
        expect(newRequest.referrerPolicy).to.equal(request.referrerPolicy);
        expect(newRequest.mode).to.equal(request.mode);
        expect(newRequest.credentials).to.equal(request.credentials);
        expect(newRequest.cache).to.equal(request.cache);
        expect(newRequest.redirect).to.equal(request.redirect);
        expect(newRequest.integrity).to.equal(request.integrity);
        expect(newRequest.headers.get('content-type')).to.equal(
          'application/json'
        );
        expect(newRequest.bodyUsed).to.be.false;

        return newRequest.json();
      })
      .then((newBody) => {
        expect(JSON.stringify(newBody)).to.equal(body);
      });
  });
});
