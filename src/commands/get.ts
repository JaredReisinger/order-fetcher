import util from 'util';
import fs from 'fs';

import yargs from 'yargs';
import moment from 'moment-timezone';
// import chalk from 'chalk';
// import chalkTemplate from 'chalk-template';
import json2csv from 'json2csv';
import lodashGet from 'lodash.get';
// import * as printable from 'printable-characters';
import table, { ColumnUserConfig } from 'table';

import { Order, Currency } from 'woocommerce-api';

import * as helpers from '../helpers.js';
import WooClient from '../wc/WooClient.js';
import WooCurrencies from '../wc/WooCurrencies.js';
import WooItem from '../wc/WooItem.js';

import { ConfigFile, OptsHandler } from './config.js';

const writeFileAsync = util.promisify(fs.writeFile);

const whitespaceRE = /\s/g;
const excelDateTimeFmt = 'M/D/YYYY h:mm:ss A';

// table defines configs as readonly, but we build them piece by piece
type Writeable<T> = { -readonly [P in keyof T]: T[P] };

type AugmentedFieldInfo<T> = Omit<json2csv.FieldInfo<T>, 'label'> & {
  label: string; // always!
  config?: table.ColumnUserConfig;
};

interface Args {
  host?: string;
  // zone?: string;
  after?: moment.Moment;
  before?: moment.Moment;
  status?:
    | 'any'
    | 'pending'
    | 'processing'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'refunded'
    | 'failed'
    | 'trash';
  sku?: string[];
  skuPrefix?: string[];
  out?: string;
}

export default class Get {
  hosts: ConfigFile['hosts'];
  timezone: string;
  handleGlobalOpts: OptsHandler;

  constructor(cfg: ConfigFile, handleGlobalOpts: OptsHandler) {
    this.hosts = cfg.hosts;
    this.timezone = cfg.timezone || moment.tz.guess();
    this.handleGlobalOpts = handleGlobalOpts;
  }

  async createCommands(): Promise<yargs.CommandModule<Args, Args>[]> {
    // create the base 'get' command, and also a per-host version that makes
    // the command-line easier for the user.
    const cmds = Object.keys(this.hosts).map((host) =>
      this.createCommand(host)
    );

    // now that we have host-specific variants, does the generic version matter
    // any longer?
    cmds.push(this.createCommand());
    return Promise.all(cmds);
  }

  // For complicated commands you can pull the logic into a module. A module
  // simply needs to export:
  //
  //   command:   string (or array of strings) that executes this command when
  //              given on the command line, first string may contain positional
  //              args
  //
  //   aliases:   array of strings (or a single string) representing aliases of
  //              exports.command, positional args defined in an alias are
  //              ignored
  //
  //   describe:  string used as the description for the command in help text,
  //              use false for a hidden command
  //
  //   builder:   object declaring the options the command accepts, or a
  //              function accepting and returning a yargs instance
  //
  //   handler:   a function which will be passed the parsed argv.
  async createCommand(host?: string): Promise<yargs.CommandModule<Args, Args>> {
    const command = host || 'get';
    // const aliases = '*'; // this is the default command
    const aliases = undefined;
    const describe = `gets orders from ${
      host ? `the ${host}` : 'a'
    } WooCommerce site`;

    const builder: yargs.CommandBuilder<Args, Args> = (yargs) => {
      if (!host) {
        yargs.option('host', {
          describe: 'Connect to the given host',
          choices: Object.keys(this.hosts),
          required: true,
        });
      }
      yargs
        .option('after', {
          describe: 'Include only orders after the given date (inclusive)',
          coerce: (val: string) => helpers.asMoment(val, this.timezone),
        })
        .option('before', {
          describe: 'Include only orders before the given date (inclusive?)',
          coerce: (val: string) => helpers.asMoment(val, this.timezone),
        })
        .option('status', {
          describe: 'Include only orders with the given status',
          choices: [
            'any',
            'pending',
            'processing',
            'on-hold',
            'completed',
            'cancelled',
            'refunded',
            'failed',
            'trash',
          ],
          default: 'any',
        })
        .option('sku', {
          describe: 'Filter to the specific sku, can be given multiple times',
          array: true,
        })
        .option('sku-prefix', {
          describe:
            'Filter to the specific sku prefix, can be given multiple times',
          array: true,
        })
        .option('out', {
          alias: 'o',
          describe: 'File to write (CSV format)',
        })
        .epilogue(
          `Best Practices:

  For WooCommerce installations with a large number of historical orders, making use of the '--after' options is highly recommended.  Similarly, use '--status processing' to only include orders that haven’t been handled yet.  (And then mark those orders as "completed" as soon as you deal with them.)

  When generating CSV output, the columns come directly from the item information in WooCommerce.  More than likely, you'll want to use the '--sku' option to create CSV files on a sku-by-sku basis.

Examples:

    $0 host1 --after 2018-01-01 --status processing --list-skus

  Retrieve all orders after 1 January 2018 (inclusive) with a status of "procesing", and list the unique SKUs.  This is useful as a precursor to creating per-SKU CSV files.

    $0 host1 --after 2018-01-01 --status processing --sku some-sku --out some-sku.csv

  Retrieve all orders as the previous command, filter the items to the SKU 'some-sku', and write to 'some-sku.csv'.`
        );

      return yargs;
    };

    const handler = this.run.bind(this, host);

    return {
      command,
      aliases,
      describe,
      builder,
      handler,
    };
  }

  //         if (hosts.length !== 0) {
  //           console.log(chalkTemplate`{red Creating the config file:
  //
  //   You do not appear to have any hosts listed in a {cyan ~/.${pkgInfo.name}.json}
  //   file.  Please see:
  //       {cyan.underline ${pkgInfo.homepage}}
  //   for instructions onsetting this up.}
  // `);
  //         }
  //       })
  //       // .action(this.handleGlobalOpts)
  //       .action(this.run);
  //   }

  async run(
    seededHost: string | undefined,
    argv: yargs.ArgumentsCamelCase<Args>,
    clientOverride?: WooClient
  ) {
    // REVIEW: if we make a base class for the command, the wrapper and calling
    // the common handler could be moved there!
    this.handleGlobalOpts(argv);

    helpers.dbg(1, 'starting...');
    helpers.dbg(2, 'argv', argv);
    helpers.dbg(3, 'this', this);
    helpers.dbg(3, 'seededHost', seededHost || '(none)');

    const host = this.hosts[seededHost || argv.host || ''];

    if (!host) {
      throw new helpers.UserError(
        `host "${seededHost || argv.host}" not recognized`
      );
    }

    const client =
      clientOverride ?? new WooClient(host.url, host.key, host.secret);

    // Get orders/items and the currencies in parallel.  We could delay awaiting
    // on the currencies until just before generating the CSV, but the code is a
    // bit cleaner to await them both at the same time (we don't have to track a
    // pending promise) and it's unlikely to make a huge performance difference.
    const [wcOrders, wcCurrencies] = await Promise.all([
      // We *could* get all products to filter by skus/categories that way..
      client.getAll<Order>('orders', createParams(argv), 'id'),
      client.getAll<Currency>('data/currencies', undefined, 'code'),
    ]);

    helpers.dbg(1, `retrieved ${wcOrders.length} orders...`);
    helpers.dbg(3, 'wcOrders', wcOrders);

    const currencies = new WooCurrencies(wcCurrencies);
    let items = WooItem.fromOrdersJson(wcOrders /*, argv.sku*/);

    if (argv.sku) {
      const skus = argv.sku;
      items = items.filter((i) => skus.includes(i.sku));
      helpers.out(`found ${items.length} ${skus.join(',')} items...`);
      helpers.dbg(2, 'filtered items (sku)', items);
    }

    if (argv.skuPrefix) {
      const prefixes = argv.skuPrefix;
      items = items.filter((i) => prefixes.some((p) => i.sku.startsWith(p)));
      helpers.out(`found ${items.length} ${prefixes.join(',')} items...`);
      helpers.dbg(2, 'filtered items (sku prefix)', items);
    }

    // const metaOnly = this.opts.listSkus || this.opts.listStatuses;
    //
    // if (metaOnly) {
    //   if (this.opts.listSkus) {
    //     listFieldValues(items, 'sku');
    //   }
    //
    //   if (this.opts.listStatuses) {
    //     listFieldValues(items, 'status', item => item.order.status);
    //   }
    //
    //   return;
    // }

    if (argv.out) {
      const csv = this.generateCsv(items, currencies);
      await writeFileAsync(argv.out, csv);
    } else {
      const display = this.generatePretty(items, currencies);
      helpers.out(display);
    }
  }

  generateCsv(items: WooItem[], currencies: WooCurrencies) {
    const fields = this.defineFields(items, currencies);
    const csv = json2csv.parse(items, { fields });
    return csv;
  }

  generatePretty(items: WooItem[], currencies: WooCurrencies) {
    helpers.dbg(1, 'found items...', items);
    const ignoredFields = ['address', 'phone', 'method', 'transID'];
    const fields = this.defineFields(items, currencies).filter(
      (f) =>
        !ignoredFields.includes(f.label) &&
        items.some((i) => this.getValue(i, f) !== '')
    );

    // If there are no items, the "hide columns with no data" will cause our
    // fields filter to go to zero length!
    if (!items || items.length === 0 || fields.length === 0) {
      return '(no items!)';
    }

    // tweak the date formatter... We could do really smart stuff and determine
    // that *if* we know we'll be wrapping, use a 2-line date format and make
    // the date column smaller than the calcuated "min" width.
    fields[1].value = (item: WooItem) => {
      const date = moment(item.order.date)
        .tz(this.timezone)
        .format('YYYY-MM-DD');

      const time = moment(item.order.date).tz(this.timezone).format('hh:mm a');

      // return chalkTemplate`${date} {gray ${time}}`;
      return `${date} ${time}`;
    };

    const data = items.map((i) => fields.map((f) => this.getValue(i, f)));
    // unshift the header labels into the beginning of the array
    data.unshift(fields.map((f) => f.label));
    helpers.dbg(2, 'data', data);

    // TODO: determine the maximum width of each column, and then set column
    // configs to prevent line-wrapping on the console.  For now we very cheaply
    // assume an even share of the console width.  (See table's width calculation
    // for an example.)
    const defaultWidth = process.stdout.isTTY
      ? Math.floor(process.stdout.columns / fields.length) - 2
      : 80;

    // very temporary better-than-nothing width calcs...
    const columns = fields.map((f) => {
      const config: Writeable<ColumnUserConfig> = {};
      if (process.stdout.isTTY) {
        // prettier-ignore
        switch (f.label) {
          case 'order#': config.width = 6;            break;
          case 'date':   config.width = 10;           break;
          case 'status': config.width = 10;           break;
          case 'item':   config.width = defaultWidth * 2; break;
          case 'qty':    config.width = 3;            break;
          case 'total':  config.width = 7;            break;
          case 'note':   config.width = defaultWidth * 2; break;
          default:       config.width = defaultWidth; break;
        }
      }
      if (f.config) {
        Object.assign(config, f.config);
      }
      return config;
    });

    return table.table(data, {
      columns,
      // we *only* want a border between the headers and data
      border: {
        topBody: '', // '-',
        topJoin: '', // '+',
        topLeft: '', // '+',
        topRight: '', // '+',
        bottomBody: '', // '-',
        bottomJoin: '', // '+',
        bottomLeft: '', // '+',
        bottomRight: '', // '+',
        bodyLeft: '', // '|',
        bodyRight: '', // '|',
        bodyJoin: '', // '|',
        joinBody: '-',
        joinLeft: '', // '|',
        joinRight: '', // '|',
        joinJoin: '', // '|',
      },
      drawHorizontalLine: (index) => index === 1,
    });
  }

  getValue(item: WooItem, field: AugmentedFieldInfo<WooItem>) {
    return this.sanitizeString(
      typeof field.value === 'function'
        ? field.value(item, field as json2csv.FieldValueCallbackInfo) || ''
        : lodashGet(item, field.value, '')
    );
  }

  sanitizeString(val: string) {
    return (
      (val.toString() || '')
        // .replace(printable.ansiEscapeCodes, '')
        .replace(whitespaceRE, ' ')
    );
  }

  defineFields(items: WooItem[], currencies: WooCurrencies) {
    // We always wants these fields first... each item is either used as both a
    // key and label, or is a [label, key] pair (or [label, key, config]).
    const fieldLabelKeys = [
      ['order#', 'order.id'],
      [
        'date',
        (item: WooItem) => this.formatDate(item.order.date),
        { wrapWord: true },
      ],
      ['status', 'order.status'],
      ['name', 'order.billing.name', { wrapWord: true }],
      ['email', 'order.billing.email'],
      ['address', 'order.billing.address', { wrapWord: true }],
      ['phone', 'order.billing.phone', { wrapWord: true }],
      // ['product', 'product_id'],
      ['sku', 'sku', { wrapWord: true }],
      ['item', 'name', { wrapWord: true }],
      ['qty', 'quantity', { alignment: 'right' }],
      [
        'total',
        (item: WooItem) =>
          this.formatAmount(item.total, item.order.currency, currencies),
        { alignment: 'right' },
      ],
      ['line', (item: WooItem) => item.order_line + 1],
      [
        'fees',
        (item: WooItem) =>
          item.fees &&
          this.formatAmount(item.fees, item.order.currency, currencies),
        { alignment: 'right' },
      ],
      ['method', 'order.paymentMethod'],
      ['transID', 'order.transactionId'],
      ['note', 'order.note', { wrapWord: true }],
    ] as const;

    // map to { value: lookup-key, label: display-label } for csv
    const defaultFields = fieldLabelKeys.map<AugmentedFieldInfo<WooItem>>(
      (lk) => ({ value: lk[1], label: lk[0], config: lk[2] || {} })
    );

    helpers.dbg(4, 'default fields', defaultFields);

    // Then we want to add whatever meta fields exist on the items...
    const metaFields = this.collectMetaFields(items);

    return defaultFields.concat(metaFields);
  }

  // eslint-disable-next-line class-methods-use-this
  collectMetaFields(items: WooItem[]) {
    // While wc/v1 included separate label/key information in the line item
    // metadata, v2 and v3 have only the key.  For add-on properties, it is a
    // good displayable value; variation attributes, however, return the
    // attribute/variation *slug* as the key.  There's not much we can do about
    // this.  (In theory, we could introspect the product, but we don't want
    // that much detailed knowledge in this tool!)
    const slugs = new Set(items.flatMap((i) => Object.keys(i.meta)));
    helpers.dbg(3, 'meta slugs', slugs);
    const metaFields = [...slugs].map((s) => ({
      // value: `meta["${s}"].value`,
      value: `meta["${s}"]`,
      label: s,
    }));

    metaFields.sort((a, b) => helpers.stringCompare(a.label, b.label));
    helpers.dbg(3, 'metaFields', metaFields);

    return metaFields;
  }

  formatDate(d: moment.MomentInput) {
    return moment(d).tz(this.timezone).format(excelDateTimeFmt);
  }

  // eslint-disable-next-line class-methods-use-this
  formatAmount(amt: string, code: string, currencies: WooCurrencies) {
    return `${currencies.getSymbol(code)}${amt}`;
  }
}

// REVIEW: should this move to WooClient?
function createParams(opts: yargs.ArgumentsCamelCase<Args>) {
  const params: Record<string, string> = {
    per_page: '100',
    // per_page: '10',
    orderby: 'date',
    order: 'asc',
  };

  if (opts.after) {
    params.after = opts.after.format();
  }

  if (opts.before) {
    params.before = opts.before.format();
  }

  if (opts.status) {
    params.status = opts.status;
  }

  return params;
}

// function listFieldValues(items, key, fn) {
//   helpers.dbg(1, `finding ${key} values...`);
//
//   fn = fn || (item => item[key]); // eslint-disable-line no-param-reassign
//
//   // To get all values for a given property, we build a new map of values,
//   // then look at the keys.
//   const values = {};
//   for (const item of items) {
//     const val = fn(item);
//     values[val] = (values[val] || 0) + 1;
//   }
//
//   helpers.dbg(1, 'values', values);
//   helpers.out(
//     `${key} values: ${Object.keys(values)
//       .sort()
//       .map(i => chalk.cyan(i))
//       .join(', ')}`
//   );
// }
