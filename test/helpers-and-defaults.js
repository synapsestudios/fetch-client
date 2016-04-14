/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../lib/client';

// polyfills
import { Request, Response } from 'whatwg-fetch';
import FormData from 'form-data';
import { URLSearchParams } from 'urlsearchparams';

GLOBAL.Request = Request;
GLOBAL.FormData = FormData;
GLOBAL.URLSearchParams = URLSearchParams;

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

    it('allows encoding to be set', () => {
      const cb = () => new Client({ encoding: 'form-data' });
      expect(cb).to.not.throw(Error);
    });

    it('throws an error if encoding is not valid', () => {
      const cb = () => new Client({ encoding: 'not-valid' });
      expect(cb).to.throw(Error);
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

  const methods = ['put', 'post', 'patch'];
  let i = 0;

  for (i; i < methods.length; i++) {
    const method = methods[i];

    describe(`encoding: ${method.toUpperCase()}`, () => {
      describe('already encoded', () => {
        it('does not set content type header when body is FormData', () => {
          const myClient = new Client();
          myClient.fetch = sinon.spy();

          const body = new FormData();
          body.append('x', 'y');

          myClient[method]('path', body);
          expect(myClient.fetch.args[0][1].headers['Content-Type']).to.be.undefined;
          expect(myClient.fetch.args[0][1].body).to.equal(body);
        });

        it('does not set content type header when body is URLSearchParams', () => {
          const myClient = new Client();
          myClient.fetch = sinon.spy();

          const body = new URLSearchParams();
          body.append('x', 'y');

          myClient[method]('path', body);
          expect(myClient.fetch.args[0][1].headers['Content-Type']).to.be.undefined;
          expect(myClient.fetch.args[0][1].body).to.equal(body);
        });
      });

      describe('encode based on default encoding', () => {
        it('sets content type to application/json and json encodes when encoding is json');
        it('sets content type to text/plain and does nothing to body when encoding is text');
        it('encodes body as FormData when encoding is form-data');
        it('encodes body as URLSearchParams when encoding is x-www-form-urlencoded');
      });

      describe('encode based on Content-Type', () => {
        it('sends FormData in body Content-Type is form-data');
        it('sends URLSearchParams Content-Type is x-www-form-urlencoded');
        it('sends a JSON string when Content-Type is application/json');
        it('does nothing to body when Content-type is text/*');
      });
    });
  }
});
