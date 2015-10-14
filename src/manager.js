/**
 * manager.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license MIT
 */

import _           from 'lodash';
import Chalk       from 'chalk';
import Debug       from 'debug';
import Moment      from 'moment';
import Client      from './client';

const debug = Debug('ignis:twilio:manager');


export default class CallManager extends Client {

  constructor(cfg) {
    super(cfg);

    /* Object to store call data */
    this.calls = Object.create(null);
  }


  /*!
   * Spawn a call.
   */
  async spawn(number, params, data) {
    params.to = number;

    /* Find existing call information for the phone */
    const info = this.calls[number] || { failed: 0 };

    /* Setup default call info parameters */
    const defaults = { to: number, active: true, delay: undefined };
    this.calls[number] = _.assign(info, defaults);

    /* Spawn the call and record its SID */
    info.call = await this.call(number, params);

    /* Set a timeout to hang up the call */
    if (info.call && this.config.timeout) {
      info.timeout = setTimeout(() => {
        this.update(info.call, { status: 'completed' });
      }, this.config.timeout * 1000);
    }

    /* Also, emit the call start event */
    this.emit('start', { call: info, data: data });
    return info;
  }


  /*!
   * Report end of the call.
   */
  finished(number, params, data) {

    /* Find existing call information for the phone number */
    const info = this.calls[number];

    /* Ignore if there is no such active call */
    if (!info || !info.active) {
      debug(`${Chalk.bold.red('ERROR')} Phone number has no active calls.`);
      return;
    }

    /* Ignore if reported SID does not match the one we are waiting for. */
    if (info.call.sid !== params.CallSid) {
      debug(`${Chalk.bold.red('ERROR   ')} Call SID mismatch: ${info.call.sid} vs ${params.CallSid}`);
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
      info.delay = Moment().add(this.config.retryDelay, 'seconds');
      info.active = false;
      info.failed++;
      this.emit('failed', { call: info, data: data });
      break;
    default:
      debug(`${Chalk.bold.red('ERROR   ')} Unexpected call status ${params.CallStatus}`);
    }

    /* Clear timeout and call data */
    clearTimeout(info.timeout);
  }


  /*!
   * Gets an array of phone numbers with active calls.
   */
  getActivePhones() {
    debug(`Managing ${Object.keys(this.calls).length} entries`);

    return _
      .chain(this.calls)
      .values()
      .filter(call => call.active || Moment().isBefore(call.delay))
      .pluck('to')
      .value();
  }


}
