import 'chai/register-should';

import * as index from '../../lib/commands';

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

describe('command - index', async () => {
  describe('createCommands()', () => {
    it('should return a Promise', async () => {
      const result = index.createCommands(cfg, handleGlobalOpts);
      result.should.be.a('promise');
      await result;
    });
  });
});
