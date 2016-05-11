import Client from './client';
import * as events from './events';
import jwtPlugin from './plugins/jwt';
import PluginError from './plugin-error';

export {
  events,
  jwtPlugin,
  PluginError,
};

export default Client;
