import test from 'ava';
import * as wcutils from './wcutils.js';

test('wcutils normalizePhone() should convert special "no value" sentinels to "(none)"', (t) => {
  t.is(wcutils.normalizePhone('none'), '(none)');
  t.is(wcutils.normalizePhone('na'), '(none)');
  t.is(wcutils.normalizePhone('n/a'), '(none)');
  t.is(wcutils.normalizePhone('no fax'), '(none)');
  t.is(wcutils.normalizePhone('x'), '(none)');
  t.is(wcutils.normalizePhone('xx'), '(none)');
  t.is(wcutils.normalizePhone('xxx'), '(none)');
  t.is(wcutils.normalizePhone(''), '(none)');
  t.is(wcutils.normalizePhone(' '), '(none)');
  t.is(wcutils.normalizePhone('  '), '(none)');
});

test('wcutils normalizePhone() should remove non-numeric characters for standard lengths', (t) => {
  t.is(wcutils.normalizePhone('123abc4567'), '123-4567');
  t.is(wcutils.normalizePhone('123abc4567xyz890'), '(123) 456-7890');
});

test('wcutils normalizePhone() should leave untouched for unrecognized lengths', (t) => {
  t.is(wcutils.normalizePhone('123abc'), '123abc');
});
