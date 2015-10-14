/**
 * client.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license MIT
 */

'use strict';

var _bluebird = require('bluebird');

Object.defineProperty(exports, '__esModule', {
  value: true
});
// istanbul ignore next

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

// istanbul ignore next

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

// istanbul ignore next

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// istanbul ignore next

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

// istanbul ignore next

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _twilioLibClient = require('twilio/lib/Client');

var _twilioLibClient2 = _interopRequireDefault(_twilioLibClient);

var _bluebird2 = _interopRequireDefault(_bluebird);

var _monologueJs = require('monologue.js');

var _monologueJs2 = _interopRequireDefault(_monologueJs);

var debug = (0, _debug2['default'])('ignis:twilio:client');

/*!
 * Fake call object template.
 */
var fakeCall = {
  sid: 'fake_call',
  update: function update(i, f) {
    return f();
  }
};

/*!
 * Extended Twilio client with support for dry run.
 */

var Client = (function (_Twilio) {
  _inherits(Client, _Twilio);

  function Client(cfg) {
    _classCallCheck(this, Client);

    _get(Object.getPrototypeOf(Client.prototype), 'constructor', this).call(this, cfg.sid, cfg.token, cfg.apiHost, cfg.version, cfg.timeout);

    /* Hostname for URL resolution */
    this.host = process.env.HOSTNAME || cfg.hostname || 'http://' + _os2['default'].hostname();

    /* Setup host URL */
    var parsed = _url2['default'].parse(this.host);
    if (cfg.auth) {
      parsed.auth = cfg.auth.username + ':' + cfg.auth.password;
    }
    this.host = _url2['default'].format(parsed);

    /* Dry run, which either omits or redirects calls/messages */
    this.config = cfg;
    this.dry = cfg.dry || false;
  }

  /*!
   * Let Client instances emit events.
   */

  /*!
   * Makes a call, respecting the dry run
   */

  _createClass(Client, [{
    key: 'call',
    value: function call(number, params) {
      // istanbul ignore next

      var _this = this;

      /* Substitute with dry-run numbers if specified */
      if (this.dry) {
        params.to = this.dry;
      } else {
        params.to = number;
      }

      /* Initialize default values */
      _lodash2['default'].defaults(params, this.config.call);

      /* Resolve relative URIs */
      params.statusCallback = params.statusCallback ? _url2['default'].resolve(this.host, params.statusCallback) : '';
      params.url = _url2['default'].resolve(this.host, params.url);

      /* Make the call if we actually have destination numbers */
      if (_lodash2['default'].isArray(params.to)) {
        params.to = params.to[0];
      }
      if (params.to && typeof params.to === 'string') {
        return _bluebird2['default'].fromNode(function (done) {
          return _this.makeCall(params, done);
        });
      }

      debug(_chalk2['default'].bold.yellow('[dry-run]') + ' Skipping the call.');
      return _bluebird2['default'].resolve(fakeCall);
    }

    /*!
     * Sends a test message, respecting the dry run
     */
  }, {
    key: 'text',
    value: function text(number, params) {
      // istanbul ignore next

      var _this2 = this;

      /* Substitute with dry-run numbers if specified */
      if (this.dry) {
        number = this.dry;
      }

      /* Set up the message template */
      var template = _lodash2['default'].defaults({ body: params.message }, this.config.text);

      /* Send out messages */
      var promises = _lodash2['default'].chain([number]).flatten().compact().map(function (phone) {
        return _lodash2['default'].assign({ to: phone }, template);
      }).map(function (data) {
        return _bluebird2['default'].fromNode(function (done) {
          return _this2.sendSms(data, done);
        });
      }).value();

      return _bluebird2['default'].all(promises);
    }

    /*!
     * Gets a call's data.
     */
  }, {
    key: 'find',
    value: _bluebird.coroutine(function* (sid) {
      var call = yield this.calls(sid).get();
      return call;
    })

    /*!
     * Updates a call.
     */
  }, {
    key: 'update',
    value: _bluebird.coroutine(function* (call, changes) {
      return _bluebird2['default'].fromNode(function (done) {
        return call.update(changes, done);
      });
    })
  }]);

  return Client;
})(_twilioLibClient2['default']);

exports['default'] = Client;
_monologueJs2['default'].mixInto(Client);
module.exports = exports['default'];
//# sourceMappingURL=client.js.map
