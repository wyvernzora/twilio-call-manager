/**
 * test/client.spec.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license MIT
 */

const _      = require('lodash');
const expect = require('chai').expect;
const Sinon  = require('sinon');
const Bluebird = require('bluebird');

const Client = rootreq('lib/client');

/* Barebone config */
const config = { sid: 'foo', token: 'bar' };


describe('constructor()', function() {

  it('should create a client instance', function() {
    const actual = new Client(config);

    expect(actual).to.exist;
    expect(actual).to.be.an.instanceOf(Client);
  });

  it('should pass on the configuration', function() {
    const actual = new Client(config);

    expect(actual).to.have.property('config', config);
  });

  it('should fallback on OS.hostname() if none provided', function() {
    delete process.env.HOSTNAME;

    const expected = require('os').hostname();
    const actual = new Client({ sid: 'foo', token: 'bar' });

    expect(actual).to.have.property('host', `http://${expected}/`);
  });

  it('should use auth parameter if provided', function() {
    process.env.HOSTNAME = 'https://test.com:1234';
    const params = _.assign({ }, config, {
      auth: { username: 'user', password: 'password' }
    });
    const actual = new Client(params);

    expect(actual).to.have.property('host', 'https://user:password@test.com:1234/');
  });

  it('should use dry parameter if provided', function() {
    const params = _.assign({ }, config, { dry: '1231231234' });
    const actual = new Client(params);

    expect(actual).to.have.property('dry', '1231231234');
  });

});


describe('call(2)', function() {

  it('should initiate a Twilio call', function() {
    const client = new Client(config);
    const params = { foo: 'bar', url: '/status' };

    client.__native.makeCall = Sinon.spy(function() { });
    const promise = client.call('1231231234', params);

    return promise.then(() => {
      expect(client.__native.makeCall).to.be.calledOnce;
      const args = client.__native.makeCall.firstCall.args[0];
      expect(args.to).to.equal('1231231234');
      expect(args.foo).to.equal('bar');
    });
  });

  it('should use dry-run number when provided', function() {
    const client = new Client(_.assign({ }, config, { dry: '9879879876' }));
    const params = { foo: 'bar', url: '/status', statusCallback: '/status' };

    client.__native.makeCall = Sinon.spy(function() { });
    const promise = client.call('1231231234', params);

    return promise.then(() => {
      expect(client.__native.makeCall).to.be.calledOnce;
      const args = client.__native.makeCall.firstCall.args[0];
      expect(args.to).to.equal('9879879876');
      expect(args.foo).to.equal('bar');
      expect(args.statusCallback).to.match(/status$/);
    });
  });

  it('should use first dry-run number if multiple are provided', function() {
    const client = new Client(_.assign({ }, config, { dry: ['9879879876', '7657657654' ] }));
    const params = { foo: 'bar', url: '/status', statusCallback: '/status' };

    client.__native.makeCall = Sinon.spy(function() { });
    const promise = client.call('1231231234', params);

    return promise.then(() => {
      expect(client.__native.makeCall).to.be.calledOnce;
      const args = client.__native.makeCall.firstCall.args[0];
      expect(args.to).to.equal('9879879876');
      expect(args.foo).to.equal('bar');
    });
  });

  it('should not initiate a call if dry-run is true', function() {
    const client = new Client(_.assign({ }, config, { dry: true }));
    const params = { foo: 'bar', url: '/status', statusCallback: '/status' };

    client.__native.makeCall = Sinon.spy(function() { });
    const promise = client.call('1231231234', params);

    return promise.then(() => {
      expect(client.__native.makeCall).to.have.callCount(0);
    });
  });

  it('should return rejected promise if something goes wrong', function() {
    const client = new Client(config);
    const params = { foo: 'bar', url: '/status', statusCallback: '/status' };

    client.__native.makeCall = Sinon.spy(() => Bluebird.reject(new Error('Test error')));
    const promise = client.call('1231231234', params);

    expect(promise).to.rejectedWith('Test error');
  });

});


describe('text(2)', function() {

  it('should send texts to all numbers', function() {
    const client = new Client(config);
    const params = { };

    client.__native.sendMessage = Sinon.spy(function() { });
    const promise = client.text([ '1231231234', '9879879876' ], params);

    return promise.then(() => {
      expect(client.__native.sendMessage).to.be.calledTwice;
      expect(client.__native.sendMessage.firstCall.args[0]).to.have.property('to', '1231231234');
      expect(client.__native.sendMessage.secondCall.args[0]).to.have.property('to', '9879879876');
    });
  });

  it('should use dry-run numbers if provided', function() {
    const client = new Client(_.assign({ }, config, { dry: ['9879876789', '7657657654' ] }));
    const params = { };

    client.__native.sendMessage = Sinon.spy(function() { });
    const promise = client.text([ '1231231234', '9879879876' ], params);

    return promise.then(() => {
      expect(client.__native.sendMessage).to.be.calledTwice;
      expect(client.__native.sendMessage.firstCall.args[0]).to.have.property('to', '9879876789');
      expect(client.__native.sendMessage.secondCall.args[0]).to.have.property('to', '7657657654');
    });
  });

  it('should return rejected promise if something goes wrong', function() {
    const client = new Client(config);
    const params = { };

    client.__native.sendMessage = Sinon.spy(() => Bluebird.reject(new Error('Test error')));
    const promise = client.text([ '1231231234', '9879879876' ], params);

    expect(promise).to.rejectedWith('Test error');
  });

});


describe('find(1)', function() {

  it('should find a call', function() {
    const client = new Client(config);

    const call = { get: Sinon.spy(() => Bluebird.resolve('bar')) };
    client.__native.calls = Sinon.spy(() => call);

    const promise = client.find('foo');

    return promise.then(result => {
      expect(result).to.equal('bar');
      expect(call.get).to.be.calledOnce;
      expect(client.__native.calls).to.be.calledOnce.and.to.be.calledWith('foo');
    });
  });

});


describe('update(2)', function() {

  it('should update the call', function() {
    const client = new Client(config);

    const call = { update: Sinon.spy((i, done) => done()) };

    const promise = client.update(call, { foo: 'bar' });

    return promise.then(() => {
      expect(call.update).to.be.calledOnce;
    });
  });

});
