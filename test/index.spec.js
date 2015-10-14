/**
 * test/index.spec.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license MIT
 */

const Chai = require('chai');

Chai.use(require('chai-as-promised'));
Chai.use(require('sinon-chai'));

/* Allow require from project root */
global.rootreq = require('app-root-path').require;


/* Run all other test files */
describe('Client', function() {
  require('./client.spec.js');
});

describe('CallManager', function() {
  require('./manager.spec.js');
});
