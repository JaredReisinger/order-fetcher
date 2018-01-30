'use strict';

import moment from 'moment-timezone';
import entities from 'entities';

import * as util from './util';

// REVIEW: should this be here, or a part of the output logic?
const excelDateTimeFmt = 'M/D/YYYY h:mm:ss A';

export function itemizeAll(orders) {
    let items = [];
    for (const order of orders) {
        items = items.concat(itemize(order));
    }
    return items;
}

// Each order may include multiple items... we flatten these out, duplicating
// the order info (person, order number, etc.) to each item.
export function itemize(order) {
    util.out(`itemizing order #${order.id}...`);
    util.dbg(order);

    const simplifiedOrder = pick(order, 'id', 'status', 'customer_note', 'payment_method', 'transaction_id');
    // simplifiedOrder.orderId = order.id;
    // simplifiedOrder.orderTotal = `\$${order.total}`;
    simplifiedOrder.total = `\$${order.total}`;
    simplifiedOrder.billing = simplifyBilling(order.billing);

    // in v1, date_created appears to be UTC.  In v2, date_created is
    // server-local (?), and date_created_gmt is UTC.
    // simplifiedOrder.date_created = moment.utc(order.date_created_gmt);
    simplifiedOrder.moment_created = moment.utc(order.date_created);
    simplifiedOrder.date_created = moment(simplifiedOrder.moment_created).tz('America/Los_Angeles').format(excelDateTimeFmt);
    // util.dbg(simplifiedOrder);

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
    const full_name = `${billing.first_name || ''} ${billing.last_name ||''}`.trim();

    const address_parts = [];
    address_parts.push(billing.address_1);
    if (billing.address_2) {
        address_parts.push(billing.address_2);
    }
    address_parts.push(billing.city);
    address_parts.push(`${billing.state} ${billing.postcode}`.trim());

    const address_single = address_parts.join(', ');

    const phone = normalizePhone(billing.phone);

    return {
        full_name,
        email : billing.email,
        address_single,
        phone,
    };
}

const isPhoneRE = /phone|fax/i;
const hasPriceRE = / \(\$\d+.\d\d\)$/;

function simplifyItem(item, order) {
    // util.dbg(item);

    const simplified = pick(item, 'id', 'sku', 'name', 'product_id', 'variation_id', 'quantity');
    simplified.total = `\$${item.total}`;
    simplified.order = order;

    // In order to make the metadata usable, we transform it from a list of
    // objects (that happens to have a 'key' property) to a map using that
    // 'key' property as the key!
    simplified.meta = {};
    // util.dbg(item.meta_data);
    for (const m of item.meta) {
        // the old code used to use entities.decodeHTML, but I'm not seeing the
        // need in the v2 API...  Also, there's an ID, but it's not useful, it's
        // jsut the table row ID for the meta information, *not* specific to the
        // label/key.
        let key = entities.decodeHTML(m.key);
        let label = entities.decodeHTML(m.label);
        let value = entities.decodeHTML(m.value);
        // let key = m.key;  // name change from v1 to v2?
        // let label = key;
        // let value = m.value;

        if (!key) {
            util.dbg(`order ${order.id} has meta_data with no key: ${JSON.stringify(m)}`);
            continue;
        }

        // v1 keys/labels have price info, but no longer seem to...
        if (hasPriceRE.test(key)) {
            util.dbg(`key has price: ${key}`);
            key = key.replace(hasPriceRE, '');
        }

        if (hasPriceRE.test(label)) {
            util.dbg(`label has price: ${label}`);
            label = label.replace(hasPriceRE, '');
        }

        if (isPhoneRE.test(label)) {
            value = normalizePhone(value);
        }

        simplified.meta[key] = { label, value };
    }

    util.dbg(simplified);
    return simplified;
}

// do out best to normalize formatting of phone numbers...
const nonPhoneRe = /[^0-9]/g;
const noneRe = /^(?:none|n\/?a|no fax|[10()-]+|x+|\s+)$/i;

function normalizePhone(phone) {
    if (!phone || noneRe.test(phone)) {
        if (phone) {
            util.dbg(`normalizing ${phone} to (none)`);
        }
        return "(none)";
    }

    const origPhone = phone;

    phone = phone.replace(nonPhoneRe, '');

    if (phone.length === 11 && phone[0] === '1') {
        phone = phone.slice(1);
    }

    switch (phone.length) {
        case 10:
            phone = `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6)}`;
            break;
        case 7:
            phone = `${phone.slice(0,3)}-${phone.slice(3)}`;
            break;
        case 9:
            // we have a couple of 9-digit numbers where they missed 1 in the
            // *second* set: '206-12-3456'
            phone = `(${phone.slice(0,3)}) ${phone.slice(3,5)}?-${phone.slice(5)}`;
            util.out(`short phone: ${origPhone}, treating as ${phone}`);
            break;
        default:
            if (phone.length >= 11 && phone.length <= 14) {
                // we have a couple of 11-digit that look like an extra digit...
                phone = `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6,10)} (+${phone.slice(10)})`;
                util.out(`long phone: ${origPhone}, treating as ${phone}`);
            } else {
                util.out(`unexpected phone: ${origPhone}, leaving as-is`);
                phone = origPhone;
            }
            break;
    }

    return phone;
}

function pick(obj, ...keys) {
    const result = {};
    for (const key of keys) {
        result[key] = obj[key];
    }
    return result;
}
