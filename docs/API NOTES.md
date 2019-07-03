# API Notes

The WooCommerce REST API is reasonably well documented, but they do _not_ particularly call out differences in the data schemas between versions. As ad-hoc retrieval and testing exposes differences, we’ll document them here. Note that ordering of properties in objects is _not_ included as an API change.

## API Changes: wc/v1 → wc/v2

### orders

#### dates

The various `date_...` properties were apparently UTC in v1; in v2 new `..._gmt` properties were created for the UTC time, and the non-suffixed properties hold server-local timestamps. The properties are: **date_completed**, **date_created**, **date_modified**, and **date_paid** (with v2 adding **date_completed_gmt**, **date_created_gmt**, **date_modified_gmt**, and **date_paid_gmt**).

- ##### v1

```javascript
date_completed: '2018-01-01T12:00:00.000';
```

- ##### v2

```javascript
date_completed: '2018-01-01T04:00:00.000';
date_completed_gmt: '2018-01-01T12:00:00.000';
```

#### line-item metadata

The order `line_item` metadata changed from v1's `meta` array of objects with `key`, `label`, and `value` properties into v2's `meta_data` array of objects with `id`, `key`, and `value`. Both `key` and `value` are consistent between v1 and v2. The `label` property in v1 is the displayed label, and the `id` in v2 is the metadata's unique ID.

- ##### v1

```javascript
meta: [
  { key: 'slug', label: 'Slug', value: 'Anything' },
  { key: 'slug-2', label: 'Slug 2', value: 'other things' },
];
```

- ##### v2

```javascript
meta_data: [
  { id: 123, key: 'slug', value: 'Anything' },
  { id: 124, key: 'slug-2', value: 'other things' },
];
```

#### price

Order `price` changed from a string value (`'400.00'`) in v1 to an actual number value (`400`) in v2.

- ##### v1

```javascript
price: '400.00';
```

- ##### v2

```javascript
price: 400;
```

#### order metadata

Top-level order `meta_data` was added to orders in v2, consisting of an array of `id`, `key`, and `value`, just like line items.

- ##### v1

  _(none)_

- ##### v2

```javascript
meta_data: [
  { id: 40943, key: 'Payment type', value: 'instant' },
  { id: 40944, key: '_paypal_status', value: 'completed' },
  { id: 40949, key: 'PayPal Transaction Fee', value: '11.90' },
];
```

---

#### shipping phone

The v1 implementation _might_ be taking the `phone` value from `billing` and repeating it in the `shipping` object. In v2, I've seen evidence of the `phone` property being dropped from the `shipping` object.

- ##### v1

```javascript
billing: {
    address_1: "123 Main Street",
    address_2: "",
    city: "Anytown",
    company: "321",
    country: "US",
    email: "FirstName.LastName@example.com",
    first_name: "FirstName",
    last_name: "LastName",
    phone: "8005551234",
    postcode: "98765",
    state: "WA",
},
shipping: {
    address_1: "",
    address_2: "",
    city: "",
    company: "",
    country: "",
    first_name: "",
    last_name: "",
    phone: "8005551234",
    postcode: "",
    state: "",
}
```

- ##### v2

```javascript
billing: {
    address_1: "123 Main Street",
    address_2: "",
    city: "Anytown",
    company: "321",
    country: "US",
    email: "FirstName.LastName@example.com",
    first_name: "FirstName",
    last_name: "LastName",
    phone: "8005551234",
    postcode: "98765",
    state: "WA",
},
shipping: {
    address_1: "",
    address_2: "",
    city: "",
    company: "",
    country: "",
    first_name: "",
    last_name: "",
    postcode: "",
    state: "",
}
```

---

## API Changes: wc/v2 → wc/v3

### orders

No changes between v2 and v3 have been seen thus far.
