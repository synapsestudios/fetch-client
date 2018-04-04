/* eslint no-unused-vars:0, no-unused-expressions:0 no-loop-func:0, no-shadow:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../src/client';
import FormObjectMock from './form-object-mock';

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
        expect(myClient.fetch.args[0][1].method).to.equal('GET');
      });
    });

    it('calls fetch() with passed options when calling get()', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.get('test', {}, { something: 'test' }).then(() => {
        expect(myClient.fetch.args[0][1].something).to.equal('test');
      });
    });

    it('calls fetch() with query string in path when calling get()', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.get('test', { foo: 'bar' }).then(() => {
        expect(myClient.fetch.args[0][0]).to.equal('test?foo=bar');
      });
    });

    it('uses bracket syntax for arrays in the query string if bracketStyleArrays is true', () => {
      const myClient = new Client({ url: 'http://something.com', bracketStyleArrays: true });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.get('test', { foo: ['bar', 'baz'] }).then(() => {
        expect(myClient.fetch.args[0][0]).to.equal('test?foo%5B%5D=bar&foo%5B%5D=baz');
      });
    });

    it('does not use brackets for arrays if bracketStyleArrays is false', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.get('test', { foo: ['bar', 'baz'] }).then(() => {
        expect(myClient.fetch.args[0][0]).to.equal('test?foo=bar&foo=baz');
      });
    });

    it('calls fetch() handling empty body when calling get()', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.get('test', {}).then(() => {
        expect(myClient.fetch.args[0][0]).to.equal('test');
      });
    });

    it('calls fetch setting headers, method, body when calling post', () => {
      const myClient = new Client({ url: 'http://something.com' });
      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.post('test', { something: 'test' }).then(() => {
        expect(myClient.fetch.args[0][1].method).to.equal('POST');
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
          expect(myClient.fetch.args[0][1].method).to.equal('POST');
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
          expect(myClient.fetch.args[0][1].method).to.equal('POST');
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
        expect(myClient.fetch.args[0][1].method).to.equal('DELETE');
        expect(myClient.fetch.args[0][0]).to.equal('test');
      });
    });

    it('calls patch with headers, method, body', () => {
      const myClient = new Client({
        url: 'http://something.com',
        patch: { method: 'notallowed', headers: { Accept: 'test' }, anotherThing: 'cool' },
      });

      myClient.fetch = sinon.spy(() => Promise.resolve('test'));

      return myClient.patch('test', { something: 'test' })
        .then(() => {
          expect(myClient.fetch.args[0][1].method).to.equal('PATCH');
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
          expect(myClient.fetch.args[0][1].method).to.equal('PATCH');
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
        it('sets content type to application/json and json encodes when encoding is json', () => {
          const defaults = { encoding: 'json' };
          defaults[method] = {
            headers: {
              'Content-Type': 'something/weird',
            },
          };

          const myClient = new Client(defaults);
          myClient.fetch = sinon.spy(() => Promise.resolve('test'));

          const promise = myClient[method]('something', { test: 'foo' });
          return expect(promise).to.be.fulfilled.then(() => {
            expect(myClient.fetch.args[0][1].headers['Content-Type']).to.equal('application/json');
            expect(myClient.fetch.args[0][1].body).to.equal(JSON.stringify({ test: 'foo' }));
          });
        });

        it('sets content type to text/plain and does nothing to body when encoding is text', () => {
          const myClient = new Client({ encoding: 'text' });
          myClient.fetch = sinon.spy(() => Promise.resolve('test'));

          const promise = myClient[method]('something', 'test');
          return expect(promise).to.be.fulfilled.then(() => {
            expect(myClient.fetch.args[0][1].headers['Content-Type']).to.equal('text/plain');
            expect(myClient.fetch.args[0][1].body).to.equal('test');
          });
        });

        it('encodes body as FormData when encoding is form-data', () => {
          GLOBAL.FormData = FormObjectMock;

          const myClient = new Client({ encoding: 'form-data' });
          myClient.fetch = sinon.spy(() => Promise.resolve('test'));

          const promise = myClient[method]('something', {
            something: 'hi',
            someArray: ['hey', 'ho'],
            someNestedArray: ['hey', ['ho', 'foo']],
            someObject: { foo: 'bar' },
            someRecursive: { foo: ['array'], bar: 'string', baz: { val: 'object' } },
          });

          return expect(promise).to.be.fulfilled.then(() => {
            // when using FormData fetch sets content type correctly on its own
            expect(myClient.fetch.args[0][1].headers['Content-Type']).to.be.undefined;

            const formData = new GLOBAL.FormData();
            formData.append('something', 'hi');
            formData.append('someArray[]', 'hey');
            formData.append('someArray[]', 'ho');
            formData.append('someNestedArray[]', 'hey');
            formData.append('someNestedArray[][]', 'ho');
            formData.append('someNestedArray[][]', 'foo');
            formData.append('someObject[foo]', 'bar');
            formData.append('someRecursive[foo][]', 'array');
            formData.append('someRecursive[bar]', 'string');
            formData.append('someRecursive[baz][val]', 'object');
            expect(myClient.fetch.args[0][1].body.appends).to.deep.equal(formData.appends);

            GLOBAL.FormData = FormData;
          });
        });

        it('encodes body as URLSearchParams when encoding is x-www-form-urlencoded', () => {
          GLOBAL.URLSearchParams = FormObjectMock;

          const myClient = new Client({ encoding: 'x-www-form-urlencoded' });
          myClient.fetch = sinon.spy(() => Promise.resolve('test'));

          const promise = myClient[method]('something', {
            something: 'hi',
            someArray: ['hey', 'ho'],
            someObject: { foo: 'bar' },
            someRecursive: { foo: ['array'], bar: 'string', baz: { val: 'object' } },
          });

          return expect(promise).to.be.fulfilled.then(() => {
            // when using FormData fetch sets content type correctly on its own
            expect(myClient.fetch.args[0][1].headers['Content-Type']).to.be.equal('application/x-www-form-urlencoded');

            const formData = new GLOBAL.URLSearchParams();
            formData.append('something', 'hi');
            formData.append('someArray[]', 'hey');
            formData.append('someArray[]', 'ho');
            formData.append('someObject[foo]', 'bar');
            formData.append('someRecursive[foo][]', 'array');
            formData.append('someRecursive[bar]', 'string');
            formData.append('someRecursive[baz][val]', 'object');
            expect(myClient.fetch.args[0][1].body).to.deep.equal(formData.toString());

            GLOBAL.URLSearchParams = URLSearchParams;
          });
        });

        it('does nothing to body and uses default Content-Type when encoding is false', () => {
          const defaults = { encoding: false };
          defaults[method] = {
            headers: {
              'Content-Type': 'something/weird',
            },
          };
          const myClient = new Client(defaults);

          myClient.fetch = sinon.spy(() => Promise.resolve(true));
          expect(myClient[method]('something', 'test')).to.be.fulfilled.then(() => {
            expect(myClient.fetch.args[0][1].headers['Content-Type']).to.equal('something/weird');
            expect(myClient.fetch.args[0][1].body).to.equal('test');
          });
        });
      });

      describe('encode based on Content-Type', () => {
        it('sends FormData in body Content-Type is form-data', () => {
          const myClient = new Client();
          myClient.fetch = sinon.spy(() => Promise.resolve('test'));

          const promise = myClient[method]('path', { foo: 'bar' }, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          return expect(promise).to.have.been.fulfilled.then(() => {
            expect(myClient.fetch.args[0][1].body).to.be.instanceof(FormData);
          });
        });

        it('sends a string body when Content-Type is x-www-form-urlencoded', () => {
          const myClient = new Client();
          myClient.fetch = sinon.spy(() => Promise.resolve('test'));

          const promise = myClient[method]('path', { foo: 'bar' }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });

          return expect(promise).to.have.been.fulfilled.then(() => {
            expect(typeof myClient.fetch.args[0][1].body).to.be.equal('string');
          });
        });

        it('sends a JSON string when Content-Type is application/json', () => {
          const myClient = new Client();
          myClient.fetch = sinon.spy(() => Promise.resolve('test'));

          const promise = myClient[method]('path', { foo: 'bar' }, {
            headers: { 'Content-Type': 'application/json' },
          });

          return expect(promise).to.have.been.fulfilled.then(() => {
            expect(myClient.fetch.args[0][1].body).to.equal(JSON.stringify({ foo: 'bar' }));
          });
        });

        it('does nothing to body when Content-type is text/*', () => {
          const myClient = new Client();
          myClient.fetch = sinon.spy(() => Promise.resolve('test'));

          const promise = myClient[method]('path', 'test', {
            headers: { 'Content-Type': 'text/anything' },
          });

          return expect(promise).to.have.been.fulfilled.then(() => {
            expect(myClient.fetch.args[0][1].body).to.equal('test');
          });
        });
      });
    });
  }
});
