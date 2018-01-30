'use strict';

import path from 'path';
import util from 'util';
import fs from 'fs';
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

import commander from 'commander';
import moment from 'moment-timezone';
import chalk from 'chalk';
import json2csv from 'json2csv';

import * as helpers from './helpers';
import WooClient from './woo-client';
import * as wooOrder from './woo-order';

import pkgInfo from '../package.json';

// You can't use 'await' outside of an 'async' function... so you have to use
// .then() at the top level.
main()
    .then(val => {
        // helpers.out(`${pkgInfo.name} complete: ${val}`, chalk.green);
        process.exit(0);
    })
    .catch(e => {
        helpers.err(e.toString())
        if (e.stack) {
            helpers.err(e.stack, chalk.white);
        }
        process.exit(1);
    });

async function main() {
    // Load the config file (if any) so that values for --host can be defined
    const config = await loadConfig();
    const hosts = Object.keys(config.hosts).sort();

    commander
        .version(`${pkgInfo.name} ${pkgInfo.version}`)
        .option('--host <host>', `connect to named host, one of: "${hosts.join('", "')}"; required`, new RegExp(`^(${hosts.join('|')})$`), null)
        .option('--after <date>', 'include only orders after the date', asMoment, null)
        .option('--before <date>', 'include only orders before the date', asMoment, null)
        .option('--list-statuses', 'list the availble statuses')
        .option('--status <status>', 'include only orders with the given status')
        .option('--list-skus', 'just list the availble skus')
        .option('--sku <sku-name>', 'filter to the specific sku')
        .option('-o, --out <filename>', 'file to write (CSV format)')
        .option('-v, --verbose', 'verbose logging output', increment, 0)
        .parse(process.argv);

    const opts = commander.opts();
    helpers.setVerbosity(opts.verbose);
    helpers.dbg(2, 'options', opts);

    // commander only has required *arguments*, not required options, but
    // arguments don't get extra help or parsing the way that options do.
    // Here, we error out for any missing but required options.
    if (!opts.host) {
        throw new Error('--host option is required');
    }

    helpers.dbg(1, 'starting...');

    const host = config.hosts[opts.host];
    if (!host) {
        throw new Error(`host "${opts.host}" not recognized`);
    }

    const client = new WooClient(host.url, host.key, host.secret);
    const params = createParams(opts);
    helpers.dbg(2, 'params', params);

    const orders = await client.getAll('orders', params);
    helpers.out(`retrieved ${orders.length} orders...`);
    // helpers.dbg(2, 'orders', orders);

    let items = wooOrder.itemizeAll(orders);
    helpers.out(`found ${items.length} items...`);
    helpers.dbg(2, 'items', items);

    if (opts.sku) {
        items = items.filter(i => i.sku === opts.sku);
        helpers.out(`found ${items.length} ${opts.sku} items...`);
    }

    const metaOnly = opts.listSkus || opts.listStatuses;

    if (metaOnly) {
        if (opts.listSkus) {
            listFieldValues(items, 'sku');
        }

        if (opts.listStatuses) {
            listFieldValues(items, 'status', item => item.order.status);
        }

        return;
    }

    const csv = generateCsv(items);

    if (!opts.out) {
        helpers.out(csv);
        return true;
    }

    await writeFileAsync(opts.out, csv);
}

async function loadConfig() {
    try {
        const data = await readFileAsync(path.join(process.env.HOME, `.${pkgInfo.name}.json`));
        return JSON.parse(data);
    } catch (e) {
        // We *could* check the error code for errno -2 (ENOENT), but really
        // any failure means we should have the default config...
        // console.error(e);
        return {
            hosts: {},
        };
    }
}

function increment(ignored, total) {
    console.error(chalk.white(`incrementing ${total}...`));
    return total + 1;
}

function asMoment(val) {
    const date = moment.tz(val, moment.tz.guess());
    if (!date.isValid()) {
        throw new Error(`date not understood: "${val}"`);
    }
    return date;
}

function createParams(opts) {
    const params = {
        per_page: 100,
        // per_page: 10,
        orderby: 'date',
        order: 'asc',
    };

    if (opts.after) {
        params.after = opts.after.format();
    }

    if (opts.before) {
        params.after = opts.before.format();
    }

    if (opts.status) {
        params.status = opts.status;
    }

    return params;
}


function listFieldValues(items, key, fn) {
    helpers.dbg(1, `finding ${key} values...`);

    fn = fn || (item => item[key]);

    // To get all values for a given property, we build a new map of values,
    // then look at the keys.
    const values = {};
    for (const item of items) {
        const val = fn(item);
        values[val] = (values[val] || 0) + 1;
    }

    helpers.dbg(1, 'values', values);
    helpers.out(`${key} values: ${Object.keys(values).sort().map(i => chalk.cyan(i)).join(', ')}`);
}

function generateCsv(items) {
    // We always wants these fields first...
    const fields = [{
        value: 'order.id',
        label: 'order#',
    },{
        value: 'order.date_created',
        label: 'date',
    },{
        value: 'order.status',
        label: 'status',
    },{
        value: 'order.billing.full_name',
        label: 'name',
    },{
        value: 'order.billing.email',
        label: 'email',
    },{
        value: 'order.billing.address_single',
        label: 'address',
    },{
        value: 'order.billing.phone',
        label: 'phone',
    },{
        value: 'sku',
        label: 'sku',
    },{
        value: 'name',
        label: 'item',
    },{
        value: 'quantity',
        label: 'quantity',
    },{
        value: 'total',
        label: 'total',
    },{
        value: 'order.payment_method',
        label: 'method',
    },{
        value: 'order.transaction_id',
        label: 'transID',
    },{
        value: 'order.customer_note',
        label: 'note',
    }];

    // Then we want to add whatever meta fields exist on the items...
    const metaKeys = {};
    const metaFields = [];
    for (const item of items) {
        for (const key of Object.keys(item.meta)) {
            if (metaKeys[key]) {
                continue;
            }

            const field = {
                value: `meta["${key}"].value`,
                label: item.meta[key].label,
            };

            metaKeys[key] = field;
            metaFields.push(field);
        }
    }

    metaFields.sort((a,b) => helpers.stringCompare(a.label, b.label));

    const csv = json2csv({ data: items, fields: fields.concat(metaFields) });
    return csv;
}
