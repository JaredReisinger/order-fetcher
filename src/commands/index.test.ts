import test from 'ava';
import * as index from './index.js';

const cfg = {
  hosts: {
    foo: {
      url: 'FOO.URL',
      key: 'FOO.KEY',
      secret: 'FOO.SECRET',
    },
  },
};

const handleGlobalOpts = () => {};

test('commands/index createCommands() should return a Promise', async (t) => {
  const result = index.createCommands(cfg, handleGlobalOpts);
  t.true(result instanceof Promise);
  await result;
});
