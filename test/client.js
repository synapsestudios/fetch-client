/* eslint no-unused-vars:0 */
const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const expect = chai.expect;

const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

const Client = require('../src/client');

describe('client', () => {
  it('should not fail to instantiate', () => {
    const myClient = new Client({ arbitrary: 'object' });
  });
});
