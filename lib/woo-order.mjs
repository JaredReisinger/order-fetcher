import moment from 'moment-timezone';
import entities from 'entities';

import * as helpers from './helpers';

// REVIEW: should this be here, or a part of the output logic?
const excelDateTimeFmt = 'M/D/YYYY h:mm:ss A';

export function itemizeAll(orders) {
  let items = [];
  for (const order of orders) {
    items = items.concat(itemize(order));
  }
  // orders.forEach(order => {
  //   items = items.concat(itemize(order));
  // });
  return items;
}

// Each order may include multiple items... we flatten these out, duplicating
// the order info (person, order number, etc.) to each item.
export function itemize(order) {
  helpers.dbg(1, `itemizing order #${order.id}...`);
  helpers.dbg(2, 'order', order);

  const simplifiedOrder = pick(
    order,
    'id',
    'status',
    'customer_note',
    'payment_method',
    'transaction_id'
  );
  // simplifiedOrder.orderId = order.id;
  // simplifiedOrder.orderTotal = `\$${order.total}`;
  simplifiedOrder.total = `$${order.total}`;
  simplifiedOrder.billing = simplifyBilling(order.billing);

  // in v1, date_created appears to be UTC.  In v2, date_created is
  // server-local (?), and date_created_gmt is UTC.
  // simplifiedOrder.date_created = moment.utc(order.date_created_gmt);
  simplifiedOrder.moment_created = moment.utc(order.date_created);
  simplifiedOrder.date_created = moment(simplifiedOrder.moment_created)
    .tz('America/Los_Angeles')
    .format(excelDateTimeFmt);
  helpers.dbg(1, 'simplified order', simplifiedOrder);

  // Now create the individual items...
  const items = [];
  for (const item of order.line_items) {
    // // We might be filtering to a specific SKU...
    // if (sku && item.sku !== sku) {
    //     continue;
    // }

    items.push(simplifyItem(item, simplifiedOrder));
  }

  return items;
}

function simplifyBilling(billing) {
  // eslint-disable-next-line camelcase
  const full_name = `${billing.first_name || ''} ${billing.last_name ||
    ''}`.trim();

  // eslint-disable-next-line camelcase
  const address_parts = [];
  address_parts.push(billing.address_1);
  if (billing.address_2) {
    address_parts.push(billing.address_2);
  }
  address_parts.push(billing.city);
  address_parts.push(`${billing.state} ${billing.postcode}`.trim());

  // eslint-disable-next-line camelcase
  const address_single = address_parts.join(', ');

  const phone = normalizePhone(billing.phone);

  return {
    full_name,
    email: billing.email,
    address_single,
    phone,
  };
}

const isPhoneRE = /phone|fax/i;
const hasPriceRE = / \(\$\d+.\d\d\)$/;

function simplifyItem(item, order) {
  helpers.dbg(2, 'simplifying item', item);

  const simplified = pick(
    item,
    'id',
    'sku',
    'name',
    'product_id',
    'variation_id',
    'quantity'
  );
  simplified.total = `$${item.total}`;
  simplified.order = order;

  // In order to make the metadata usable, we transform it from a list of
  // objects (that happens to have a 'key' property) to a map using that
  // 'key' property as the key!
  simplified.meta = {};
  helpers.dbg(3, 'metadata', item.meta);
  for (const m of item.meta || []) {
    // the old code used to use entities.decodeHTML, but I'm not seeing the
    // need in the v2 API...  Also, there's an ID, but it's not useful, it's
    // just the table row ID for the meta information, *not* specific to the
    // label/key.
    let key = entities.decodeHTML(m.key);
    let label = entities.decodeHTML(m.label);
    let value = entities.decodeHTML(m.value);

    if (!key) {
      helpers.dbg(
        0,
        `order ${order.id} has meta with no key: ${JSON.stringify(m)}`
      );
      continue;
    }

    // v1 keys/labels have price info, but no longer seem to...
    if (hasPriceRE.test(key)) {
      helpers.dbg(1, `key has price: ${key}`);
      key = key.replace(hasPriceRE, '');
    }

    if (hasPriceRE.test(label)) {
      helpers.dbg(1, `label has price: ${label}`);
      label = label.replace(hasPriceRE, '');
    }

    if (isPhoneRE.test(label)) {
      value = normalizePhone(value);
    }

    simplified.meta[key] = { label, value };
  }

  helpers.dbg(1, 'simplified item', simplified);
  return simplified;
}

// do out best to normalize formatting of phone numbers...
const nonPhoneRe = /[^0-9]/g;
const noneRe = /^(?:none|n\/?a|no fax|[10()-]+|x+|\s+)$/i;

function normalizePhone(phone) {
  if (!phone || noneRe.test(phone)) {
    if (phone) {
      helpers.dbg(2, `normalizing ${phone} to (none)`);
    }
    return '(none)';
  }

  let p = phone;

  p = p.replace(nonPhoneRe, '');

  if (p.length === 11 && p[0] === '1') {
    p = p.slice(1);
  }

  switch (p.length) {
    case 10:
      p = `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;
      break;
    case 7:
      p = `${p.slice(0, 3)}-${p.slice(3)}`;
      break;
    case 9:
      // we have a couple of 9-digit numbers where they missed 1 in the
      // *second* set: '206-12-3456'
      p = `(${p.slice(0, 3)}) ${p.slice(3, 5)}?-${p.slice(5)}`;
      helpers.out(`short phone: ${phone}, treating as ${p}`);
      break;
    default:
      if (p.length >= 11 && p.length <= 14) {
        // we have a couple of 11-digit that look like an extra digit...
        p = `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6, 10)} (+${p.slice(
          10
        )})`;
        helpers.out(`long phone: ${phone}, treating as ${p}`);
      } else {
        helpers.out(`unexpected phone: ${phone}, leaving as-is`);
        p = phone;
      }
      break;
  }

  return p;
}

function pick(obj, ...keys) {
  const result = {};
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}
