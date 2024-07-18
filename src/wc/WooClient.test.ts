import test from 'ava';

import WooClient from './WooClient.js';

test('WooClient constructor should create an object', (t) => {
  const result = new WooClient('URL', 'KEY', 'SECRET');
  t.true(result instanceof Object);
  t.true('_apiVersion' in result);
  t.true('_ky' in result);
});
