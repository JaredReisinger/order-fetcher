# order-fetcher

Retrieves WooComerce line-item order information and displays it in your terminal or saves it as a CSV file.

[![npm version](https://img.shields.io/npm/v/order-fetcher.svg?logo=npm)](https://www.npmjs.com/package/order-fetcher)
![node version](https://img.shields.io/node/v/order-fetcher?logo=node.js&logoColor=white)
![license](https://img.shields.io/github/license/JaredReisinger/order-fetcher)
[![build status](https://img.shields.io/github/actions/workflow/status/JaredReisinger/order-fetcher/build.yml?branch=main&logo=github)](https://github.com/JaredReisinger/order-fetcher/actions?query=workflow%3Abuild+branch%3Amain)
[![code coverage](https://img.shields.io/codecov/c/github/JaredReisinger/order-fetcher.svg?logo=codecov&logoColor=white)](https://codecov.io/github/JaredReisinger/order-fetcher)
[![snyk vulnerabilities](https://snyk.io/test/github/jaredreisinger/order-fetcher/badge.svg)](https://snyk.io/test/github/jaredreisinger/order-fetcher)
[![dependencies](https://img.shields.io/librariesio/github/JaredReisinger/order-fetcher)](https://libraries.io/github/JaredReisinger/order-fetcher)
![npm downloads](https://img.shields.io/npm/d18m/order-fetcher)
[![commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![contributor covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://github.com/JaredReisinger/order-fetcher/blob/main/docs/CODE_OF_CONDUCT.md)
![designed for WordPress](https://img.shields.io/badge/designed%20for-WordPress-%2321759B?logo=wordpress&logoColor=white)
![designed for WooCommerce](https://img.shields.io/badge/designed%20for-WooCommerce-%2396588A?logo=woo&logoColor=white)

![](./docs/order-fetcher.png)

## Purpose

This tool is intended to help in cases where line-item order information needs to be collated/managed per-sku, rather than per-order. For example, one dog club uses a WordPress/WooCommerce site to collect orders for things related to a dog show, and each "thing" is handled by a different person. They use `order-fetcher` with the `--sku` and `--sku-prefix` flags to extract the details on a product-by-product basis, and disseminate that information to the appropriate person.

## Getting started

After installing `order-fetcher` (via `npm install -g order-fetcher`), you can run `orders config init` to create your initial configuration file. It will ask a bunch of questions to help get everything set up. You will need to make sure that the [WooCommerce API is enabled, and that you have a key and secret defined](https://docs.woocommerce.com/document/woocommerce-rest-api/). Because `order-fetcher` only ever retrieves data, and never makes changes to your site, it only requires read-only access.

The nickname you give your site allows you to disambiguate if you have more than one: `orders host1 ...` and `orders host2 ...` will retrieve data from either “host1” or “host2”, assuming those are the nicknames you gave. (But please, for your own sanity, use useful and memorable nicknames!)

If you don’t have too many historical orders on your site, your first request can be as simple as `orders host1`. If you have a lot of orders, however, that command can take a while. Using the `--after` option to only include orders on-or-after a particular date (like `orders host1 --after 2019-07-01`) can dramatically improve performance.

## Usage

When all else fails, `orders --help` (or `order-fetcher --help`) lists all of the available options.

### Top-level commands/options

| command                    | description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `config`                   | shows configuration information                                   |
| `get` _(or host nickname)_ | retrieves orders from a WooCommerce site                          |
| `-v`, `--verbose`          | increase verbosity of logging output, can be given multiple times |
| `-h`, `--help`             | output usage information                                          |
| `--version`                | output the version number                                         |

### `config` commands/options

| option                        | description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| `init`                        | interactive first-time configuration set up                 |
| `view`                        | show current configuration                                  |
| `add` _[host-nickname]_       | add a new WooCommerce host (interactive, like init)         |
| `remove` _[host-nickname]_    | remove an existing WooCommerce host                         |
| `timezone` (or `tz`) _[zone]_ | change the timezone (interactive if `zone` is not provided) |
| `-h`, `--help`                | output usage information                                    |

### `get` (or _`host-nickname`_) options

| option                     | description                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--host` _host-nickname_   | WooCommerce host to use _(**only** for `orders get`, not needed when using a nickname directly)_                 |
| `--after` _date_           | include only orders after the date                                                                               |
| `--before` _date_          | include only orders before the date                                                                              |
| `--status` _status_        | include only orders with the given status                                                                        |
| `--sku` _sku_              | filter to the specific sku, can be given multiple times (default: )                                              |
| `--sku-prefix` _skuPrefix_ | filter to the sku prefix, can be given multiple times (default: )                                                |
| `--list-skus`              | list the skus found in the orders                                                                                |
| `--list-statuses`          | list the statuses found in the orders                                                                            |
| `--list-columns`           | list the available columns found in the items                                                                    |
| `--omit-blanks`            | omits columns where every item's value is blank or missing                                                       |
| `--omit-identical`         | omits columns where every item's value is identical                                                              |
| `--omit-payment`           | omits payment columns (including payer address and phone)                                                        |
| `--omit` _column_          | omits a specific column                                                                                          |
| `--include` _column_       | includes a specific column                                                                                       |
| `--columns` _column-list_  | selects an exact set of columns to display (comma-separated names, use `\,` to include a comma in a column name) |
| `-o`, `--out` _filename_   | file to write (CSV format)                                                                                       |

### Best practices

For WooCommerce installations with a large number of historical orders, making use of the `--after` options is highly recommended. Similarly, use `--status processing` to only include orders that haven't been handled yet. (And then mark those orders as "completed" as soon as you deal with them.)

When generating CSV output, the columns come directly from the item information in WooCommerce. More than likely, you'll want to use the `--sku` option to create CSV files on a sku-by-sku basis.

### About column filtering

The various `--omit...` and `--include` options control whether columns are included or omitted in the output. As a rule of thumb, columns are included for CSV file output for consistency across invocations, and the `--omit-...` options are enabled by default for screen output to reduce line-wrapping. If you need to _not_ omit columns for screen output, you can prefix the option with `no`, as in `--no-omit-identical`.

If the `--omit-...` options are too coarse, you can enable or disable individual columns using the `--include` and `--omit` options, or for complete control use the `--columns` option to specify _exactly_ what columns you want displayed and in what order they will appear. Using `--list-columns` will list all of the columns present in a given set of items. Do note that unless you use `--columns` to specify an exact set, the following columns are _always_ included: "order#", "date", "name", "email", "qty", and "total".

The `--columns` option also allows for columns/fields with commas in the name by backslash-escaping the comma, `as\,such`. You can also provide column aliases if you need to rename the output column using the `alias=real_name` syntax.

### Examples

```sh
orders host1 --after 2019-01-01 --status processing --list-skus
```

Retrieve all order line-items after 1 January 2019 (inclusive) with a status of "processing", and list the unique SKUs. This is useful as a precursor to creating per-SKU CSV files.

```sh
orders host1 --after 2019-01-01 --status processing --sku some-sku --out some-sku.csv
```

Retrieve all order line-items as in the previous command, filter the items to the sku `some-sku`, and write to 'some-sku.csv'.

```sh
orders host1 --sku-prefix some-sku --list-columns
```

Retrieve all order line-items with a sku that starts with `some-sku`, and list the available columns.

```sh
orders host1 --after 2019-01-01 --sku-prefix some-sku --columns "name,email,image" --out some-sku.csv
```

Retrieve all order line-items with a sku that starts with `some-sku`, and write only the "name", "email", and "image" columns and to 'some-sku.csv'

```sh
orders host1 --after 2019-01-01 --sku some-sku --columns "name,count=qty" --out some-sku.csv
```

Retrieve all order line-items with the sku `some-sku` and write the column "name" and the "qty" column with the label "count" to 'some-sku.csv'
