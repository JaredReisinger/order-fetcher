import 'chai/register-should';
import sinon from 'sinon';
import WooItem from '../../lib/wc/WooItem';

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
        meta_data: [
          { value: 'missing key' },
          { key: '_ignored', value: 'WooCommerce-style metadata' },
          { key: 'v1 price $0.99', value: 'v1-style price-included key' },
          { key: 'phone', value: '8005551212' },
        ],
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

    it('filters sku when given', () => {
      const itemize = sinon.stub(WooItem, 'itemize').callsFake(i => i);
      const items = WooItem.fromOrdersJson([1, { sku: 'sku' }, 3], ['sku']);
      itemize.callCount.should.equal(3);
      itemize.restore();
      items.length.should.equal(1);
    });
  });
});
