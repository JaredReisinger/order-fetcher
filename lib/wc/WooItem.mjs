import WooOrder from './WooOrder';
import * as wcutils from './wcutils';
import * as helpers from '../helpers';

// REVIEW: should this be here, or a part of the output logic?
// const excelDateTimeFmt = 'M/D/YYYY h:mm:ss A';
export const isPhoneRE = /phone|fax/i;
export const hasPriceRE = / \(\$\d+.\d\d\)$/;

// WooItem represents an individual line-item in a WooCommerce order.
export default class WooItem {
  constructor(wcItem, order) {
    helpers.dbg(2, 'simplifying item', wcItem);

    this.id = wcItem.id;
    this.sku = wcItem.sku;
    this.name = wcItem.name;
    this.product_id = wcItem.product_id;
    this.variation_id = wcItem.variation_id;
    this.quantity = wcItem.quantity;
    this.total = wcItem.total;

    this.order = order;

    // In order to make the metadata usable, we transform it from a list of
    // objects (that happens to have a 'key' property) to a map using that
    // 'key' property as the key!
    // this.meta = {};
    helpers.dbg(3, 'metadata', wcItem.meta_data);
    this.meta = (wcItem.meta_data || []).reduce((memo, m) => {
      // The wc/v1 code used to use entities.decodeHTML, but I'm not seeing the
      // need in the v2 API...  Also, there's an ID, but it's not useful, it's
      // just the table row ID for the meta information, *not* specific to the
      // label/key.
      let { key, value } = m;

      if (!key) {
        helpers.dbg(
          0,
          `order ${order.id} has meta with no key: ${JSON.stringify(m)}`
        );
        return memo;
      }

      // Metadata keys with a leading "_" are WooCommerce state info that we
      // never really need here (like "_reduced_stock"), so we filter them out.
      if (key.startsWith('_')) {
        return memo;
      }

      // v1 keys/labels have price info, but no longer seem to...
      if (hasPriceRE.test(key)) {
        helpers.dbg(1, `key has price: ${key}`);
        key = key.replace(hasPriceRE, '');
      }

      if (isPhoneRE.test(value)) {
        value = wcutils.normalizePhone(value);
      }

      memo[key] = value;

      return memo;
    }, {});

    helpers.dbg(1, 'WooItem', this);
  }

  // Creates an array of WooOrder objects from the raw JSON data.
  static fromOrdersJson(orders, currencies, skus) {
    helpers.dbg(3, 'fromJson()', { orders, skus });

    let items = [].concat(...orders.map(o => WooItem.itemize(o, currencies)));

    helpers.out(`found ${items.length} total items in orders...`);
    helpers.dbg(2, 'items', items);

    if (skus) {
      items = items.filter(i => skus.includes(i.sku));
      helpers.out(`found ${items.length} ${skus.join(',')} items...`);
      helpers.dbg(2, 'filtered items', items);
    }

    return items;
  }

  // Each order may include multiple items... we flatten these out, referencing
  // the order info (person, order number, etc.) from each item.
  static itemize(wcOrder) {
    const order = new WooOrder(wcOrder);
    helpers.dbg(1, `itemizing order #${order.id}...`);
    // helpers.dbg(2, 'wcOrder', wcOrder);
    return wcOrder.line_items.map(i => new WooItem(i, order));
  }
}
