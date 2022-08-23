import test from 'ava';
import WooCurrencies from './WooCurrencies.js';

const currencies = [
  {
    name: 'US Dollar',
    code: 'usd',
    symbol: '$',
  },
  {
    name: 'US Dollar 2',
    code: 'usd2',
    symbol: 'US$',
  },
];

const result = new WooCurrencies(currencies);

test('WooCurrencies constructor should return an object with getSymbol()', (t) => {
  t.true(result instanceof Object);
  t.true(result.getSymbol instanceof Function);
});

test('WooCurrencies constructor should return "$" for "usd"', (t) => {
  t.true(result instanceof Object);
  t.is(result.getSymbol('usd'), '$');
});
