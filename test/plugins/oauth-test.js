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
    const refreshCallback = sinon.spy();
    client.setOnRefreshResponse(refreshCallback);
    client.setUsedRefreshTokens([]);
    client.setConfig({ refresh_path: '/refresh' });

    const request = new Request('/some/endpoint');
    return client.post(request).then(() => {
      expect(GLOBAL.fetch).to.be.calledTwice;
      expect(refreshCallback).to.be.calledOnce;
    });
  });
});
