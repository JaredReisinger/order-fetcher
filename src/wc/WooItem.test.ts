import test from 'ava';
// import sinon from 'sinon';

import { Order } from './woocommerce-types.js';
import WooItem from './WooItem.js';

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
} as unknown as Order;

test('WooItem.itemize should return an array', (t) => {
  const result = WooItem.itemize(order);
  t.true(result instanceof Array);
});

test('WooItem.itemize should have an item for each line_item', (t) => {
  const result = WooItem.itemize(order);
  t.is(result.length, order.line_items.length);
});

test('WooItem.itemize should add metadata fields', (t) => {
  const result = WooItem.itemize(order);
  t.is(result.length, order.line_items.length);
  t.is(Object.keys(result[1].meta).length, 2);
});

test('WooItem.convertMetadata should normalize phone numbers', (t) => {
  t.deepEqual(
    WooItem.convertMetadata(1, [{ id: 0, key: 'phone', value: '8005551212' }]),
    { phone: '(800) 555-1212' }
  );
});

test('WooItem.convertMetadata should combine repeat keys', (t) => {
  t.deepEqual(
    WooItem.convertMetadata(1, [
      { id: 0, key: 'multiple', value: 'one' },
      { id: 0, key: 'multiple', value: 'two' },
    ]),
    { multiple: ['one', 'two'] }
  );
});

test('WooItem.fromOrdersJson calls itemize on all of the orders', (t) => {
  // const itemize = sinon.stub(WooItem, 'itemize');
  const result = WooItem.fromOrdersJson([order, order, order]);
  t.is(result.length, order.line_items.length * 3);
});

// test('WooItem.fromOrdersJson filters sku when given', (t) => {
//   const itemize = sinon.stub(WooItem, 'itemize').callsFake((i) => i);
//   const items = WooItem.fromOrdersJson([1, { sku: 'sku' }, 3], ['sku']);
//   itemize.callCount.should.equal(3);
//   itemize.restore();
//   items.length.should.equal(1);
// });
