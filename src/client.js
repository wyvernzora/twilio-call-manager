/**
 * client.js
 *
 * @author  Denis Luchkin-Zhou <denis@ricepo.com>
 * @license MIT
 */

import _           from 'lodash';
import OS          from 'os';
import URL         from 'url';
import Chalk       from 'chalk';
import Debug       from 'debug';
import Twilio      from 'twilio/lib/Client';
import Bluebird    from 'bluebird';
import Monologue   from 'monologue.js';

const debug = Debug('ignis:twilio:client');


/*!
 * Fake call object template.
 */
const fakeCall = {
  sid: 'fake_call',
  update: (i, f) => f()
};

/*!
 * Extended Twilio client with support for dry run.
 */
export default class Client extends Twilio {

  constructor(cfg) {
    super(cfg.sid, cfg.token, cfg.apiHost, cfg.version, cfg.timeout);

    /* Hostname for URL resolution */
    this.host = process.env.HOSTNAME || cfg.hostname || 'http://' + OS.hostname();

    /* Setup host URL */
    const parsed = URL.parse(this.host);
    if (cfg.auth) {
      parsed.auth = `${cfg.auth.username}:${cfg.auth.password}`;
    }
    this.host = URL.format(parsed);

    /* Dry run, which either omits or redirects calls/messages */
    this.config = cfg;
    this.dry = cfg.dry || false;
  }


  /*!
   * Makes a call, respecting the dry run
   */
  call(number, params) {

    /* Substitute with dry-run numbers if specified */
    if (this.dry) {
      params.to = this.dry;
    } else {
      params.to = number;
    }

    /* Initialize default values */
    _.defaults(params, this.config.call);

    /* Resolve relative URIs */
    params.statusCallback = params.statusCallback ?
      URL.resolve(this.host, params.statusCallback) : '';
    params.url = URL.resolve(this.host, params.url);

    /* Make the call if we actually have destination numbers */
    if (_.isArray(params.to)) { params.to = params.to[0]; }
    if (params.to && typeof params.to === 'string') {
      return Bluebird.fromNode(done => this.makeCall(params, done));
    }

    debug(`${Chalk.bold.yellow('[dry-run]')} Skipping the call.`);
    return Bluebird.resolve(fakeCall);
  }


  /*!
   * Sends a test message, respecting the dry run
   */
  text(number, params) {

    /* Substitute with dry-run numbers if specified */
    if (this.dry) { number = this.dry; }

    /* Set up the message template */
    const template = _.defaults({ body: params.message }, this.config.text);

    /* Send out messages */
    const promises = _
      .chain([number])
      .flatten()
      .compact()
      .map(phone => _.assign({ to: phone }, template))
      .map(data => Bluebird.fromNode(done => this.sendSms(data, done)))
      .value();

    return Bluebird.all(promises);
  }


  /*!
   * Gets a call's data.
   */
  async find(sid) {
    const call = await this.calls(sid).get();
    return call;
  }


  /*!
   * Updates a call.
   */
  async update(call, changes) {
    return Bluebird.fromNode(done => call.update(changes, done));
  }


}


/*!
 * Let Client instances emit events.
 */
Monologue.mixInto(Client);
