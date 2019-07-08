import 'chai/register-should';
// import sinon from 'sinon';

import Get from '../../lib/commands/get';

describe('command - get', async () => {
  let get;

  beforeEach(() => {
    get = new Get(
      {
        hosts: {
          foo: {
            url: 'FOO.URL',
            key: 'FOO.KEY',
            secret: 'FOO.SECRET',
          },
        },
        timezone: 'UTC',
      },
      () => {}
    );
  });

  describe('createCommands()', () => {
    it('should return a Promise', async () => {
      const result = get.createCommands();
      result.should.be.a('promise');
      await result;
    });
  });

  describe('getValue()', () => {
    it('should extract a field', () => {
      get
        .getValue({ field: 'FIELD' }, { value: 'field' })
        .should.equal('FIELD');
    });

    it('should handle nested fields', () => {
      get
        .getValue({ outer: { inner: 'FIELD' } }, { value: 'outer.inner' })
        .should.equal('FIELD');
    });

    it('should handle extractor functions', () => {
      get
        .getValue({ field: 'FIELD' }, { value: ({ field }) => `FN(${field})` })
        .should.equal('FN(FIELD)');
    });
  });

  describe('sanitizeString()', () => {
    it('should normalize whitespace', () => {
      get.sanitizeString('x x').should.equal('x x');
      get.sanitizeString('x\tx').should.equal('x x');
      get.sanitizeString('x\nx').should.equal('x x');
      get.sanitizeString('x\rx').should.equal('x x');
    });
  });

  describe('collectMetaFields()', () => {
    it('should return meta field descriptors', () => {
      const result = get.collectMetaFields([
        { meta: { meta1: '' } },
        { meta: { meta2: '' } },
        { meta: { meta1: '' } },
      ]);
      result.should.deep.equal([
        { label: 'meta1', value: 'meta["meta1"]' },
        { label: 'meta2', value: 'meta["meta2"]' },
      ]);
    });
  });

  describe('formatDate()', () => {
    it('should return an Excel-formatted date', () => {
      // use go-lang's magic date: "01/02 03:04:05PM ‘06 -0700" (minus TZ)
      const result = get.formatDate(new Date(Date.UTC(2006, 0, 2, 3, 4, 5)));
      result.should.equal('1/2/2006 3:04:05 AM');
    });
  });

  describe('formatAmount()', () => {
    it('should return formatted amount', () => {
      const currencies = {
        getSymbol: () => '[$$]',
      };
      // use go-lang's magic date: "01/02 03:04:05PM ‘06 -0700" (minus TZ)
      const result = get.formatAmount(123, '', currencies);
      result.should.equal('[$$]123');
    });
  });
});
