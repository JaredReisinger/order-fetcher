import test from 'ava';

import WooClient, { percentEncode } from './WooClient.js';

test('WooClient constructor creates an object with HTTPS', (t) => {
  const result = new WooClient('https://URL.org', 'KEY', 'SECRET');
  t.true(result instanceof Object);
  t.true('_apiVersion' in result);
  t.true('_ky' in result);
});

test('WooClient constructor creates an object with HTTP', (t) => {
  const result = new WooClient('http://URL.org', 'KEY', 'SECRET');
  t.true(result instanceof Object);
  t.true('_apiVersion' in result);
  t.true('_ky' in result);
});

test('percentEncode()', (t) => {
  const cases: [string, string][] = [
    ['a', 'a'],
    ['z', 'z'],
    ['A', 'A'],
    ['Z', 'Z'],
    [' ', '%20'],
    [
      'this is a sample !@#$%^&*()',
      'this%20is%20a%20sample%20%21%40%23%24%25%5E%26%2A%28%29',
    ],
  ];
  cases.forEach((x, i) => {
    t.is(percentEncode(x[0]), x[1], `case ${i}, ${x[0]}`);
  });
});
