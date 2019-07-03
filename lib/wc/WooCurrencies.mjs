import he from 'he';
import * as helpers from '../helpers';

export default class WooCurrencies {
  constructor(wcCurrencies) {
    helpers.dbg(5, 'WooCurrency constructor', wcCurrencies);
    this.currencies = wcCurrencies.reduce((memo, c) => {
      const { code, name, symbol } = c;
      memo[code] = { name, symbol: he.decode(symbol) };
      return memo;
    }, {});
    helpers.dbg(4, 'WooCurrencies', this);
  }

  getSymbol(code) {
    return this.currencies[code].symbol;
  }
}
