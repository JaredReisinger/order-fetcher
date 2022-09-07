import moment from 'moment-timezone';

import type { Billing, Order } from 'woocommerce-api';

import * as wcutils from './wcutils.js';
import { dbg } from '../helpers.js';

export interface SimplifiedBilling {
  name: string;
  email: string;
  address: string;
  phone: string;
}

export default class WooOrder {
  id: Order['id'];
  number: Order['number'];
  status: Order['status'];
  currency: Order['currency'];
  note: Order['customer_note'];
  paymentMethod: Order['payment_method'];
  transactionId: Order['transaction_id'];
  total: Order['total'];
  fees?: string;
  billing: SimplifiedBilling;
  date: moment.Moment;

  constructor(wcOrder: Order) {
    this.id = wcOrder.id;
    this.number = wcOrder.number;
    this.status = wcOrder.status;
    this.currency = wcOrder.currency;
    this.note = wcOrder.customer_note;
    this.paymentMethod = wcOrder.payment_method;
    this.transactionId = wcOrder.transaction_id;

    this.total = wcOrder.total;
    this.fees = WooOrder.getPaypalFees(wcOrder);

    this.billing = WooOrder.simplifyBilling(wcOrder.billing);

    // in v1, date_created appears to be UTC.  In v2, date_created is
    // server-local (?), and date_created_gmt is UTC.
    // TODO: Should we check API version and be flexible?
    // this.date_created = moment.utc(wcOrder.date_created_gmt);
    this.date = moment.utc(wcOrder.date_created_gmt);

    dbg(1, 'WooOrder', this);
  }

  static simplifyBilling(wcBilling: Billing): SimplifiedBilling {
    const name = `${wcBilling.first_name || ''} ${
      wcBilling.last_name || ''
    }`.trim();

    const addressParts = [];
    addressParts.push(wcBilling.address_1);
    if (wcBilling.address_2) {
      addressParts.push(wcBilling.address_2);
    }
    addressParts.push(wcBilling.city);
    addressParts.push(`${wcBilling.state} ${wcBilling.postcode}`.trim());

    const address = addressParts.join(', ');

    const phone = wcutils.normalizePhone(wcBilling.phone);

    return {
      name,
      email: wcBilling.email,
      address,
      phone,
    };
  }

  static getPaypalFees(wcOrder: Order) {
    for (const m of wcOrder.meta_data || []) {
      if (m.key === 'PayPal Transaction Fee') {
        return m.value as string;
      }
    }

    return undefined;
  }
}
