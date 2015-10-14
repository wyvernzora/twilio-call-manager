/**
 * manager.js
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

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _client = require('./client');

var _client2 = _interopRequireDefault(_client);

var debug = (0, _debug2['default'])('ignis:twilio:manager');

var CallManager = (function (_Client) {
  _inherits(CallManager, _Client);

  function CallManager(cfg) {
    _classCallCheck(this, CallManager);

    _get(Object.getPrototypeOf(CallManager.prototype), 'constructor', this).call(this, cfg);

    /* Object to store call data */
    this.calls = Object.create(null);
  }

  /*!
   * Spawn a call.
   */

  _createClass(CallManager, [{
    key: 'spawn',
    value: _bluebird.coroutine(function* (number, params, data) {
      // istanbul ignore next

      var _this = this;

      params.to = number;

      /* Find existing call information for the phone */
      var info = this.calls[number] || { failed: 0 };

      /* Setup default call info parameters */
      var defaults = { to: number, active: true, delay: undefined };
      this.calls[number] = _lodash2['default'].assign(info, defaults);

      /* Spawn the call and record its SID */
      info.call = yield this.call(number, params);

      /* Set a timeout to hang up the call */
      if (info.call && this.config.timeout) {
        info.timeout = setTimeout(function () {
          _this.update(info.call, { status: 'completed' });
        }, this.config.timeout * 1000);
      }

      /* Also, emit the call start event */
      this.emit('start', { call: info, data: data });
      return info;
    })

    /*!
     * Report end of the call.
     */
  }, {
    key: 'finished',
    value: function finished(number, params, data) {

      /* Find existing call information for the phone number */
      var info = this.calls[number];

      /* Ignore if there is no such active call */
      if (!info || !info.active) {
        debug(_chalk2['default'].bold.red('ERROR') + ' Phone number has no active calls.');
        return;
      }

      /* Ignore if reported SID does not match the one we are waiting for. */
      if (info.call.sid !== params.CallSid) {
        debug(_chalk2['default'].bold.red('ERROR   ') + ' Call SID mismatch: ' + info.call.sid + ' vs ' + params.CallSid);
        return;
      }

      /* Emit call finished event depending on call status */
      switch (params.CallStatus) {
        case 'completed':
          this.emit('success', { call: info, data: data });
          this.calls[number] = { failed: 0, active: false };
          break;
        case 'busy':
        case 'failed':
        case 'canceled':
        case 'no-answer':
          info.delay = (0, _moment2['default'])().add(this.config.retryDelay, 'seconds');
          info.active = false;
          info.failed++;
          this.emit('failed', { call: info, data: data });
          break;
        default:
          debug(_chalk2['default'].bold.red('ERROR   ') + ' Unexpected call status ' + params.CallStatus);
      }

      /* Clear timeout and call data */
      clearTimeout(info.timeout);
    }

    /*!
     * Gets an array of phone numbers with active calls.
     */
  }, {
    key: 'getActivePhones',
    value: function getActivePhones() {
      debug('Managing ' + Object.keys(this.calls).length + ' entries');

      return _lodash2['default'].chain(this.calls).values().filter(function (call) {
        return call.active || (0, _moment2['default'])().isBefore(call.delay);
      }).pluck('to').value();
    }
  }]);

  return CallManager;
})(_client2['default']);

exports['default'] = CallManager;
module.exports = exports['default'];
//# sourceMappingURL=manager.js.map
