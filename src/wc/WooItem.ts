import type { LineItem, Order } from './woocommerce-types.js';

import WooOrder from './WooOrder.js';
import * as wcutils from './wcutils.js';
import { dbg } from '../helpers.js';

// REVIEW: should this be here, or a part of the output logic?
// const excelDateTimeFmt = 'M/D/YYYY h:mm:ss A';
export const isPhoneRE = /phone|fax/i;
export const hasPriceRE = / \(\$\d+.\d\d\)$/;

type MetaDataMap = Record<string, unknown>;

// WooItem represents an individual line-item in a WooCommerce order.
export default class WooItem {
  id: LineItem['id'];
  sku: LineItem['sku'];
  name: LineItem['name'];
  product_id: LineItem['product_id'];
  variation_id: LineItem['variation_id'];
  quantity: LineItem['quantity'];
  total: LineItem['total'];
  order: WooOrder;
  order_line: number;
  fees: WooOrder['fees'];
  meta: MetaDataMap;

  constructor(wcItem: LineItem, order: WooOrder, index: number) {
    dbg(2, 'simplifying item', wcItem);

    this.id = wcItem.id;
    this.sku = wcItem.sku;
    this.name = wcItem.name;
    this.product_id = wcItem.product_id;
    this.variation_id = wcItem.variation_id;
    this.quantity = wcItem.quantity;
    this.total = wcItem.total;

    this.order = order;
    this.order_line = index;
    // if (index === 0) {
    // or should we pass-through to all, and filter later?
    this.fees = order.fees;
    // }

    // In order to make the metadata usable, we transform it from a list of
    // objects (that happens to have a 'key' property) to a map using that
    // 'key' property as the key!
    // this.meta = {};
    dbg(3, 'metadata', wcItem.meta_data);
    this.meta = (wcItem.meta_data || []).reduce<MetaDataMap>((memo, m) => {
      // The wc/v1 code used to use entities.decodeHTML, but I'm not seeing the
      // need in the v2 API...  Also, there's an ID, but it's not useful, it's
      // just the table row ID for the meta information, *not* specific to the
      // label/key.
      let { key, value } = m;

      if (!key) {
        dbg(0, `order ${order.id} has meta with no key: ${JSON.stringify(m)}`);
        return memo;
      }

      // Metadata keys with a leading "_" are WooCommerce state info that we
      // never really need here (like "_reduced_stock"), so we filter them out.
      if (key.startsWith('_')) {
        return memo;
      }

      // v1 keys/labels have price info, but no longer seem to...
      if (hasPriceRE.test(key)) {
        dbg(1, `key has price: ${key}`);
        key = key.replace(hasPriceRE, '');
      }

      if (isPhoneRE.test(value)) {
        value = wcutils.normalizePhone(value);
      }

      memo[key] = value;

      return memo;
    }, {});

    dbg(1, 'WooItem', this);
  }

  // Creates an array of WooItem objects from the raw JSON order data.
  static fromOrdersJson(orders: Order[] /*, skus?: string[]*/) {
    dbg(3, 'fromJson()', { orders /*, skus*/ });

    const items = orders.flatMap(WooItem.itemize);

    dbg(1, `found ${items.length} total items in orders...`);
    dbg(2, 'items', items);

    return items;
  }

  // Each order may include multiple items... we flatten these out, referencing
  // the order info (person, order number, etc.) from each item.
  static itemize(wcOrder: Order) {
    const order = new WooOrder(wcOrder);
    dbg(1, `itemizing order #${order.id}...`);
    // dbg(2, 'wcOrder', wcOrder);
    return wcOrder.line_items.map((wcItem, i) => new WooItem(wcItem, order, i));
  }
}
