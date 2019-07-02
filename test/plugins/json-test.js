/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import clone from 'lodash.clonedeep';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../../src/client';
import jsonPlugin from '../../src/plugins/json';

// polyfills
import { Request, Response } from 'whatwg-fetch';

describe('json-plugin', () => {
  describe('Response.parsedData()', () => {
    it('JSON encodes response if response header content type is "application/json"', () => {
      const body = { content: 'here it is' };
      const response = new Response(
        JSON.stringify(body),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      global.fetch = sinon.spy(() => Promise.resolve(response));
      const client = new Client();
      client.addPlugin(jsonPlugin);

      return client.post('endpoint').then(() => response.parsedBody().then(parsed => {
        expect(parsed).to.eql(body);
      }));
    });

    it('JSON encodes response if response header content type starts with "application/json"', () => {
      const body = { content: 'here it is' };
      const response = new Response(
        JSON.stringify(body),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
      global.fetch = sinon.spy(() => Promise.resolve(response));
      const client = new Client();
      client.addPlugin(jsonPlugin);

      return client.post('endpoint').then(() => response.parsedBody().then(parsed => {
        expect(parsed).to.eql(body);
      }));
    });

    it('leaves body as is if response header content type is not JSON', () => {
      const body = 'plain string';
      const response = new Response(
        body,
        { status: 200 }
      );
      global.fetch = sinon.spy(() => Promise.resolve(response));
      const client = new Client();
      client.addPlugin(jsonPlugin);

      return client.post('endpoint').then(() => response.parsedBody().then(parsed => {
        expect(parsed).to.eql(body);
      }));
    });
  });
});
