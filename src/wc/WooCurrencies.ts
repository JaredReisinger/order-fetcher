import he from 'he';

import { dbg } from '../helpers.js';

import { Currency } from './woocommerce-types.js';

interface WooCurrency {
  name: string;
  symbol: string;
}

type WooCurrencyMap = Record<Currency['code'], WooCurrency>;

export default class WooCurrencies {
  currencies: WooCurrencyMap;

  constructor(wcCurrencies: Currency[]) {
    dbg(5, 'WooCurrencies constructor', wcCurrencies);
    this.currencies = wcCurrencies.reduce<WooCurrencyMap>((memo, c) => {
      const { code, name, symbol } = c;
      memo[code] = { name, symbol: he.decode(symbol) };
      return memo;
    }, {});
    dbg(4, 'WooCurrencies', this);
  }

  getSymbol(code: Currency['code']) {
    return this.currencies[code].symbol;
  }
}
