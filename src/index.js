import Client from './client';
import * as events from './events';
import jsonPlugin from './plugins/json';
import jwtPlugin from './plugins/jwt';
import oauthPlugin from './plugins/oauth';
import PluginError from './plugin-error';

export {
  events,
  jsonPlugin,
  jwtPlugin,
  oauthPlugin,
  PluginError,
};

export default Client;
