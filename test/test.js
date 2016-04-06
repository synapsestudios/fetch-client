const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const expect = chai.expect;

const chaiAsPromised = require('chai-as-promised');
const sinonChai = require('sinon-chai');
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('example', () => {
  it('should pass', () => {
    expect(1).to.equal(1);
  });
});
