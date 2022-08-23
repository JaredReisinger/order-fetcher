import test from 'ava';

// import 'chai/register-should';
import * as helpers from './helpers.js';

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

test('asMoment() should throw on an invalid date', (t) => {
  t.throws(() => helpers.asMoment('BOGUS', 'UTC'), {
    instanceOf: helpers.UserError,
  });
});
