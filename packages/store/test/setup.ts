import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';

chai.use(sinonChai);
chai.use(chaiAsPromised);

Error.stackTraceLimit = Infinity;

const testContext = require.context('.', true, /\.spec/);
testContext.keys().forEach(testContext);