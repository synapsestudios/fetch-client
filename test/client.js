/* eslint no-unused-vars:0 */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import rewire from 'rewire';

import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

chai.use(chaiAsPromised);
chai.use(sinonChai);

import Client from '../lib/client';

describe('client', () => {
  it('should not fail to instantiate', () => {
    const myClient = new Client({ arbitrary: 'object' });
  });
});
