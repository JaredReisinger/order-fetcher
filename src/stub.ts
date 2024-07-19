#!/usr/bin/env node
import chalk from 'chalk';

import { err, UserError } from './helpers.js';
import main from './cli.js';

try {
  await main();
} catch (e) {
  if (e instanceof Error || typeof e === 'string') {
    err(e);
  } else {
    err(`unexpected error: ${typeof e}`);
  }

  if (!(e instanceof UserError) && typeof e === 'object' && e && 'stack' in e) {
    err(String(e.stack), chalk.white);
  }

  process.exit(1);
}
