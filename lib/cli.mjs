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
main().catch(e => {
  helpers.err(e);
  if (e.stack) {
    helpers.err(e.stack, chalk.white);
  }
  process.exit(1);
});

async function main() {
  const cfg = await loadConfig();

  // options used in common for most commands...
  yargs
    .usage('Usage: $0 [command...]')
    .option('host', {
      describe: 'Connect to the given host',
      choices: Object.keys(cfg.hosts),
      required: true,
    })
    .option('after', {
      describe: 'Include only orders after the given date (inclusive)',
      coerce: helpers.asMoment,
    })
    .option('before', {
      describe: 'Include only orders before the given date (inclusive?)',
      coerce: helpers.asMoment,
    })
    .option('verbose', {
      alias: 'v',
      describe:
        'Increase verbosity of console output, can be given multiple times to increase verbosity',
      count: true,
    })
    .group(
      ['help', 'version', 'host', 'after', 'before', 'verbose'],
      'Global Options'
    );

  const cmds = await commands.createCommands(cfg, handleGlobalOpts);
  helpers.dbg(5, 'commands', { cmds });
  cmds.forEach(cmd => yargs.command(cmd));

  if (process.stdout.isTTY) {
    yargs.wrap(process.stdout.columns);
  }

  await yargs
    .strict()
    .fail((msg, err) => {
      helpers.err(msg || err);
      process.exit(1);
    })
    .parse();
}

async function loadConfig() {
  try {
    const data = await readFileAsync(
      path.join(process.env.HOME, `.${pkgInfo.name}.json`)
    );
    return JSON.parse(data);
  } catch (e) {
    // We *could* check the error code for errno -2 (ENOENT), but really
    // any failure means we should have the default config...
    // console.error(e);
    return {
      hosts: {},
    };
  }
}

function handleGlobalOpts(argv) {
  helpers.dbg(2, 'handle global opts', argv);
  helpers.setVerbosity(argv.verbose);
}
