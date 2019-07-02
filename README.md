# order-fetcher

Retrieves WooComerce order information and saves it as a CSV file.

[![npm version](https://img.shields.io/npm/v/order-fetcher.svg)](https://www.npmjs.com/packages/order-fetcher)
[![build status](https://img.shields.io/travis/JaredReisinger/order-fetcher/master.svg)](https://travis-ci.org/JaredReisinger/order-fetcher)
[![code coverage](https://img.shields.io/codecov/c/github/JaredReisinger/order-fetcher.svg)](https://codecov.io/github/JaredReisinger/order-fetcher)
[![dependencies](https://img.shields.io/david/JaredReisinger/order-fetcher.svg)](https://david-dm.org/JaredReisinger/order-fetcher)

## Getting Started

For this tool to be useful at all, you'll need to make sure the [WooCommerce API is enabled, and that you have a key and secret defined](https://docs.woocommerce.com/document/woocommerce-rest-api/). At present, `order-fetcher` only requires read-only access; it has no ability to make changes to the order information on your site.

After installing `order-fetcher` (via `npm install -g order-fetcher`), create a config file at `~/.order-fetcher.json` for all of the WooCommerce sites you have:

```json
{
  "hosts": {
    "host1": {
      "url": "https://myhost.com",
      "key": "ck_0123456789abcdefxxxxx_EXAMPLE_ONLY",
      "secret": "cs_0123456789abcdefxxxxx_EXAMPLE_ONLY"
    },
    "host2": {
      "url": "https://example.org",
      "key": "ck_0123456789abcdefxxxxx_EXAMPLE_ONLY",
      "secret": "cs_0123456789abcdefxxxxx_EXAMPLE_ONLY"
    }
  }
}
```

The properties in `hosts` (`host1` and `host2` in this example) are the names by which you want to refer to your hosts; they can be anything you choose. For each host, `url` is the root URL to your WordPress site, and `key` and `secret` come from the WooCommerce API Keys/Apps page.

## Usage

As of v1.0, `order-fetcher` now also installs as the command `orders`, and uses a more “subcommand”-style command-line (like git, npm, and other tools). It also uses the host keys (as defined above, in [Getting Started](#getting-started)) as subcommand shortcuts rather than the older and more-verbose `--host hostname` flag. Note that you can still use `orders get --host host1 ...` rather than `orders host1 ...`, but you’ll find that the newer second invocation is more natural and involves less typing.

When all else fails, `orders --help` (or `order-fetcher --help`) lists all of the available options.

| Option               | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| -V, --version        | output the version number                                           |
| --host _host_        | connect to named host from config file; **required**                |
| --after _date_       | include only orders after the date                                  |
| --before _date_      | include only orders before the date                                 |
| --list-statuses      | list the availble statuses                                          |
| --status _status_    | include only orders with the given status                           |
| --list-skus          | just list the availble skus                                         |
| --sku _sku_          | filter to the specific sku, can be given multiple times (default: ) |
| -o, --out _filename_ | file to write (CSV format)                                          |
| -v, --verbose        | increase verbosity of logging output, can be given multiple times   |
| -h, --help           | output usage information                                            |

### Best Practices

For WooCommerce installations with a large number of historical orders, making use of the `--after` options is highly recommended. Similarly, use `--status processing` to only include orders that haven't been handled yet. (And then mark those orders as "completed" as soon as you deal with them.)

When generating CSV output, the columns come directly from the item information in WooCommerce. More than likely, you'll want to use the `--sku` option to create CSV files on a sku-by-sku basis.

### Examples

```sh
order-fetcher --after 2018-01-01 --status processing --list-skus
```

Retrieve all orders after 1 January 2018 (inclusive) with a status of "procesing", and list the unique SKUs. This is useful as a precursor to creating per-SKU CSV files.

```sh
order-fetcher --after 2018-01-01 --status processing --sku some-sku --out some-sku.csv
```

Retrieve all orders as the previous command, filter the items to the SKU 'some-sku', and write to 'some-sku.csv'.
