# order-fetcher

Retrieves WooComerce order information and saves it as a CSV file.

[![npm version](https://img.shields.io/npm/v/order-fetcher.svg?logo=npm)](https://www.npmjs.com/package/order-fetcher)
[![build status](https://img.shields.io/github/workflow/status/JaredReisinger/order-fetcher/build/master.svg?logo=github)](https://github.com/JaredReisinger/order-fetcher/actions?query=workflow%3Abuild+branch%3Amaster)
[![code coverage](https://img.shields.io/codecov/c/github/JaredReisinger/order-fetcher.svg?logo=codecov)](https://codecov.io/github/JaredReisinger/order-fetcher)
[![dependencies](https://img.shields.io/david/JaredReisinger/order-fetcher.svg)](https://david-dm.org/JaredReisinger/order-fetcher)
[![snyk vulnerabilities](https://img.shields.io/snyk/vulnerabilities/github/JaredReisinger/order-fetcher.svg?logo=snyk)](https://snyk.io/test/github/JaredReisinger/order-fetcher)

## Getting started

After installing `order-fetcher` (via `npm install -g order-fetcher`), you can run `orders config init` to create your initial configuration file. It will ask a bunch of questions to help get everything set up. You will need to make sure that the [WooCommerce API is enabled, and that you have a key and secret defined](https://docs.woocommerce.com/document/woocommerce-rest-api/). Because `order-fetcher` only ever retrieves data, and never makes changes to your site, it only requires read-only access.

The nickname you give your site allows you to disambiguate if you have more than one: `orders host1 ...` and `orders host2 ...` will retrieve data from either “host1” or “host2”, assuming those are the nicknames you gave. (But please, for your own sanity, use useful and memorable nicknames!)

If you don’t have too many historical orders on your site, your first request can be as simple as `orders host1`. If you have a lot of orders, however, that command can take a while. Using the `--after` option to only include orders on-or-after a particular date (like `orders host1 --after 2019-07-01`) can dramatically improve performance.

## Usage

As of v1.0, `order-fetcher` now also installs as the command `orders`, and uses a more “subcommand”-style command-line (like git, npm, and other tools). It also uses the host nicknames (as defined above, in [Getting Started](#getting-started)) as subcommand shortcuts rather than the older and more-verbose `--host hostname` flag. Note that you can still use `orders get --host host1 ...` rather than `orders host1 ...`, but you’ll find that the newer second invocation is more natural and involves less typing.

When all else fails, `orders --help` (or `order-fetcher --help`) lists all of the available options.

### Top-level commands/options

| command                     | description                                                       |
| --------------------------- | ----------------------------------------------------------------- |
| `config`                    | shows configuration information                                   |
| `get` _(or host nickname)_  | retrieves orders from a WooCommerce site                          |
| `list` _(or host nickname)_ | summarize skus and/or statuses from a WooCommerce site (TODO!)    |
| `-v`, `--verbose`           | increase verbosity of logging output, can be given multiple times |
| `-h`, `--help`              | output usage information                                          |
| `--version`                 | output the version number                                         |

### `config` commands/options

| option                        | description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| `init`                        | interactive first-time configuration set up                 |
| `view`                        | show current configuration                                  |
| `add` _[host]_                | add a new WooCommerce host (interactive, like init)         |
| `remove` _[host]_             | remove an existing WooCommerce host                         |
| `timezone` (or `tz`) _[zone]_ | change the timezone (interactive if `zone` is not provided) |
| `-h`, `--help`                | output usage information                                    |

### Get / Host-nickname commands/options

| option                   | description                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| `list`                   | summarize skus and/or statuses from a WooCommerce site (TODO)       |
| `--host` _host_          | WooCommerce host to use _(**only** for `orders get`)_               |
| `--after` _date_         | include only orders after the date                                  |
| `--before` _date_        | include only orders before the date                                 |
| `--status` _status_      | include only orders with the given status                           |
| `--sku` _sku_            | filter to the specific sku, can be given multiple times (default: ) |
| `-o`, `--out` _filename_ | file to write (CSV format)                                          |

### Best practices

For WooCommerce installations with a large number of historical orders, making use of the `--after` options is highly recommended. Similarly, use `--status processing` to only include orders that haven't been handled yet. (And then mark those orders as "completed" as soon as you deal with them.)

When generating CSV output, the columns come directly from the item information in WooCommerce. More than likely, you'll want to use the `--sku` option to create CSV files on a sku-by-sku basis.

### Examples

```sh
orders host1 --after 2019-01-01 --status processing --list-skus
```

Retrieve all orders after 1 January 2019 (inclusive) with a status of "processing", and list the unique SKUs. This is useful as a precursor to creating per-SKU CSV files.

```sh
orders host1 --after 2019-01-01 --status processing --sku some-sku --out some-sku.csv
```

Retrieve all orders as in the previous command, filter the items to the SKU 'some-sku', and write to 'some-sku.csv'.
