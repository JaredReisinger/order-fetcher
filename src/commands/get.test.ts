import test from 'ava';
import sinon from 'sinon';
import { FieldValueCallback } from 'json2csv';
import yargs from 'yargs/yargs';
import moment from 'moment-timezone';

import WooClient from '../wc/WooClient.js';
import WooItem from '../wc/WooItem.js';
import WooCurrencies from '../wc/WooCurrencies.js';

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
  id: '12345',
  status: 'STATUS',
  total: '123.45',
  currency: 'usd',
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

// async function runCommand(...args) {
//   process.argv = [
//     "node", // Not used but a value is required at this index in the array
//     "cli.js", // Not used but a value is required at this index in the array
//     ...args,
//   ];

//   // Require the yargs CLI script
//   return require("./cli");
// }

test('Get.createCommands() should return a Promise', async (t) => {
  const get = createGet();
  const result = get.createCommands();
  t.true(result instanceof Promise);
  await result;
});

test('Get.createCommand("foo") should return a Promise', async (t) => {
  const get = createGet();
  const result = get.createCommand('foo');
  t.true(result instanceof Promise);
  await result;
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
        `FN(${field})`) as unknown as FieldValueCallback<WooItem>,
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake empty args
  const result = get.run('foo', {}, client);
  t.true(result instanceof Promise);
  await result;
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake empty args
  const result = get.run('foo', {}, client);
  t.true(stub.calledWith('data/currencies'));
  await result;
});

test('Get.run() should request items', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake empty args
  const result = get.run('foo', {}, client);
  t.true(stub.calledWith('orders'));
  await result;
});

test('Get.run() should not throw with valid (stub) data', async (t) => {
  const get = createGet();
  const { client, stub } = createClientStub();

  stub.withArgs('data/currencies').resolves(currencies);
  stub.withArgs('orders').resolves([order]);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- fake empty args
  const result = get.run('foo', {}, client);
  await t.notThrowsAsync(async () => {
    await result;
  });
});
