import 'chai/register-should';
import WooCurrencies from '../lib/wc/WooCurrencies';

describe('WooCurrencies', () => {
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

  describe('constructor', () => {
    const result = new WooCurrencies(currencies);

    it('should return an object with getSymbol()', () => {
      result.should.be.an('object');
      result.getSymbol.should.be.a('function');
    });

    it('should return "$" for "usd"', () => {
      result.should.be.an('object');
      result.getSymbol('usd').should.equal('$');
    });
  });
});
