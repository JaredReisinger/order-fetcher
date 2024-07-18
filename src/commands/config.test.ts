import test from 'ava';
import sinon from 'sinon';
import { ArgumentsCamelCase } from 'yargs';
import yargs from 'yargs/yargs';
import { Context } from '@inquirer/type';

import Config, { type Args } from './config.js';

// BEGIN STOLEN FROM @inquirer/testing render...
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import { Stream } from 'node:stream';
import MuteStream from 'mute-stream';
import stripAnsi from 'strip-ansi';
import ansiEscapes from 'ansi-escapes';

const ignoredAnsi = new Set([ansiEscapes.cursorHide, ansiEscapes.cursorShow]);

class BufferedStream extends Stream.Writable {
  #_fullOutput = '';
  #_chunks: string[] = [];
  #_rawChunks: string[] = [];

  _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    const str: string = chunk.toString();

    this.#_fullOutput += str;

    // There's some ANSI Inquirer just send to keep state of the terminal clear;
    // we'll ignore those since they're unlikely to be used by end users or part
    // of prompt code.
    if (!ignoredAnsi.has(str)) {
      this.#_rawChunks.push(str);
    }

    // Stripping the ANSI codes here because Inquirer will push commands ANSI
    // (like cursor move.) This is probably fine since we don't care about those
    // for testing; but this could become an issue if we ever want to test for
    // those.
    if (stripAnsi(str).trim().length > 0) {
      this.#_chunks.push(str);
    }

    callback();
  }

  // CHANGE FROM @inquirer/testing: override end() so that output can be used
  // across multiple prompts.
  end() {
    this.#_chunks = [];
    this.#_rawChunks = [];
    return this;
  }

  getLastChunk({ raw }: { raw?: boolean }) {
    const chunks = raw ? this.#_rawChunks : this.#_chunks;
    const lastChunk = chunks.at(-1);
    return lastChunk ?? '';
  }

  getFullOutput() {
    return this.#_fullOutput;
  }
}
// END STOLEN FROM @inquirer/testing render...

/**
 * A work-alike for `@inquirer/testing`'s `render()` that works with more than
 * one prompt at a time... like render, though, the called entrypoint needs to
 * take an input/output context option.
 */
type MultiPrompt<Ret, Arg = ArgumentsCamelCase<Args>> = (
  argv?: Arg,
  context?: Context
) => Promise<Ret>;

async function multiRender<Ret, Arg>(
  multiPrompt: MultiPrompt<Ret, Arg>,
  argv?: Arg
) {
  const input = new MuteStream();
  input.unmute();

  const output = new BufferedStream();

  const answer = multiPrompt(argv, { input, output });

  // wait for event listeners to be ready
  await Promise.resolve();
  await Promise.resolve();

  const events = {
    keypress(
      key:
        | string
        | {
            name?: string | undefined;
            ctrl?: boolean | undefined;
            meta?: boolean | undefined;
            shift?: boolean | undefined;
          }
    ) {
      if (typeof key === 'string') {
        input.emit('keypress', null, { name: key });
      } else {
        input.emit('keypress', null, key);
      }
    },

    type(text: string) {
      input.write(text);
      for (const char of text) {
        input.emit('keypress', null, { name: char });
      }
    },

    async wait() {
      // You would think a single await would suffice, but it seems that we
      // sometimes still get failures.  Awaiting twice seems to fix it.
      await setTimeoutPromise(10);
      await setTimeoutPromise(10);
    },
  };

  return {
    answer,
    input,
    events,
    getScreen({ raw }: { raw?: boolean } = {}) {
      const lastScreen = output.getLastChunk({ raw });
      return raw ? lastScreen : stripAnsi(lastScreen).trim();
    },
    getFullOutput() {
      return output.getFullOutput();
    },
  };
}

function createConfig(timezone?: string) {
  return new Config(
    {
      timezone,
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

test('Config.createCommands()[0].builder should succeed', async (t) => {
  const config = createConfig();
  const result = await config.createCommands();

  t.is(result.length, 1);

  t.truthy(result[0].builder);

  t.notThrows(() => {
    if (result[0].builder instanceof Function) {
      result[0].builder(yargs([]));
    }
  });
});

test('Config.view() should return a Promise', async (t) => {
  const config = createConfig();
  const result = config.view();
  t.true(result instanceof Promise);
  await t.notThrowsAsync(result);
});

test('Config.view() should return a Promise (with timezone)', async (t) => {
  const config = createConfig('UTC');
  const result = config.view();
  t.true(result instanceof Promise);
  await t.notThrowsAsync(result);
});

test('Config.view() handles a missing config', async (t) => {
  const config = new Config({ _missing: true, hosts: {} }, () => {});
  const result = config.view();
  await t.notThrowsAsync(result);
});

test('Config.init() should return a Promise', async (t) => {
  const config = createConfig();
  t.truthy(config);

  const { answer, /*input,*/ events, getScreen } = await multiRender(
    config.init.bind(config)
  );

  t.true(answer instanceof Promise);

  t.is(
    getScreen(),
    '? Do you want to overwrite the existing configuration? (y/N)'
  );
  events.keypress('enter');
  await events.wait();

  await answer;
});

test('Config.init() should write config from answers', async (t) => {
  const configMissing = new Config(
    {
      _missing: true,
      hosts: {},
    },
    () => {}
  );

  const write = sinon.stub(configMissing, 'writeConfig').resolves();

  const { answer, /*input,*/ events, getScreen } = await multiRender(
    configMissing.init.bind(configMissing)
  );

  t.true(answer instanceof Promise);

  t.is(getScreen(), '? What is the nickname for your WooCommerce site?');
  events.type('NAME');
  events.keypress('enter');
  await events.wait();

  t.is(getScreen(), '? Is the site for NAME secure (uses https)? (Y/n)');
  events.keypress('enter');
  await events.wait();

  t.is(getScreen(), '? What is the URL for NAME? https://NAME.com');
  events.type('https://NAME.com');
  events.keypress('enter');
  await events.wait();

  t.truthy(getScreen().startsWith('? What is the WooCommerce key for NAME?'));
  events.type('MAGIC_KEY');
  events.keypress('enter');
  await events.wait();

  t.is(getScreen(), '? What is the WooCommerce secret for NAME?');
  events.type('MAGIC_SECRET');
  events.keypress('enter');
  await events.wait();

  t.truthy(getScreen().startsWith('? What timezone do you want to use?'));
  events.type('America/Los_Angeles');
  events.keypress('enter');
  await events.wait();

  await answer;

  t.is(write.callCount, 1);
  t.deepEqual(write.getCall(0).firstArg, {
    hosts: {
      NAME: {
        key: 'MAGIC_KEY',
        secret: 'MAGIC_SECRET',
        url: 'https://NAME.com',
      },
    },
    timezone: 'America/Los_Angeles',
  });

  write.restore();
});

test('Config.add() should add a new host', async (t) => {
  const config = createConfig();

  const write = sinon.stub(config, 'writeConfig').resolves();

  const { answer, /*input,*/ events, getScreen } = await multiRender(
    config.add.bind(config)
  );

  t.true(answer instanceof Promise);

  t.is(getScreen(), '? What is the nickname for your WooCommerce site?');
  events.type('NAME');
  events.keypress('enter');
  await events.wait();

  t.is(getScreen(), '? Is the site for NAME secure (uses https)? (Y/n)');
  events.keypress('enter');
  await events.wait();

  t.is(getScreen(), '? What is the URL for NAME? https://NAME.com');
  events.type('https://NAME.com');
  events.keypress('enter');
  await events.wait();

  t.truthy(getScreen().startsWith('? What is the WooCommerce key for NAME?'));
  events.type('MAGIC_KEY');
  events.keypress('enter');
  await events.wait();

  t.is(getScreen(), '? What is the WooCommerce secret for NAME?');
  events.type('MAGIC_SECRET');
  events.keypress('enter');
  await events.wait();

  // t.truthy(getScreen().startsWith('? What timezone do you want to use?'));
  // events.type('America/Los_Angeles');
  // events.keypress('enter');
  // await events.wait();

  await answer;

  t.is(write.callCount, 1);
  t.like(write.getCall(0).firstArg, {
    hosts: {
      foo: {
        key: 'FOO.KEY',
        secret: 'FOO.SECRET',
        url: 'FOO.URL',
      },
      NAME: {
        key: 'MAGIC_KEY',
        secret: 'MAGIC_SECRET',
        url: 'https://NAME.com',
      },
    },
    // timezone: 'America/Los_Angeles',
  });

  write.restore();
});

test('Config.remove() should remove a host', async (t) => {
  const config = createConfig();

  const write = sinon.stub(config, 'writeConfig').resolves();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake args... really need to figure out yargs types...
  const result = config.remove({ host: 'foo' });
  t.true(result instanceof Promise);
  await t.notThrowsAsync(result);

  t.deepEqual(write.args[0][0], {
    timezone: undefined,
    hosts: {},
  });

  write.restore();
});

test('Config.remove() without host should fail', async (t) => {
  const config = createConfig();

  const write = sinon.stub(config, 'writeConfig').resolves();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake args... really need to figure out yargs types...
  const result = config.remove({});
  t.true(result instanceof Promise);
  await t.throwsAsync(result);

  write.restore();
});

test('Config.timezone() should write the timezone', async (t) => {
  const config = createConfig();

  const write = sinon.stub(config, 'writeConfig').resolves();

  const { answer, /*input,*/ events, getScreen } = await multiRender(
    config.timezone.bind(config)
  );

  t.true(answer instanceof Promise);

  t.truthy(getScreen().startsWith('? What timezone do you want to use?'));
  events.type('America/Los_Angeles');
  events.keypress('enter');
  await events.wait();

  await answer;

  t.is(write.callCount, 1);
  t.like(write.getCall(0).firstArg, {
    timezone: 'America/Los_Angeles',
  });

  write.restore();
});

// New inquirer UI requires testing that doesn't exist yet.

// test('Config.hostQuestions() should ask for a name when not provided', (t) => {
//   // render(Config.hostQuestions, {})
//   const result = Config.hostQuestions();
//   const question = result.find((q) => q.name === 'host.name');
//   t.not(question?.type, 'nop');
// });

// test('Config.hostQuestions() should *not* ask for a name when provided', (t) => {
//   const result = Config.hostQuestions('HOST');
//   const question = result.find((q) => q.name === 'host.name');
//   t.is(question?.type, 'nop');
// });

test('Config.timezoneQuestions() should ask for a timezone when not provided', async (t) => {
  const { answer, /*input,*/ events, getScreen } = await multiRender(
    Config.timezoneQuestions
  );

  t.true(answer instanceof Promise);

  t.truthy(getScreen().startsWith('? What timezone do you want to use?'));
  events.keypress('enter');
  await events.wait();

  await answer;
});

test('Config.timezoneQuestions() should *not* ask for a timezone when provided a valid one', async (t) => {
  const { answer, /*input,*/ /*events,*/ getScreen } = await multiRender(
    Config.timezoneQuestions,
    'UTC'
  );

  t.true(answer instanceof Promise);

  t.is(getScreen(), '');

  await answer;
});

test('Config.timezoneQuestions() should ask for a timezone when provided an invalid one', async (t) => {
  const { answer, /*input,*/ events, getScreen } = await multiRender(
    Config.timezoneQuestions,
    'BOGUS'
  );

  t.true(answer instanceof Promise);

  t.truthy(getScreen().startsWith('? What timezone do you want to use?'));
  events.keypress('enter');
  await events.wait();

  await answer;
});
