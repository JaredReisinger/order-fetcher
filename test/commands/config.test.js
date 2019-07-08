import 'chai/register-should';
import sinon from 'sinon';
import inquirer from 'inquirer';

import Config from '../../lib/commands/config';

describe('command - config', async () => {
  let config;

  beforeEach(() => {
    config = new Config(
      {
        hosts: {
          foo: {
            url: 'FOO.URL',
            key: 'FOO.KEY',
            secret: 'FOO.SECRET',
          },
        },
      },
      () => {}
    );
  });

  describe('createCommands()', () => {
    it('should return a Promise', async () => {
      const result = config.createCommands();
      result.should.be.a('promise');
      await result;
    });
  });

  describe('view()', () => {
    it('should return a Promise', async () => {
      const result = config.view();
      result.should.be.a('promise');
      await result;
    });
  });

  describe('init()', () => {
    it('should return a Promise', async () => {
      const prompt = sinon
        .stub(inquirer, 'prompt')
        .resolves({ overwrite: false });

      const result = config.init();
      result.should.be.a('promise');
      await result;

      prompt.restore();
    });

    it('should write config from answers', async () => {
      const configMissing = new Config(
        {
          _missing: true,
          hosts: {},
        },
        () => {}
      );

      const prompt = sinon.stub(inquirer, 'prompt').resolves({
        host: {
          name: 'HOST.NAME',
          secure: false,
          url: 'HOST.URL',
          key: 'HOST.KEY',
          secret: 'HOST.SECRET',
        },
        timezone: 'TIMEZONE',
      });

      const write = sinon.stub(configMissing, 'writeConfig').resolves(false);

      const result = configMissing.init();
      result.should.be.a('promise');
      await result;

      write.args[0][0].should.deep.equal({
        hosts: {
          'HOST.NAME': {
            url: 'HOST.URL',
            key: 'HOST.KEY',
            secret: 'HOST.SECRET',
          },
        },
        timezone: 'TIMEZONE',
      });

      write.restore();
      prompt.restore();
    });
  });

  describe('add()', () => {
    it('should add a new host', async () => {
      const prompt = sinon.stub(inquirer, 'prompt').resolves({
        host: {
          name: 'HOST.NAME',
          secure: false,
          url: 'HOST.URL',
          key: 'HOST.KEY',
          secret: 'HOST.SECRET',
        },
      });

      const write = sinon.stub(config, 'writeConfig').resolves(false);

      const result = config.add({});
      result.should.be.a('promise');
      await result;

      write.args[0][0].should.deep.equal({
        hosts: {
          foo: {
            url: 'FOO.URL',
            key: 'FOO.KEY',
            secret: 'FOO.SECRET',
          },
          'HOST.NAME': {
            url: 'HOST.URL',
            key: 'HOST.KEY',
            secret: 'HOST.SECRET',
          },
        },
      });

      write.restore();
      prompt.restore();
    });
  });

  describe('remove()', () => {
    it('should remove a host', async () => {
      const write = sinon.stub(config, 'writeConfig').resolves(false);

      const result = config.remove({ host: 'foo' });
      result.should.be.a('promise');
      await result;

      write.args[0][0].should.deep.equal({
        hosts: {},
      });

      write.restore();
    });
  });

  describe('timezone()', () => {
    it('should write the timezone', async () => {
      const prompt = sinon.stub(inquirer, 'prompt').resolves({
        timezone: 'TIMEZONE',
      });

      const write = sinon.stub(config, 'writeConfig').resolves(false);

      const result = config.timezone({});
      result.should.be.a('promise');
      await result;

      write.args[0][0].should.deep.equal({
        hosts: {
          foo: {
            url: 'FOO.URL',
            key: 'FOO.KEY',
            secret: 'FOO.SECRET',
          },
        },
        timezone: 'TIMEZONE',
      });

      write.restore();
      prompt.restore();
    });
  });
});
