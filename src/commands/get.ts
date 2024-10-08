import util from 'util';
import fs from 'fs';

import { ArgumentsCamelCase, CommandBuilder, CommandModule } from 'yargs';
import moment from 'moment-timezone';
import chalk from 'chalk';
import chalkTemplate from 'chalk-template';
import {
  Parser as Json2CsvParser,
  FieldInfo as Json2CsvFieldInfo,
  FieldValueGetterInfo as Json2CsvFieldValueGetterInfo,
} from '@json2csv/plainjs';
import lodashGet from 'lodash.get';
// import printable from 'printable-characters';
import table, { ColumnUserConfig } from 'table';

import { Order, Currency } from '../wc/woocommerce-types.js';
import WooClient from '../wc/WooClient.js';
import WooCurrencies from '../wc/WooCurrencies.js';
import WooItem from '../wc/WooItem.js';

import * as helpers from '../helpers.js';
import { ConfigFile, OptsHandler } from './config.js';

const writeFileAsync = util.promisify(fs.writeFile);

const whitespaceRE = /\s/g;
const excelDateTimeFmt = 'M/D/YYYY h:mm:ss A';
const excelDateFmt = 'M/D/YYYY';

// table defines configs as readonly, but we build them piece by piece
type Writeable<T> = { -readonly [P in keyof T]: T[P] };

type Displayable = string | number;

type DisplayableKey<T> = keyof {
  [P in keyof T as T[P] extends Displayable ? P : never]: T[P];
};

// Should we just curry in WooItem?
type FieldInfo = Omit<Json2CsvFieldInfo<WooItem, unknown>, 'label'> & {
  label: string; //always!
};

type FieldValueGetter = FieldInfo['value'];

type FieldValueGetterInfo = Json2CsvFieldValueGetterInfo<unknown>;

type AugmentedFieldInfo = FieldInfo & {
  config?: table.ColumnUserConfig;
  meta: {
    firstValue?: Displayable;
    allBlank: boolean;
    allIdentical: boolean;
    maximumWidth: number;
  };
};

// type FieldGetter = AugmentedFieldInfo['value'];

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
  listSkus?: boolean;
  listStatuses?: boolean;
  listColumns?: boolean;
  omitBlanks?: boolean;
  omitIdentical?: boolean;
  omitPayment?: boolean;
  omit?: string[];
  include?: string[];
  columns?: string;
  out?: string;
  // verifySsl?: boolean;
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

  async createCommands(): Promise<CommandModule<Args, Args>[]> {
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
  async createCommand(host?: string): Promise<CommandModule<Args, Args>> {
    const command = host || 'get';
    const aliases = undefined;
    const describe = `gets orders from ${host ? `the ${host}` : 'a'} WooCommerce site`;

    const builder: CommandBuilder<Args, Args> = (yargs) => {
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
        .option('list-skus', {
          describe: 'List the skus found in the orders',
          boolean: true,
          conflicts: ['out'],
        })
        .option('list-statuses', {
          describe: 'List the statuses found in the orders',
          boolean: true,
          conflicts: ['out'],
        })
        .option('list-columns', {
          describe: 'List the available columns found in the items',
          boolean: true,
          conflicts: ['out'],
        })
        .option('omit-blanks', {
          describe:
            "Omits columns where every item's value is blank or missing",
          defaultDescription: 'true when "--out" is not set',
          boolean: true,
        })
        .option('omit-identical', {
          describe: "Omits columns where every item's value is identical",
          defaultDescription: 'true when "--out" is not set',
          boolean: true,
        })
        .option('omit-payment', {
          describe: 'Omits payment columns (including payer address and phone)',
          defaultDescription: 'true when "--out" is not set',
          boolean: true,
        })
        .option('omit', {
          describe: 'Omits a specific column',
          array: true,
        })
        .option('include', {
          describe: 'Includes a specific column',
          array: true,
        })
        .option('columns', {
          describe:
            'Selects an exact set of columns to display (comma-separated names, use `\\,` to include a comma in a column name)',
        })
        .option('out', {
          alias: 'o',
          describe:
            'File to write (CSV format) (cannot be used with "--list-skus")',
          conflicts: ['list-skus', 'list-statuses'],
        })
        // .option('verify-ssl', {
        //   describe: 'Whether to verify the SSL certificate from the host',
        //   boolean: true,
        // })
        .group(['after', 'before', 'status'], 'Order Filtering')
        .group(['sku', 'sku-prefix'], 'Item Filtering')
        .group(
          [
            'omit-blanks',
            'omit-identical',
            'omit-payment',
            'omit',
            'include',
            'columns',
          ],
          'Column Filtering'
        )
        .group(['out'], 'Output')
        .group(
          ['list-skus', 'list-statuses', 'list-columns'],
          'Discovery (incompatible with "--out" option)'
        )
        .epilogue(
          `--------------------------------------------------------------------------------
Best Practices:

  For WooCommerce installations with a large number of historical orders, making use of the '--after' options is highly recommended.  Similarly, use '--status processing' to only include orders that haven’t been handled yet.  (And then mark those orders as "completed" as soon as you deal with them.)

  When generating CSV output, the columns come directly from the item information in WooCommerce.  More than likely, you'll want to use the '--sku' option to create CSV files on a sku-by-sku basis.

About Column Filtering:

  The various "--omit..." and "--include" options control whether columns are included or omitted in the output.  As a rule of thumb, columns are included for CSV file output for consistency across invocations, and the "--omit-..." options are enabled by default for screen output to reduce line-wrapping.  If you need to *not* omit columns for screen output, you can prefix the option with "no", as in "--no-omit-identical".

  If the "--omit-..." options are too coarse, you can enable or disable individual columns using the "--include" and "--omit" options, or for complete control use the "--columns" option to specify *exactly* what columns you want displayed and in what order they will appear.  Using "--list-columns" will list all of the column names present in a given set of items.  Do note that Do note that unless you use "--columns" to specify an exact set, the following columns are *always* included: "order#", "date", "name", "email", "qty", and "total".

  The "--columns" option also allows for columns/fields with commas in the name by backslash-escaping the comma, "as\\,such".  You can also provide column aliases if you need to rename the output column using the "alias=real_name" syntax.  Additionally, you can prefix a column/field with "[date]" to attempt to parse unix timestamps and format the values as dates.

Examples:

    $0 host1 --after 2018-01-01 --status processing --list-skus

  Retrieve all orders after 1 January 2018 (inclusive) with a status of "processing", and list the unique SKUs.  This is useful as a precursor to creating per-SKU CSV files.

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

  async run(
    seededHost: string | undefined,
    argv: ArgumentsCamelCase<Args>,
    clientOverride?: WooClient
  ) {
    // REVIEW: if we make a base class for the command, the wrapper and calling
    // the common handler could be moved there!
    this.handleGlobalOpts(argv);

    helpers.dbg(1, 'starting...');
    helpers.dbg(2, 'argv', argv);
    helpers.dbg(3, 'this', this);
    helpers.dbg(3, 'seededHost', seededHost || '(none)');

    // The default omitted fields depends on whether we're outputting to a file
    // or to the screen...  Similarly, omitting empty columns is done by default
    // on the screen, but *not* for a file (for run-over-run consistency).
    if (!argv.out) {
      argv.omitBlanks ??= true;
      argv.omitIdentical ??= true;
      argv.omitPayment ??= true;

      helpers.dbg(2, 'argv with defaults', argv);
    }

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
      helpers.dbg(3, 'filtered items (sku)', items);
    }

    if (argv.skuPrefix) {
      const prefixes = argv.skuPrefix;
      items = items.filter((i) => prefixes.some((p) => i.sku.startsWith(p)));
      helpers.out(`found ${items.length} ${prefixes.join(',')} items...`);
      helpers.dbg(3, 'filtered items (sku prefix)', items);
    }

    helpers.dbg(2, 'found items...', items);

    if (!items || items.length === 0) {
      helpers.out('(no items!)');
      return;
    }

    // Determine all the fields based on the items, and analyze them so that we
    // can (potentially) omit some...
    const allFields = this.discoverFields(items, currencies);

    const metaOnly = argv.listSkus || argv.listStatuses || argv.listColumns;

    if (metaOnly) {
      if (argv.listSkus) {
        listFieldValues(items, 'sku');
      }

      if (argv.listStatuses) {
        listFieldValues(items, 'status', (item) => item.order.status);
      }

      if (argv.listColumns) {
        listFieldValues(allFields, 'column', (f) => f.label);
      }

      return;
    }

    let fields: typeof allFields;

    if (argv.columns) {
      fields = this.createColumnFields(argv.columns, allFields);
    } else {
      // Regardless of the "--omit-..." options, we *always* want to include the
      // quantity and total.
      const isRequired = (f: AugmentedFieldInfo) =>
        ['order#', 'date', 'name', 'email', 'qty', 'total'].includes(f.label);

      const isIncluded = (f: AugmentedFieldInfo) =>
        argv.include?.includes(f.label);

      const isOmitted = (f: AugmentedFieldInfo) =>
        (argv.omitBlanks && f.meta.allBlank) ||
        (argv.omitIdentical && f.meta.allIdentical) ||
        (argv.omitPayment &&
          ['method', 'transID', 'address', 'phone'].includes(f.label)) ||
        argv.omit?.includes(f.label);

      fields = allFields.filter((f) => {
        // helpers.dbg(1, 'field?', {
        //   label: f.label,
        //   reqd: isRequired(f),
        //   omit: isOmitted(f),
        // });
        return isRequired(f) || isIncluded(f) || !isOmitted(f);
      });
    }
    if (argv.out) {
      const csv = this.generateCsv(items, fields);
      await this.writeFile(argv.out, csv);
    } else {
      const display = this.generatePretty(items, fields);
      helpers.out('');
      helpers.out(display);
    }
  }

  generateCsv(items: WooItem[], fields: AugmentedFieldInfo[]) {
    const parser = new Json2CsvParser({ fields, withBOM: true });
    const csv = parser.parse(items);
    // const csv = json2csv.parse(items, { fields, withBOM: true });
    return csv;
  }

  async writeFile(filename: string, content: string) {
    await writeFileAsync(filename, content);
  }

  generatePretty(items: WooItem[], fields: AugmentedFieldInfo[]) {
    // colorize the date field, for fun...
    fields.forEach((f) => {
      if (f.label === 'date') {
        f.value = (item: WooItem) => {
          const date = moment(item.order.date)
            .tz(this.timezone)
            .format('YYYY-MM-DD');

          const time = moment(item.order.date)
            .tz(this.timezone)
            .format('hh:mm a');

          return chalkTemplate`${date} {gray ${time}}`;
          // return `${date} ${time}`;
        };
      }
    });

    const data = items.map((i) => fields.map((f) => this.getValue(i, f)));
    // unshift the header labels into the beginning of the array
    data.unshift(fields.map((f) => f.label));
    helpers.dbg(2, 'data', data);

    // Attempt to optimize column wrapping...
    const screenWidth = process.stdout.isTTY ? process.stdout.columns : 80;
    const ttyWidths = fields.map((f) => f.meta.maximumWidth);
    let idealWidth = ttyWidths.reduce((acc, val) => acc + val + 2, 0);
    let needWrapping = idealWidth > screenWidth;

    helpers.dbg(3, 'fields', { screenWidth, idealWidth, ttyWidths });

    // *if* we need wrapping, we *know* that we can wrap the date field, and it
    // might be enough...
    if (needWrapping) {
      fields.forEach((f, i) => {
        if (f.label === 'date') {
          const delta = ttyWidths[i] - 10;
          ttyWidths[i] = 11;
          idealWidth -= delta;
        }
      });

      helpers.dbg(3, 'fields', { screenWidth, idealWidth, ttyWidths });
    }

    needWrapping = idealWidth > screenWidth;

    // We don't want to scale the fields evenly, we want to reduce the *fewest*
    // needed to get to the screen width.  This means starting with the biggest
    // fields, and halving or 2/3-ing them.
    while (needWrapping) {
      const i = ttyWidths.indexOf(Math.max(...ttyWidths));
      const delta = Math.ceil(ttyWidths[i] / 2);
      ttyWidths[i] -= delta;
      idealWidth -= delta;
      needWrapping = idealWidth > screenWidth;
      helpers.dbg(3, 'fields', { screenWidth, idealWidth, ttyWidths });
    }

    const columns = fields.map((f, i) => {
      const config: Writeable<ColumnUserConfig> = {};
      if (process.stdout.isTTY) {
        config.width = ttyWidths[i];
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

  getValue(item: WooItem, field: FieldInfo) {
    return this.sanitizeString(
      typeof field.value === 'function'
        ? field.value(item, field) || ''
        : lodashGet(item, field.value, '')
    );
  }

  sanitizeString(val: string) {
    return (val.toString() || '').replace(whitespaceRE, ' ');
    // .replace(printable.ansiEscapeCodes, ''); // can't do this... chalk!
  }

  discoverFields(items: WooItem[], currencies: WooCurrencies) {
    // We always wants these fields first... each item is either used as both a
    // key and label, or is a [label, key] pair (or [label, key, config]).
    const fieldLabelKeys = [
      ['order#', 'order.id'],
      [
        'date',
        (item: WooItem) => this.formatDateTime(item.order.date),
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

      // The "line number" isn't actually important... it was/is used in
      // diagnosing parsing/processing.
      //
      // ['line', (item: WooItem) => item.order_line + 1],

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

    const defaultFields = fieldLabelKeys.map<AugmentedFieldInfo>((lk) => ({
      value: lk[1],
      label: lk[0],
      config: lk[2] || {},
      meta: {
        firstValue: undefined,
        allBlank: true,
        allIdentical: true,
        maximumWidth: lk[0].length,
      },
    }));

    helpers.dbg(4, 'default fields', defaultFields);

    // Then we want to add whatever meta fields exist on the items...
    const metaFields = this.collectMetaFields(items);

    const allFields = defaultFields.concat(metaFields);

    // We run through *all* the items in order to populate the allBlanks,
    // allIdentical, and maximumWidth values.
    items.forEach((item, i) => {
      allFields.forEach((f) => {
        const value = this.getValue(item, f);
        if (i === 0) {
          f.meta.firstValue = value;
          f.meta.allIdentical = true;
          f.meta.allBlank = !value;
        } else if (value !== f.meta.firstValue) {
          f.meta.allIdentical = false;
          f.meta.allBlank &&= !value;
        }
        f.meta.maximumWidth = Math.max(f.meta.maximumWidth, value?.length ?? 0);
      });
    });

    helpers.dbg(3, 'all fields', allFields);

    return allFields;
  }

  collectMetaFields(items: WooItem[]): AugmentedFieldInfo[] {
    // For each key in the meta sub-object, create a field definition. Also be
    // aware that some meta fields can contain *lists*, in which case we create
    // a pseudo-field for each sub-item.
    const metaFieldMap: Record<string, AugmentedFieldInfo> = {};

    items.forEach((i) => {
      Object.entries(i.meta).forEach(([key, val]) => {
        // first, create a field for the main key if we haven't seen it yet
        if (!metaFieldMap[key]) {
          metaFieldMap[key] = {
            label: key,
            // we used to just use `meta["key"]` as the value accessor, but we
            // now need to also handle array-containing cases!
            value: (item: WooItem) => {
              const itemVal = item.meta[key];
              if (Array.isArray(itemVal)) {
                return itemVal.join(', ');
              }
              return itemVal;
            },

            config: {},

            meta: {
              allBlank: true,
              allIdentical: true,
              maximumWidth: key.length,
            },
          };
        }

        // now, include any sub-fields...
        if (Array.isArray(val)) {
          val.forEach((subval: string) => {
            const subkey = `${key}: ${subval}`;
            if (!metaFieldMap[subkey]) {
              metaFieldMap[subkey] = {
                label: subkey,
                // we used to just use `meta["key"]` as the value accessor, but we
                // now need to also handle array-containing cases!
                value: (item: WooItem) => {
                  const itemVal = item.meta[key];
                  if (
                    itemVal === subval ||
                    (Array.isArray(itemVal) && itemVal.includes(subval))
                  ) {
                    return 'YES';
                  }
                  return '';
                },

                config: {},

                meta: {
                  allBlank: true,
                  allIdentical: true,
                  maximumWidth: subkey.length,
                },
              };
            }
          });
        }
      });
    });

    const metaFields = Object.values(metaFieldMap)
      .sort((a, b) => helpers.stringCompare(a.label, b.label))
      .map((meta) => {
        if (meta.label.match(/date/i)) {
          return {
            ...meta,
            value: this.createDateWrapper(meta),
          };
        }
        return meta;
      });

    helpers.dbg(3, 'metaFields', metaFields);

    return metaFields;
  }

  formatDateTime(d: moment.MomentInput) {
    return moment(d).tz(this.timezone).format(excelDateTimeFmt);
  }

  formatDate(d: moment.MomentInput) {
    return moment(d).tz(this.timezone).format(excelDateFmt);
  }

  formatAmount(amt: string, code: string, currencies: WooCurrencies) {
    return `${currencies.getSymbol(code)}${amt}`;
  }

  createColumnFields(columns: string, allFields: AugmentedFieldInfo[]) {
    // If columns is given, create *exactly* those fields... note that a
    // column/meta name *can* contain a comma; we use "\," for this.  We used
    // to have a simple map() to process, but we need a loop to handle
    // "compressing" elements together if needed.
    const cols = columns.split(',');
    for (let i = 0; i < cols.length; i++) {
      // if the column ends with \, combine, and restart processing from the
      // same field (in case there's another escape!)
      const s = cols[i];
      if (s.endsWith('\\') && i + 1 < cols.length) {
        cols[i] = `${s.substring(0, s.length - 1)},${cols[i + 1]}`;
        cols.splice(i + 1, 1);
        i--;
        continue;
      }

      cols[i] = s.trim();
    }

    // We *used* to filter to only existing (found) columns/fields, but there
    // are cases where we need a placeholder column in the CSV... for an
    // occasional field, we don't want the output to change based on a
    // particular range *not* having the column!
    const fields = cols.map((c) => {
      // Handle date-picker fields (should we ever assume/check?)
      let convertDate = false;
      if (c.match(/^\[date\]/)) {
        convertDate = true;
        const tmp = c;
        c = c.substring(6);
        helpers.dbg(2, 'found date option', { c, tmp });
      }

      // We now support `alias=field_name` for a column, so we need to handle
      // parsing that.
      const alias = c.split('=', 2);
      const label = alias[0];
      const sourceLabel = alias[alias.length - 1];
      let col = allFields.find((f) => f.label === sourceLabel || f.label === c);

      helpers.dbg(1, 'found col', { col });
      if (col) {
        // check date?
        if (convertDate || c.match(/date/i)) {
          col = {
            ...col,
            meta: {
              ...col.meta,
              // maximumWidth: Math.max(col.meta.maximumWidth, 10),
            },
            value: this.createDateWrapper(col),
          };
        }
      }

      if (!col) {
        col = {
          label: alias[0],
          value: () => '',
          config: {},
          meta: {
            allBlank: true,
            allIdentical: true,
            maximumWidth: c.length,
          },
        };
      }

      if (alias.length > 1) {
        col = {
          ...col,
          label,
          meta: {
            ...col.meta,
            maximumWidth: Math.max(col.meta.maximumWidth, label.length),
          },
        };
      }

      return col;
    });

    helpers.dbg(2, 'columns', fields);
    return fields;
  }

  createDateWrapper(inner: AugmentedFieldInfo): FieldValueGetter {
    return (row: WooItem, field: FieldValueGetterInfo): unknown => {
      const innerValue = this.getValue(row, inner);
      let innerNum = 0;
      let tryConvert = false;

      helpers.dbg(2, 'converting date?', { innerValue });

      // Typescript can't track type through an intermediate variable, so we just
      // call typeof several times.
      if (typeof innerValue === 'number') {
        innerNum = innerValue;
        tryConvert = true;
      } else if (typeof innerValue === 'string') {
        if (innerValue.match(/^-?[0-9]{1,13}$/)) {
          innerNum = Number.parseInt(innerValue, 10);
          tryConvert = true;
        }
      }

      if (tryConvert) {
        if (innerNum > 999999999999 || innerNum < -999999999999) {
          innerNum /= 1000;
        }

        const date = moment.unix(innerNum);
        const dateFmt = this.formatDate(date);

        helpers.dbg(2, 'converting date', {
          label: field.label,
          innerValue,
          date,
          dateFmt,
        });

        return dateFmt;
      }

      helpers.dbg(2, "doesn't look like date", {
        label: field.label,
        innerValue,
      });
      return innerValue;
    };
  }
}

// REVIEW: should this move to WooClient?
function createParams(opts: ArgumentsCamelCase<Args>) {
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

// only need `key` to be a directly-displayable key when `fn` is *not*
// provided...
function listFieldValues<T>(items: T[], key: DisplayableKey<T>): void;
function listFieldValues<T>(
  items: T[],
  key: PropertyKey,
  fn: (_: T) => Displayable
): void;
function listFieldValues<T>(
  items: T[],
  key: PropertyKey,
  fn?: (_: T) => Displayable
) {
  helpers.dbg(1, `finding ${String(key)} values...`);

  const extractor =
    fn || ((item) => item[key as DisplayableKey<T>] as Displayable);

  // To get all values for a given property, we build a new map of values,
  // then look at the keys.
  const values: Record<Displayable, number> = {};
  for (const item of items) {
    const val = extractor(item);
    values[val] = (values[val] || 0) + 1;
  }

  helpers.dbg(1, 'values', values);
  helpers.out(
    `${String(key)} values: ${Object.keys(values)
      .sort()
      .map((i) => chalk.cyan(i))
      .join(', ')}`
  );
}

// function exists<T>(value: T | undefined | null | false | ''): value is T {
//   return !!value;
// }
