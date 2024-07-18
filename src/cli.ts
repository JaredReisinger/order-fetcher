import path from 'path';
import util from 'util';
import fs from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

import yargsFn, { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';

import { readPackageUp } from 'read-package-up';

import * as commands from './commands/index.js';
import { dbg, err, setVerbosity, UserError } from './helpers.js';
import { ConfigFile } from './commands/config.js';

const readFileAsync = util.promisify(fs.readFile);

interface Args {
  verbose?: number;
}

// You can't use 'await' outside of an 'async' function... so you have to use
// .then()/.catch() at the top level.
main().catch((e) => {
  err(e);
  if (!(e instanceof UserError) && e.stack) {
    err(e.stack, chalk.white);
  }
  process.exit(1);
});

async function main() {
  const cfg = await loadConfig();

  const yargs = yargsFn(hideBin(process.argv)) as Argv<Args>;

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
  dbg(5, 'commands', { cmds });
  // NOTE: the Typescript casting here is gross... not sure how to tell yargs
  // about arguments that come from sub-commands, and when that's okay, etc.
  cmds.forEach((cmd) => yargs.command(cmd as CommandModule<Args, Args>));

  if (process.stdout.isTTY) {
    // We could allow arbitrarily wide help output, but it looks pretty bad
    // beyond 120 characters.
    yargs.wrap(Math.min(process.stdout.columns, 120));
  }

  await yargs
    .strict()
    .fail((msg, errObj) => {
      err(msg || errObj);
      if (errObj && !(errObj instanceof UserError) && errObj.stack) {
        err(errObj.stack, chalk.white);
      }
      process.exit(1);
    })
    .parse();
}

async function loadConfig(): Promise<ConfigFile> {
  const pkgLoc = fileURLToPath(import.meta.url);
  const pkgInfo = await readPackageUp({ cwd: pkgLoc });
  const filename = path.join(
    process.env.HOME ?? '.',
    `.${pkgInfo?.packageJson.name}.json`
  );
  // can't really use dbg() since this is called *before* parsing options!
  // dbg(0, 'checking for config', { filename });
  try {
    const data = await readFileAsync(filename);
    const cfg = JSON.parse(data.toString()) as ConfigFile;
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

function handleGlobalOpts(argv: ArgumentsCamelCase<Args>) {
  dbg(2, 'handle global opts', argv);
  if (argv instanceof Object && 'verbose' in argv)
    setVerbosity(argv['verbose']);
}
