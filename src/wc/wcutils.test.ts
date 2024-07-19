import test from 'ava';
import * as wcutils from './wcutils.js';

test('wcutils normalizePhone()', (t) => {
  const cases: [string, string][] = [
    // standard lengths/formatting
    ['1234567', '123-4567'],
    ['1234567890', '(123) 456-7890'],
    ['11234567890', '(123) 456-7890'],
    // weird 9-digit cases..
    ['123456789', '(123) 45?-6789'],
    // weird 11-to-14-digit (not leading 1) cases...
    ['92345678901', '(923) 456-7890 (+1)'],
    ['923456789012', '(923) 456-7890 (+12)'],
    ['9234567890123', '(923) 456-7890 (+123)'],
    ['92345678901234', '(923) 456-7890 (+1234)'],
    // "no value" sentinels
    ['none', '(none)'],
    ['na', '(none)'],
    ['n/a', '(none)'],
    ['no fax', '(none)'],
    ['x', '(none)'],
    ['xx', '(none)'],
    ['xxx', '(none)'],
    ['', '(none)'],
    [' ', '(none)'],
    ['  ', '(none)'],
    // non-numeric
    ['123abc4567', '123-4567'],
    ['123abc4567xyz890', '(123) 456-7890'],
    // unrecognized lengths
    ['123abc', '123abc'],
  ];

  cases.forEach(([input, expected], i) => {
    t.is(wcutils.normalizePhone(input), expected, `case ${i} "${input}"`);
  });
});
