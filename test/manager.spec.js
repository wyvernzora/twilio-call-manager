/**
 * test/client.spec.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license MIT
 */

const _      = require('lodash');
const expect = require('chai').expect;
const Sinon  = require('sinon');
const Moment = require('moment');
const Bluebird = require('bluebird');

const Manager = rootreq('lib/manager');

/* Barebone config */
const config = {
  sid: 'foo',
  token: 'bar'
};


describe('constructor(1)', function() {

  it('should create a call manager instance', function() {
    const mgr = new Manager(config);

    expect(mgr).to.be.instanceOf(Manager);
    expect(mgr).to.have.property('calls');
  });

});


describe('spawn(3)', function() {

  it('should add an active call', function() {
    const mgr = new Manager(config);

    mgr.call = Sinon.spy(() => Bluebird.resolve({ update: () => { } }));
    const promise = mgr.spawn('1231231234', { });

    return promise.then(() => {
      expect(mgr.call).to.be.calledOnce;
      const info = mgr.calls['1231231234'];
      expect(info).to.exist;
      expect(info.active).to.be.true;
    });
  });

  it('should set a timeout if specified in config', function() {
    const mgr = new Manager(_.assign({ }, config, { timeout: 0.2 }));
    const call = { update: Sinon.spy() };

    mgr.call = Sinon.spy(() => Bluebird.resolve(call));
    const promise = mgr.spawn('1231231234', { });

    return promise
      .delay(100)
      .then(() => expect(call.update).to.have.callCount(0))
      .delay(100)
      .then(() => expect(call.update).to.be.calledOnce);
  });

  it('should emit a start event', function() {
    const mgr = new Manager(config);

    const handler = Sinon.spy();
    mgr.on('start', handler);

    mgr.call = Sinon.spy(() => Bluebird.resolve({ update: () => { } }));
    const promise = mgr.spawn('1231231234', { });

    return promise
      .then(() => {
        expect(handler).to.be.calledOnce;
      });

  });

});


describe('finished(3)', function() {

  it('should end a successful active call', function() {
    const mgr = new Manager(config);

    const handler = Sinon.spy();
    mgr.on('success', handler);

    mgr.call = Sinon.spy(() => Bluebird.resolve({ update: () => { } }));
    return mgr
      .spawn('1231231234', { })
      .then(() => mgr.finished('1231231234', { CallStatus: 'completed' }))
      .then(() => {
        const info = mgr.calls['1231231234'];
        expect(info).to.exist;
        expect(info.active).to.be.false;
        expect(handler).to.be.calledOnce;
      });
  });

  it('should end a failed active call', function() {
    const mgr = new Manager(config);

    const handler = Sinon.spy();
    mgr.on('failed', handler);

    mgr.call = Sinon.spy(() => Bluebird.resolve({ update: () => { } }));
    return mgr
      .spawn('1231231234', { })
      .then(() => mgr.finished('1231231234', { CallStatus: 'no-answer' }))
      .then(() => {
        const info = mgr.calls['1231231234'];
        expect(info).to.exist;
        expect(info.active).to.be.false;
        expect(info.failed).to.equal(1);
        expect(info.delay).to.exist;
        expect(handler).to.be.calledOnce;
      });
  });

  it('should ignore unknown status strings', function() {
    const mgr = new Manager(config);

    const handler = Sinon.spy();
    mgr.on('#', handler);

    mgr.call = Sinon.spy(() => Bluebird.resolve({ update: () => { } }));
    return mgr
      .spawn('1231231234', { })
      .then(() => mgr.finished('1231231234', { CallStatus: 'unknown' }))
      .then(() => {
        const info = mgr.calls['1231231234'];
        expect(info).to.exist;
        expect(info.active).to.be.true;
        expect(handler).to.have.callCount(1);
      });
  });

  it('should ignore calls on inactive calls', function() {
    const mgr = new Manager(config);

    const handler = Sinon.spy();
    mgr.on('#', handler);

    mgr.call = Sinon.spy(() => Bluebird.resolve({ update: () => { } }));
    return mgr
      .spawn('1231231234', { })
      .then(() => mgr.finished('1231231234', { CallStatus: 'completed' }))
      .then(() => mgr.finished('1231231234', { CallStatus: 'canceled' }))
      .then(() => {
        const info = mgr.calls['1231231234'];
        expect(info).to.exist;
        expect(info.active).to.be.false;
        expect(info.failed).to.equal(0);
        expect(handler).to.have.callCount(2);
      });
  });

  it('should ignore calls on inactive calls', function() {
    const mgr = new Manager(config);

    const handler = Sinon.spy();
    mgr.on('#', handler);

    mgr.call = Sinon.spy(() => Bluebird.resolve({ sid: 'foo', update: () => { } }));
    return mgr
      .spawn('1231231234', { })
      .then(() => mgr.finished('1231231234', { CallStatus: 'completed', CallSid: 'bar' }))
      .then(() => {
        const info = mgr.calls['1231231234'];
        expect(info).to.exist;
        expect(info.active).to.be.true;
        expect(info.failed).to.equal(0);
        expect(handler).to.have.callCount(1);
      });
  });

});

describe('getActivePhones(0)', function() {

  it('should add active calls to ignore list', function() {
    const mgr = new Manager(config);
    mgr.calls['1231231234'] = { to: '1231231234', active: true };
    mgr.calls['9879879876'] = { to: '9879879876', active: false };

    const actual = mgr.getActivePhones();
    expect(actual).to.deep.equal([ '1231231234' ]);
  });

  it('should add delayed calls to ignore list', function() {
    const mgr = new Manager(config);
    mgr.calls['1231231234'] = { to: '1231231234', active: false, delay: Moment().subtract(2, 'hours') };
    mgr.calls['9879879876'] = { to: '9879879876', active: false, delay: Moment().add(2, 'hours')};

    const actual = mgr.getActivePhones();
    expect(actual).to.deep.equal([ '9879879876' ]);
  });

});
