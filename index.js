'use strict';

const Promise = require('bluebird');
const util = require('util');
const url = require('url');
const fs = Promise.promisifyAll(require('fs'));
const R = require('ramda');
const moment = require('moment');
const chalk = require('chalk');
const sprintf = require('sprintf-js');
const json2csv = require('json2csv');
const WooCommerce = require('woocommerce-api');
// const request = require('request-promise');
const linkParser = require('parse-link-header');
const program = require('commander');
const pkgInfo = require('./package.json');

program
    .version(pkgInfo.version)
    .option('-a, --after <date>', 'include only orders after the date', asMoment)
    .option('-b, --before <date>', 'include only orders before the date', asMoment)
    .option('-l, --list-skus', 'just list the availble skus')
    .option('-s, --sku <sku-name>', 'filter to the specific sku')
    .option('-o, --out <filename>', 'file to write (CSV format)')
    .parse(process.argv);

function asMoment(val) {
    var date = moment(val);
    if (!date.isValid()) {
        return null;
    }
    return date;
}

var wc = new WooCommerce({
    url: 'http://seattledogshow.org',
    consumerKey: 'ck_d32da38e5a6299bf7d5724a6e7237bc028ea8ab7',
    consumerSecret: 'cs_70f190c242161647e5913319f57dae18aa41fa98',
    wpAPI: true,
    version: 'wc/v1',
});

// function log(colorFn, messageFmt, argList) {
//     console.log(colorFn(sprintf.vsprintf(messageFmt, argList)));
// }

const log = R.curry((colorFn, messageFmt, arg) => console.log(colorFn(sprintf.sprintf(messageFmt, arg))));
const nolog = R.curry((colorFn, messageFmt, arg) => { return; });
const debug = nolog(chalk.white);
const info = log(chalk.cyan);

function typeofWrapper(obj) { return typeof(obj); }

const type = R.compose(debug('type: %s'), chalk.gray, typeofWrapper);
const keys = R.compose(debug('keys: %s'), chalk.gray, Object.keys);
const allKeys = R.compose(debug('allKeys: %s'), chalk.gray, Object.getOwnPropertyNames);
const debugObj = R.compose(debug('%s'), util.inspect);


function getAllPages(endpoint) {
    var items = [];
    var pageNum = 1;

    return getPageAndLinks(endpoint);

    function getPageAndLinks(pageUrl) {
        debug('getting page %(page)d: %(url)s', {
            page: pageNum,
            url: pageUrl});
        return wc.getAsync(pageUrl)
            // .tap(debugObj)
            // .tap(type)
            // .tap(keys)
            .then(response => {
                if (response.statusCode !== 200) {
                    throw new Error(sprintf.sprintf('Unexpected status code: %d', response.statusCode));
                }

                var body = JSON.parse(response.body);
                var origCount = items.length;
                items = items.concat(body);
                debug(chalk.yellow('page %(page)d added %(new)d items (was %(orig)d)... now have %(total)d items'), {
                    page: pageNum,
                    orig: origCount,
                    new: body.length,
                    total: items.length,
                });

                // check for pagination...
                if (response.headers && response.headers.link) {
                    var links = linkParser(response.headers.link);
                    // type(links);
                    // debugObj(links);
                    if (links && links.next && links.next.url) {
                        // deconstruct/reconstruct the link... the API can't
                        // use it directly!
                        var uri = sprintf.sprintf("%s&page=%s", endpoint, links.next.page)

                        pageNum++;
                        return getPageAndLinks(uri);
                    }
                }

                return items;
            });
    }
}



function showOrder(order, index) {
    console.log(chalk.white(sprintf.sprintf(
        '#%s %s %s, %d items',
        chalk.gray(order.id.toString()),
        chalk.black(order.billing.first_name),
        chalk.black(order.billing.last_name),
        order.line_items.length
    )));
    for (const item of order.line_items) {
        console.log(chalk.gray(sprintf.sprintf(
            '  %s',
            util.inspect(item)
        )));
    }
}


function itemize(order) {
    var simplifiedOrder = R.pick(
        [
            'id', 'status', 'date_created', 'date_modified',
            'total', 'billing'
        ],
        order);

    simplifiedOrder.billing.full_name = sprintf.sprintf("%s %s", simplifiedOrder.billing.first_name || '',
                simplifiedOrder.billing.last_name || '').trim();

    var items = [];
    for (var item of order.line_items) {

        if (program.sku && item.sku !== program.sku) {
            continue;
        }

        var simplifiedItem = R.pick(
            [
                'id', 'name', 'sku', 'product_id', 'variation_id',
                'quantity', 'total'
            ],
            item);

        // In order to make the metadata usable, we transform it from a list of
        // objects (that happens to have a 'key' property) to a map using that
        // 'key' property as the key!
        simplifiedItem.meta = {};
        for (const m of item.meta) {
            simplifiedItem.meta[m.key] = R.omit(['key'], m);
        }

        // Graft the order onto each item.
        simplifiedItem.order = simplifiedOrder;

        items.push(simplifiedItem);
    }

    return items;
}


function showItem(item) {
    debugObj(item);
    var order = item.order;
    console.log(sprintf.sprintf(
        '#%d %s, %d %s, %s',
        order.id,
        order.billing.full_name,
        item.quantity,
        item.name,
        item.total
    ));
}

function listSkus(items) {
    info('listing skus...', null);
    var skus = R.uniq(R.pluck('sku', items));
    info('skus: %s', skus.join(', '));
    return skus;
}

function outputCsv(items) {
    info('generating csv...', null);
    return Promise.resolve(items)
        .then(generateCsv)
        .then(output);
}


function generateCsv(items) {
    var fields = [{
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
        value: 'order.billing.phone',
        label: 'phone',
    },{
        value: 'sku',
        label: 'sku',
    },{
        value: 'quantity',
        label: 'quantity',
    // },{
    //     value: '',
    //     label: '',
    }];

    // collect meta-fields from all line-items...
    var meta = R.reduce(includeMetaFields, { keys: {}, fields: [] }, items);

    fields = fields.concat(R.sortBy(R.prop('label'), meta.fields));

    var csv = json2csv({ data: items, fields: fields });
    return csv;
}

function includeMetaFields(data, item) {
    for (const key of R.keys(item.meta)) {
        if (data.keys[key]) {
            continue;
        }

        var field = {
            value: sprintf.sprintf('meta["%s"].value', key),
            label: item.meta[key].label,
        };

        data.keys[key] = field;

        data.fields.push(field);
    }

    return data;
}

function output(csv) {
    if (!program.out) {
        console.log(csv);
        return true;
    }

    return fs.writeFileAsync(program.out, csv);
}


log(chalk.cyan, 'starting...', []);

var orderUrl = 'orders?status=completed&per_page=100&orderby=date&order=asc';

if (program.after) {
    orderUrl = sprintf.sprintf('%s&after=%s', orderUrl, program.after.format());
}

if (program.before) {
    orderUrl = sprintf.sprintf('%s&before=%s', orderUrl, program.before.format());
}

getAllPages(orderUrl)
    .tap(d => info('retrieved %d orders...', d.length))
    // .each(showOrder)
    .map(itemize)
    .then(R.flatten)
    .tap(d => info('filtered to %d items...', d.length))
    .each(debugObj)
    //.each(showItem)
    // .then(decideOutput)
    .then(program.listSkus ? listSkus : outputCsv)
    .tap(() => info('complete!'));
