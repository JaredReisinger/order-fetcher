import process from 'node:process';

import test from 'ava';

import main, { Args, Argv } from './cli.js';

const prevArgs = process.argv;

function preventYargsExit(yargs: Argv<Args>) {
  yargs.exitProcess(false);
}

test.beforeEach(() => {
  // set args?
});

test.afterEach(() => {
  process.argv = prevArgs;
});

test('cli main runs the app', async (t) => {
  process.argv = ['', '', '--help'];
  await t.notThrowsAsync(() => main(preventYargsExit));
});
