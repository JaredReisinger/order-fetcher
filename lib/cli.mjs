import path from 'path';
import util from 'util';
import fs from 'fs';
import chalk from 'chalk';

import yargs from 'yargs';

import * as commands from './commands';
import * as helpers from './helpers';

import pkgInfo from '../package.json';

const readFileAsync = util.promisify(fs.readFile);

// You can't use 'await' outside of an 'async' function... so you have to use
// .then()/.catch() at the top level.
main().catch((e) => {
  helpers.err(e);
  if (!(e instanceof helpers.UserError) && e.stack) {
    helpers.err(e.stack, chalk.white);
  }
  process.exit(1);
});

async function main() {
  const cfg = await loadConfig();

  // options used in common for most commands...
  yargs
    .usage('Usage: $0 [command...]')
    .option('verbose', {
      alias: 'v',
      describe:
        'Increase verbosity of console output, can be given multiple times to increase verbosity',
      count: true,
    })
    .group(['help', 'version', 'verbose'], 'Global Options');

  const cmds = await commands.createCommands(cfg, handleGlobalOpts);
  helpers.dbg(5, 'commands', { cmds });
  cmds.forEach((cmd) => yargs.command(cmd));

  if (process.stdout.isTTY) {
    // We could allow arbitrarily wide help output, but it looks pretty bad
    // beyond 120 characters.
    yargs.wrap(Math.min(process.stdout.columns, 120));
  }

  await yargs
    .strict()
    .fail((msg, err) => {
      helpers.err(msg || err);
      if (err && !(err instanceof helpers.UserError) && err.stack) {
        helpers.err(err.stack, chalk.white);
      }
      process.exit(1);
    })
    .parse();
}

async function loadConfig() {
  const filename = path.join(process.env.HOME, `.${pkgInfo.name}.json`);
  try {
    const data = await readFileAsync(filename);
    const cfg = JSON.parse(data);
    cfg._filename = filename;
    return cfg;
  } catch (e) {
    // We *could* check the error code for errno -2 (ENOENT), but really
    // any failure means we should have the default config...
    // console.error(e);
    return {
      _filename: filename,
      _missing: true,
      hosts: {},
    };
  }
}

function handleGlobalOpts(argv) {
  helpers.dbg(2, 'handle global opts', argv);
  helpers.setVerbosity(argv.verbose);
}
