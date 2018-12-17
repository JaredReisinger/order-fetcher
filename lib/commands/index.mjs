// import * as init from './init';
// import * as config from './config';
// import * as get from './get';
import Get from './get';

// import * as helpers from '../helpers';

export async function createCommands(cfg, handleGlobalOpts) {
  const get = new Get(cfg, handleGlobalOpts);
  return [await get.createCommand()];
}
