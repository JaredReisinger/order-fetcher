import test from 'ava';
// import sinon from 'sinon';
import WooClient from './WooClient.js';

test('WooClient constructor should create an object', (t) => {
  const result = new WooClient('URL', 'KEY', 'SECRET');
  t.true(result instanceof Object);
  t.like(result, {
    _client: {
      version: 'wc/v3',
      url: 'URL',
      consumerKey: 'KEY',
      consumerSecret: 'SECRET',
    },
  });
});
