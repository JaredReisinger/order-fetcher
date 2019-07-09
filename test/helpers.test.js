import 'chai/register-should';
import * as helpers from '../lib/helpers';

describe('helpers', () => {
  describe('stringCompare', () => {
    it('should compare strings', () => {
      helpers.stringCompare('a', 'b').should.equal(-1);
      helpers.stringCompare('b', 'a').should.equal(1);
      helpers.stringCompare('a', 'a').should.equal(0);
    });
  });

  describe('increment', () => {
    it('should increment the running total by one', () => {
      helpers.increment('ignored', 0).should.equal(1);
      helpers.increment('ignored', 1).should.equal(2);
      helpers.increment('ignored', 100).should.equal(101);
    });
  });

  describe('collect', () => {
    it('should accumulate an array', () => {
      helpers.collect(1, []).should.have.ordered.members([1]);
      helpers.collect(2, [1]).should.have.ordered.members([1, 2]);
      helpers
        .collect('foo', [1, 2, 3, 4])
        .should.have.ordered.members([1, 2, 3, 4, 'foo']);
    });
  });

  describe('asMoment', () => {
    it('should parse a valid date', () => {
      const date = helpers.asMoment('2019-01-01', 'UTC');
      date.isValid().should.be.true;
    });

    it('should throw on an invalid date', () => {
      (() => helpers.asMoment('BOGUS', 'UTC')).should.throw(helpers.UserError);
    });
  });
});
