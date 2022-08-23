import test from 'ava';
// import 'chai/register-should';
import sinon from 'sinon';

import Config from './config.js';

function createConfig() {
  return new Config(
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
}

test('Config.createCommands() should return a Promise', async (t) => {
  const config = createConfig();
  const result = config.createCommands();
  t.true(result instanceof Promise);
  await result;
});

test('Config.view() should return a Promise', async (t) => {
  const config = createConfig();
  const result = config.view();
  t.true(result instanceof Promise);
  await result;
});

test('Config.init() should return a Promise', async (t) => {
  const config = createConfig();

  const prompt = sinon.stub().resolves({ overwrite: false });

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake empty args
  const result = config.init({}, prompt);
  t.true(result instanceof Promise);
  await result;

  // prompt.restore();
});

test('Config.init() should write config from answers', async (t) => {
  const configMissing = new Config(
    {
      _missing: true,
      hosts: {},
    },
    () => {}
  );

  const prompt = sinon.stub().resolves({
    host: {
      name: 'HOST.NAME',
      secure: false,
      url: 'HOST.URL',
      key: 'HOST.KEY',
      secret: 'HOST.SECRET',
    },
    timezone: 'TIMEZONE',
  });

  const write = sinon.stub(configMissing, 'writeConfig').resolves();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake empty args
  const result = configMissing.init({}, prompt);
  t.true(result instanceof Promise);
  await result;

  t.deepEqual(write.args[0][0], {
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
  // prompt.restore();
});

test('Config.add() should add a new host', async (t) => {
  const config = createConfig();
  const prompt = sinon.stub().resolves({
    host: {
      name: 'HOST.NAME',
      secure: false,
      url: 'HOST.URL',
      key: 'HOST.KEY',
      secret: 'HOST.SECRET',
    },
  });

  const write = sinon.stub(config, 'writeConfig').resolves();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake empty args
  const result = config.add({}, prompt);
  t.true(result instanceof Promise);
  await result;

  t.deepEqual(write.args[0][0], {
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
  // prompt.restore();
});

test('Config.remove() should remove a host', async (t) => {
  const config = createConfig();

  const write = sinon.stub(config, 'writeConfig').resolves();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake args... really need to figure out yargs types...
  const result = config.remove({ host: 'foo' });
  t.true(result instanceof Promise);
  await result;

  t.deepEqual(write.args[0][0], {
    hosts: {},
  });

  write.restore();
});

test('Config.timezone() should write the timezone', async (t) => {
  const config = createConfig();
  const prompt = sinon.stub().resolves({
    timezone: 'TIMEZONE',
  });

  const write = sinon.stub(config, 'writeConfig').resolves();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake args... really need to figure out yargs types...
  const result = config.timezone({}, prompt);
  t.true(result instanceof Promise);
  await result;

  t.deepEqual(write.args[0][0], {
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
  // prompt.restore();
});

test('Config.hostQuestions() should ask for a name when not provided', (t) => {
  const result = Config.hostQuestions();
  const question = result.find((q) => q.name === 'host.name');
  t.not(question?.type, 'nop');
});

test('Config.hostQuestions() should *not* ask for a name when provided', (t) => {
  const result = Config.hostQuestions('HOST');
  const question = result.find((q) => q.name === 'host.name');
  t.is(question?.type, 'nop');
});

test('Config.timezoneQuestions() should ask for a timezone when not provided', (t) => {
  const result = Config.timezoneQuestions();
  const question = result.find((q) => q.name === 'timezone');
  t.not(question?.type, 'nop');
});

test('Config.timezoneQuestions() should *not* ask for a timezone when provided a valid one', (t) => {
  const result = Config.timezoneQuestions('UTC');
  const question = result.find((q) => q.name === 'timezone');
  t.is(question?.type, 'nop');
});

test('Config.timezoneQuestions() should ask for a timezone when provided an invalid one', (t) => {
  const result = Config.timezoneQuestions('BOGUS');
  const question = result.find((q) => q.name === 'timezone');
  t.not(question?.type, 'nop');
});