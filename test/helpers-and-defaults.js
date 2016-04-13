/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0 */
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

// polyfills
import { Request, Response } from 'whatwg-fetch';
GLOBAL.Request = Request;

describe('helpers & defaults', () => {
  describe('defaults', () => {
    it('prepends default url to fetch path', () => {
      GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
      const myClient = new Client({ url: 'http://something.com/' });

      return myClient.fetch('test').then(() => {
        expect(GLOBAL.fetch.args[0][0]).to.be.instanceof(Request);
        expect(GLOBAL.fetch.args[0][0].url).to.equal('http://something.com/test');
      });
    });

    it('includes slash in url if omitted', () => {
      GLOBAL.fetch = sinon.spy(() => Promise.resolve('test'));
      const myClient = new Client({ url: 'http://something.com' });

      return myClient.fetch('test').then(() => {
        expect(GLOBAL.fetch.args[0][0]).to.be.instanceof(Request);
        expect(GLOBAL.fetch.args[0][0].url).to.equal('http://something.com/test');
      });
    });
  });

  describe('helper basics', () => {
    it('calls fetch() with method=\'get\' in options when calling get()', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.get('test').then(() => {
        expect(myClient.fetch.args[0][1].method).to.equal('get');
      });
    });

    it('calls fetch() with passed options when calling get()', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.get('test', { something: 'test' }).then(() => {
        expect(myClient.fetch.args[0][1].something).to.equal('test');
      });
    });

    it('calls fetch setting headers, method, body when calling post', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.post('test', { something: 'test' }).then(() => {
        expect(myClient.fetch.args[0][1].method).to.equal('post');
        expect(myClient.fetch.args[0][1].headers).to.deep.equal({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        });
        expect(myClient.fetch.args[0][1].body).to.equal(JSON.stringify({ something: 'test' }));
      });
    });

    it('overrides defaults when calling post with options', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.post(
        'test',
        { something: 'test' },
        { method: 'notallowed', headers: { Accept: 'test' }, anotherThing: 'cool' }
      )
        .then(() => {
          expect(myClient.fetch.args[0][1].method).to.equal('post');
          expect(myClient.fetch.args[0][1].headers).to.deep.equal({
            Accept: 'test',
            'Content-Type': 'application/json',
          });
          expect(myClient.fetch.args[0][1].anotherThing).to.equal('cool');
        });
    });

    it('uses post defaults from main defaults object', () => {
      const myClient = new Client({
        url: 'http://something.com',
        post: { method: 'notallowed', headers: { Accept: 'test' }, anotherThing: 'cool' },
      });

      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.post('test', { something: 'test' })
        .then(() => {
          expect(myClient.fetch.args[0][1].method).to.equal('post');
          expect(myClient.fetch.args[0][1].headers).to.deep.equal({
            Accept: 'test',
            'Content-Type': 'application/json',
          });
          expect(myClient.fetch.args[0][1].anotherThing).to.equal('cool');
        });
    });

    it('calls delete with method=\'delete\' in options', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.delete('test').then(() => {
        expect(myClient.fetch.args[0][1].method).to.equal('delete');
        expect(myClient.fetch.args[0][0]).to.equal('test');
      });
    });

    it('calls patch with headers, method, body', () => {
      const myClient = new Client({
        url: 'http://something.com',
        put: { method: 'notallowed', headers: { Accept: 'test' }, anotherThing: 'cool' },
      });

      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.put('test', { something: 'test' })
        .then(() => {
          expect(myClient.fetch.args[0][1].method).to.equal('put');
          expect(myClient.fetch.args[0][1].headers).to.deep.equal({
            Accept: 'test',
            'Content-Type': 'application/json',
          });
          expect(myClient.fetch.args[0][1].anotherThing).to.equal('cool');
        });
    });

    it('calls put with headers, method, body', () => {
      const myClient = new Client({
        url: 'http://something.com',
        patch: { method: 'notallowed', headers: { Accept: 'test' }, anotherThing: 'cool' },
      });

      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.patch('test', { something: 'test' })
        .then(() => {
          expect(myClient.fetch.args[0][1].method).to.equal('patch');
          expect(myClient.fetch.args[0][1].headers).to.deep.equal({
            Accept: 'test',
            'Content-Type': 'application/json',
          });
          expect(myClient.fetch.args[0][1].anotherThing).to.equal('cool');
        });
    });
  });
});
