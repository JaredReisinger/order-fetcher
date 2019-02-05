import moment from 'moment-timezone';

import * as wcutils from './wcutils';
import * as helpers from '../helpers';

export default class WooOrder {
  constructor(wcOrder) {
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

    helpers.dbg(1, 'WooOrder', this);
  }

  static simplifyBilling(wcBilling) {
    // eslint-disable-next-line camelcase
    const name = `${wcBilling.first_name || ''} ${wcBilling.last_name ||
      ''}`.trim();

    // eslint-disable-next-line camelcase
    const addressParts = [];
    addressParts.push(wcBilling.address_1);
    if (wcBilling.address_2) {
      addressParts.push(wcBilling.address_2);
    }
    addressParts.push(wcBilling.city);
    addressParts.push(`${wcBilling.state} ${wcBilling.postcode}`.trim());

    // eslint-disable-next-line camelcase
    const address = addressParts.join(', ');

    const phone = wcutils.normalizePhone(wcBilling.phone);

    return {
      name,
      email: wcBilling.email,
      address,
      phone,
    };
  }

  static getPaypalFees(wcOrder) {
    for (const m of wcOrder.meta_data) {
      if (m.key === 'PayPal Transaction Fee') {
        return m.value;
      }
    }

    return undefined;
  }
}
