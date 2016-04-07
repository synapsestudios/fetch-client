/* eslint no-unused-vars:0, no-unused-expressions:0 */
const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const expect = chai.expect;

const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

const Client = require('../src/client');
const Request = require('whatwg-fetch').Request;

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
      const myClient = new Client();
      const cb = sinon.spy();
      myClient.on('request_success', cb);

      const promise = myClient.fetch('http://google.com/', { method: 'get' });

      return expect(promise).to.be.fulfilled.then(x => {
        expect(cb).to.have.been.calledOnce;
      });
    });

    it('should emit fail event', () => {

    });
  });
});
