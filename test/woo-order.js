import 'chai/register-should';
// import sinon from 'sinon';

import * as wooOrder from '../lib/woo-order';

describe('woo-order', () => {
  const order = {
    id: '12345',
    status: 'STATUS',
    total: '123.45',
    billing: {},
    line_items: [
      {
        id: '123',
        sku: 'SKU_1',
        total: '1.23',
      },
      {
        id: '234',
        sku: 'SKU_2',
        total: '2.34',
      },
    ],
  };

  describe('itemize', () => {
    const result = wooOrder.itemize(order);

    it('should return an array', () => {
      result.should.be.an('Array');
    });

    it('should have an item for each line_item', () => {
      result.should.have.lengthOf(order.line_items.length);
    });

    it('prefix a dollar sign to the total', () => {
      for (const item of result) {
        item.total[0].should.equal('$');
        item.order.total[0].should.equal('$');
      }
    });
  });

  describe('itemizeAll', () => {
    it('calls itemize on all of the orders', () => {
      // wooOrder.itemizeAll([1, 2, 3]);
      // stub.callCount().should.equal(3);
      // stub.restore();
    });
  });
});
