import 'chai/register-should';
import * as wcutils from '../lib/wc/wcutils';

describe('wcutils', () => {
  describe('normalizePhone', () => {
    it('should convert special "no value" sentinels to "(none)"', () => {
      wcutils.normalizePhone('none').should.equal('(none)');
      wcutils.normalizePhone('na').should.equal('(none)');
      wcutils.normalizePhone('n/a').should.equal('(none)');
      wcutils.normalizePhone('no fax').should.equal('(none)');
      wcutils.normalizePhone('x').should.equal('(none)');
      wcutils.normalizePhone('xx').should.equal('(none)');
      wcutils.normalizePhone('xxx').should.equal('(none)');
      wcutils.normalizePhone('').should.equal('(none)');
      wcutils.normalizePhone(' ').should.equal('(none)');
      wcutils.normalizePhone('  ').should.equal('(none)');
    });

    it('should remove non-numeric characters for standard lengths', () => {
      wcutils.normalizePhone('123abc4567').should.equal('123-4567');
      wcutils.normalizePhone('123abc4567xyz890').should.equal('(123) 456-7890');
    });

    it('should leave untouched for unrecognized lengths', () => {
      wcutils.normalizePhone('123abc').should.equal('123abc');
    });
  });
});
