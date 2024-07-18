import test from 'ava';
import chalk from 'chalk';
import sinon from 'sinon';

import * as helpers from './helpers.js';

test('setVerbosity() should return the verbosity set', (t) => {
  t.is(helpers.setVerbosity(), 0);
  t.is(helpers.setVerbosity(0), 0);
  t.is(helpers.setVerbosity(1), 1);
  t.is(helpers.setVerbosity(2), 2);
  t.is(helpers.setVerbosity(), 0);
});

test('stringCompare() should compare strings', (t) => {
  t.is(helpers.stringCompare('a', 'b'), -1);
  t.is(helpers.stringCompare('b', 'a'), 1);
  t.is(helpers.stringCompare('a', 'a'), 0);
});

test('increment() should increment the running total by one', (t) => {
  t.is(helpers.increment('ignored', 0), 1);
  t.is(helpers.increment('ignored', 1), 2);
  t.is(helpers.increment('ignored', 100), 101);
});

test('collect() should accumulate an array', (t) => {
  t.deepEqual(helpers.collect('1', []), ['1']);
  t.deepEqual(helpers.collect('2', ['1']), ['1', '2']);
  t.deepEqual(helpers.collect('foo', ['1', '2', '3', '4']), [
    '1',
    '2',
    '3',
    '4',
    'foo',
  ]);
});

test('asMoment() should parse a valid date', (t) => {
  const date = helpers.asMoment('2019-01-01', 'UTC');
  t.true(date.isValid());
});

test('asMoment() should parse without a timezone', (t) => {
  const date = helpers.asMoment('2019-01-01', '');
  t.true(date.isValid());
});

test('asMoment() should throw on an invalid date', (t) => {
  t.throws(() => helpers.asMoment('BOGUS', 'UTC'), {
    instanceOf: helpers.UserError,
  });
});

const MSG = 'SIMPLE MESSAGE';

test('out() calls the outputter with message', (t) => {
  const outputter = (msg: string) => {
    t.is(msg, MSG);
  };
  helpers.out(MSG, undefined, outputter);
});

test('dbg() should show a simple message', (t) => {
  const outputter = (msg: string) => {
    t.is(msg, chalk.cyan(MSG));
  };
  helpers.dbg(0, MSG, undefined, outputter);
});

test('dbg() does not show a level above current verbosity', (t) => {
  const outputter = sinon.stub();
  helpers.dbg(1, MSG, undefined, outputter);
  t.true(outputter.notCalled);
});

test('dbg() handles a ridiculous level', (t) => {
  const levelPrev = helpers.setVerbosity(999);
  const outputter = (msg: string) => {
    t.is(msg, chalk.gray(MSG));
  };
  helpers.dbg(999, MSG, undefined, outputter);
  helpers.setVerbosity(levelPrev);
});

test('dbg() can show an object as well', (t) => {
  const outputter = (msg: string) => {
    t.is(msg, chalk.cyan(`${MSG}:\n${chalk.gray(`{ KEY: 'VALUE' }`)}`));
  };
  helpers.dbg(0, MSG, { KEY: 'VALUE' }, outputter);
});

test('dbg() with array shows length', (t) => {
  const outputter = (msg: string) => {
    t.is(msg, chalk.cyan(`${MSG} (2):\n${chalk.gray(`[ 'A', 'B' ]`)}`));
  };
  helpers.dbg(0, MSG, ['A', 'B'], outputter);
});

test('err() should show a simple message', (t) => {
  const outputter = (msg: string) => {
    t.is(msg, chalk.red(MSG));
  };
  helpers.err(new Error(MSG), undefined, outputter);
});
