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

// polyfills
import { Request, Response } from 'whatwg-fetch';
GLOBAL.Request = Request;

describe('jwt-plugin', () => {
  let jwtPlugin;

  beforeEach(() => {
    jwtPlugin = clone(jwtPluginOriginal);
  });

  it('throws error if getJwtToken without setting it first', () => {
    const client = new Client();
    client.addPlugin(jwtPlugin);

    expect(client.getJwtToken).to.throw(Error);
  });
});
