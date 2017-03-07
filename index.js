'use strict';

const util = require('util');
const url = require('url');
const Promise = require('bluebird');
const R = require('ramda');
const chalk = require('chalk');
const sprintf = require('sprintf-js');
const WooCommerce = require('woocommerce-api');
// const request = require('request-promise');
const linkParser = require('parse-link-header');
const program = require('commander');
const pkgInfo = require('./package.json');

program
    .version(pkgInfo.version)
    .parse(process.argv);

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
const debug = log(chalk.white);
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
    var items = [];
    for (var item of order.line_items) {
        item = R.clone(item);
        item.order = order;
        items.push(item);
    }
    return items;
}


function showItem(item) {
    // debugObj(item);
    var order = item.order;
    console.log(sprintf.sprintf(
        '#%d %s %s, %d %s, %s',
        order.id,
        order.billing.first_name,
        order.billing.last_name,
        item.quantity,
        item.name,
        item.total
    ));
}

log(chalk.cyan, 'starting...', []);

getAllPages('orders?status=completed&per_page=100')
    .tap(d => info('complete (%d items)!', d.length))
    // .each(showOrder)
    .map(itemize)
    .then(R.flatten)
    .each(showItem);
