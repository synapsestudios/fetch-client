/* eslint no-unused-vars:0, no-unused-expressions:0 */
const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const expect = chai.expect;

const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

const Client = rewire('../src/client');
const Request = require('whatwg-fetch').Request;
var EventEmitter2 = require('eventemitter2');

describe('client', () => {
  it('should not fail to instantiate', () => {
    const myClient = new Client({ arbitrary: 'object' });
  });

  describe('events', () => {
    it('should emit starting event', () => {
      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on('request_start', cb);

      myClient.fetch('http://google.com/', { method: 'get' });
      expect(cb).to.have.been.calledOnce;
      expect(cb.args[0][0]).to.be.instanceof(Request);
      expect(cb.args[0][0]).to.have.property('url', 'http://google.com/');
      expect(cb.args[0][0]).to.have.property('method', 'GET');
    });

    it('should emit success event', () => {
      Client.__set__('fetch', (request) => Promise.resolve('test'));

      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on('request_success', cb);

      const promise = myClient.fetch('http://google.com/', { method: 'get' });

      return expect(promise).to.be.fulfilled.then(x => {
        expect(cb).to.have.been.calledOnce;
        expect(cb.args[0][0]).to.be.instanceof(Request);
        expect(cb.args[0][0]).to.have.property('url', 'http://google.com/');
        expect(cb.args[0][0]).to.have.property('method', 'GET');
        expect(cb.args[0][1]).to.equal('test');
      });
    });

    it('should emit fail event', () => {
      Client.__set__('fetch', (request) => Promise.reject('test'));

      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on('request_fail', cb);

      const promise = myClient.fetch('http://google.com/', { method: 'get' });

      return expect(promise).to.be.rejected.then(x => {
        expect(cb).to.have.been.calledOnce;
        expect(cb.args[0][0]).to.be.instanceof(Request);
        expect(cb.args[0][0]).to.have.property('url', 'http://google.com/');
        expect(cb.args[0][0]).to.have.property('method', 'GET');
        expect(cb.args[0][1]).to.equal('test');
      });
    });

    it('should return an event emitter object', () => {
      const myClient = new Client();
      expect(myClient.eventEmitter).to.be.instanceof(EventEmitter2);
    });
  });
});
