import test from 'ava';
import sinon from 'sinon';
import { FieldValueGetterFnWithField } from '@json2csv/plainjs';
import yargs from 'yargs/yargs';
import moment from 'moment-timezone';

import WooClient from '../wc/WooClient.js';
import WooItem from '../wc/WooItem.js';
import WooCurrencies from '../wc/WooCurrencies.js';
// import { Order } from '../wc/woocommerce-types.js';

import Get from './get.js';

const currencies = [
  {
    name: 'US Dollar',
    code: 'usd',
    symbol: '$',
  },
  {
    name: 'US Dollar 2',
    code: 'usd2',
    symbol: 'US$',
  },
];

const order = {
  id: 12345,
  number: '12345',
  date_created_gmt: '2000-01-01T12:00:00.000Z',
  status: 'STATUS',
  total: '123.45',
  currency: 'usd',
  billing: {
    first_name: 'FIRST_NAME',
    last_name: 'LAST_NAME',
    company: 'COMPANY',
    address_1: 'ADDRESS_1',
    address_2: 'ADDRESS_2',
    city: 'CITY',
    state: 'STATE',
    postcode: 'POSTCODE',
    country: 'COUNTRY',
    email: 'EMAIL',
    phone: 'PHONE',
  },
  line_items: [
    {
      id: 123,
      name: 'ITEM_NAME_1',
      sku: 'SKU_1',
      total: '1.23',
    },
    {
      id: 234,
      name: 'ITEM_NAME_2',
      sku: 'SKU_2',
      total: '2.34',
      meta_data: [
        { value: 'missing key' },
        { key: '_ignored', value: 'WooCommerce-style metadata' },
        // { key: 'v1 price $0.99', value: 'v1-style price-included key' },
        { key: 'meta-phone', value: '800-555-1212' },
      ],
    },
  ],
};

function createGet() {
  return new Get(
    {
      hosts: {
        foo: {
          url: 'FOO.URL',
          key: 'FOO.KEY',
          secret: 'FOO.SECRET',
        },
      },
      timezone: 'UTC',
    },
    () => {}
  );
}

test('Get.createCommands() should return a Promise', async (t) => {
  const get = createGet();
  const result = get.createCommands();
  t.true(result instanceof Promise);
  await t.notThrowsAsync(result);
});

test('Get.createCommand("foo") should return a Promise', async (t) => {
  const get = createGet();
  const result = get.createCommand('foo');
  t.true(result instanceof Promise);
  await t.notThrowsAsync(result);
});

test('Get.createCommand().builder should succeed', async (t) => {
  const get = createGet();
  const result = await get.createCommand();

  t.truthy(result.builder);

  t.notThrows(() => {
    if (result.builder instanceof Function) {
      result.builder(yargs([]));
    }
  });
});

test('Get.createCommand("foo").builder should succeed', async (t) => {
  const get = createGet();
  const result = await get.createCommand('foo');

  t.truthy(result.builder);

  t.notThrows(() => {
    if (result.builder instanceof Function) {
      result.builder(yargs([]));
    }
  });
});

test('Get.createCommand("foo").builder supports after/before parsing', async (t) => {
  const get = createGet();
  const builder = (await get.createCommand('foo')).builder;

  t.true(builder instanceof Function);
  if (builder instanceof Function) {
    const parser = await builder(yargs());
    const argv = await parser.parse([
      '--after',
      '2022-01-01',
      '--before',
      '2022-12-31',
    ]);
    t.true(moment.isMoment(argv.after));
    t.true(moment.isMoment(argv.before));
  }
});

const meta = {
  allBlank: false,
  allIdentical: false,
  maximumWidth: 100,
};

test('Get.getValue() should extract a field', (t) => {
  const get = createGet();
  t.is(
    get.getValue({ field: 'FIELD' } as unknown as WooItem, {
      value: 'field',
      label: '',
      meta,
    }),
    'FIELD'
  );
});

test('Get.getValue() should handle nested fields', (t) => {
  const get = createGet();
  t.is(
    get.getValue({ outer: { inner: 'FIELD' } } as unknown as WooItem, {
      value: 'outer.inner',
      label: '',
      meta,
    }),
    'FIELD'
  );
});

test('Get.getValue() should handle extractor functions', (t) => {
  const get = createGet();
  t.is(
    get.getValue({ field: 'FIELD' } as unknown as WooItem, {
      value: (({ field }: { field: string }) =>
        `FN(${field})`) as unknown as FieldValueGetterFnWithField<
        WooItem,
        unknown
      >,
      label: '',
      meta,
    }),
    'FN(FIELD)'
  );
});

test('Get.sanitizeString() should normalize whitespace', (t) => {
  const get = createGet();
  t.is(get.sanitizeString('x x'), 'x x');
  t.is(get.sanitizeString('x\tx'), 'x x');
  t.is(get.sanitizeString('x\nx'), 'x x');
  t.is(get.sanitizeString('x\rx'), 'x x');
});

test('Get.collectMetaFields() should return meta field descriptors', (t) => {
  const get = createGet();
  const result = get.collectMetaFields([
    { meta: { meta1: '' } },
    { meta: { meta2: '' } },
    { meta: { meta1: 'SOME-VALUE' } },
  ] as unknown as WooItem[]);
  t.deepEqual(result, [
    {
      label: 'meta1',
      value: 'meta["meta1"]',
      // value analysis hasn't happened yet!
      meta: { allBlank: true, allIdentical: true, maximumWidth: 5 },
    },
    {
      label: 'meta2',
      value: 'meta["meta2"]',
      meta: { allBlank: true, allIdentical: true, maximumWidth: 5 },
    },
  ]);
});

test('Get.formatDate()should return an Excel-formatted date', (t) => {
  const get = createGet();
  // use go-lang's magic date: "01/02 03:04:05PM ‘06 -0700" (minus TZ)
  const result = get.formatDate(new Date(Date.UTC(2006, 0, 2, 3, 4, 5)));
  t.is(result, '1/2/2006 3:04:05 AM');
});

test('Get.formatAmount() should return formatted amount', (t) => {
  const get = createGet();
  const fakeCurrencies = {
    getSymbol: () => '[$$]',
  } as unknown as WooCurrencies;
  // use go-lang's magic date: "01/02 03:04:05PM ‘06 -0700" (minus TZ)
  const result = get.formatAmount('123', '', fakeCurrencies);
  t.is(result, '[$$]123');
});

function createClientStub() {
  const stub = sinon.stub().resolves([]);
  const client = { getAll: stub } as unknown as WooClient;
  return { stub, client };
}

test('Get.run() should return a Promise', async (t) => {
  const get = createGet();
  const { client } = createClientStub();
  // @ts-expect-error -- fake empty args
  const result = get.run('foo', {}, client);
  t.true(result instanceof Promise);
  await t.notThrowsAsync(result);
});

test('Get.run() requires a host', async (t) => {
  const get = createGet();
  const builder = (await get.createCommand()).builder;

  t.true(builder instanceof Function);
  if (builder instanceof Function) {
    const parser = await builder(yargs());
    const argv = await parser.parse([], () => {});
    await t.throwsAsync(() => get.run(undefined, argv));
  }
});

test('Get.run() should request currencies', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();
  // @ts-expect-error -- fake empty args
  const result = get.run('foo', {}, client);
  t.true(stub.calledWith('data/currencies'));
  await t.notThrowsAsync(result);
});

test('Get.run() should request items', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();
  // @ts-expect-error -- fake empty args
  const result = get.run('foo', {}, client);
  t.true(stub.calledWith('orders'));
  await t.notThrowsAsync(result);
});

test('Get.run() should not throw with valid (stub) data', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();

  stub.withArgs('data/currencies').resolves(currencies);
  stub.withArgs('orders').resolves([order]);

  // @ts-expect-error -- fake empty args
  const result = get.run('foo', {}, client);
  await t.notThrowsAsync(async () => {
    await t.notThrowsAsync(result);
  });
});

test('Get.run() can filter by sku', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();

  stub.withArgs('data/currencies').resolves(currencies);
  stub.withArgs('orders').resolves([order]);

  // @ts-expect-error -- fake args
  const result = get.run('foo', { sku: ['SKU_1'] }, client);
  t.true(stub.calledWith('orders'));
  await t.notThrowsAsync(result);
});

test('Get.run() can filter by sku prefix', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();

  stub.withArgs('data/currencies').resolves(currencies);
  stub.withArgs('orders').resolves([order]);

  // @ts-expect-error -- fake args
  const result = get.run('foo', { skuPrefix: ['SKU_'] }, client);
  t.true(stub.calledWith('orders'));
  await t.notThrowsAsync(result);
});

test('Get.run() can present meta info', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();

  stub.withArgs('data/currencies').resolves(currencies);
  stub.withArgs('orders').resolves([order]);

  const result = get.run(
    'foo',
    // @ts-expect-error -- fake args
    { listSkus: true, listStatuses: true, listColumns: true },
    client
  );
  t.true(stub.calledWith('orders'));
  await t.notThrowsAsync(result);
});

test('Get.run() can present specific columns', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();

  stub.withArgs('data/currencies').resolves(currencies);
  stub.withArgs('orders').resolves([order]);

  const result = get.run(
    'foo',
    // @ts-expect-error -- fake args
    { columns: 'order#,total' },
    client
  );
  t.true(stub.calledWith('orders'));
  await t.notThrowsAsync(result);
});

test('Get.run() can output CSV to a file', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();

  stub.withArgs('data/currencies').resolves(currencies);
  stub.withArgs('orders').resolves([order]);

  const writeFile = sinon.stub(get, 'writeFile').resolves();

  const result = get.run(
    'foo',
    // @ts-expect-error -- fake args
    { out: 'BOGUS.csv' },
    client
  );

  await t.notThrowsAsync(result);

  t.is(writeFile.callCount, 1);
  t.deepEqual(writeFile.getCall(0).args, [
    'BOGUS.csv',
    // don't forget leading BOM!
    `\uFEFF"order#","date","status","name","email","address","phone","sku","item","qty","total","fees","method","transID","note","meta-phone"
12345,"1/1/2000 12:00:00 PM","STATUS","FIRST_NAME LAST_NAME","EMAIL","ADDRESS_1, ADDRESS_2, CITY, STATE POSTCODE","PHONE","SKU_1","ITEM_NAME_1",,"$1.23",,,,,
12345,"1/1/2000 12:00:00 PM","STATUS","FIRST_NAME LAST_NAME","EMAIL","ADDRESS_1, ADDRESS_2, CITY, STATE POSTCODE","PHONE","SKU_2","ITEM_NAME_2",,"$2.34",,,,,"(800) 555-1212"`,
  ]);

  writeFile.restore();
});

// TODO: test after/before/status filtering (in call!)
