import Client from './client';
import * as events from './events';
import jsonPlugin from './plugins/json';
import jwtPlugin from './plugins/jwt';
import PluginError from './plugin-error';

export {
  events,
  jsonPlugin,
  jwtPlugin,
  PluginError,
};

export default Client;
