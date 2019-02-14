import 'chai/register-should';
import sinon from 'sinon';
import WooItem from '../lib/wc/WooItem';

describe('WooOrder', () => {
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
    const result = WooItem.itemize(order);

    it('should return an array', () => {
      result.should.be.an('Array');
    });

    it('should have an item for each line_item', () => {
      result.should.have.lengthOf(order.line_items.length);
    });
  });

  describe('fromOrdersJson', () => {
    it('calls itemize on all of the orders', () => {
      const itemize = sinon.stub(WooItem, 'itemize');
      WooItem.fromOrdersJson([1, 2, 3]);
      itemize.callCount.should.equal(3);
      itemize.restore();
    });
  });
});
