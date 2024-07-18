import url from 'node:url'; // import { URL, URLSearchParams } doesn't work!

import ky, { KyInstance } from 'ky';
import linkParser from 'parse-link-header';

// import chalk from 'chalk';
import { dbg } from '../helpers.js';

// // New @woocommerce/api doesn't expose indirect types... so we have to manage that!
// type WooHTTPClient = ReturnType<
//   ReturnType<(typeof WooHTTPClientFactory)['build']>['create']
// >;

// // This type may depend on the call, and thus need to be passed in?
// export interface Data {
//   // really, we need the "key" prop to be a string... there's a way to type that
//   // but it gets more complicated...in getAll:
//   // getAll<T, K extends keyof T>
//   // maybe a way to extract the viable props?  I've done this before...

//   [index: string]: string;
// };

type KeyProps<T> = keyof {
  [P in keyof T as T[P] extends PropertyKey ? P : never]: T[P];
};

// WooClient wraps the WooCommerce-API helper because it has some rough edges.
export default class WooClient {
  // _client: WooCommerce;
  // _client2: WooHTTPClient;
  _ky: KyInstance;
  _apiVersion: string;

  constructor(
    urlStr: string,
    key: string,
    secret: string
    // opts?: Partial<ConstructorParameters<typeof WooCommerce>[0]>
  ) {
    this._apiVersion = 'wc/v3';

    const credentials = Buffer.from(`${key}:${secret}`).toString('base64');

    // using Basic auth only works on secure (HTTPS) connections
    this._ky = ky.create({
      prefixUrl: `${urlStr}/wp-json/wc/v3/`,
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    // this._client2 = WooHTTPClientFactory.build(urlStr)
    //   .withIndexPermalinks()
    //   .withOAuth(key, secret)
    //   .create();

    // // TODO: remove old client... what about other options?
    // this._client = new WooCommerce({
    //   ...(opts ?? {}),
    //   wpAPI: true,
    //   version: 'wc/v3', // v2 has an issue with the item metadata!
    //   url: urlStr,
    //   consumerKey: key,
    //   consumerSecret: secret,
    // });
  }

  // xxx() {
  //   return this._client2;
  // }

  // The new @woocommerce/api REST repositories aren't good at
  // more-than-one-page requests.. they drop the header (with the 'link'), and
  // don't know about de-duping.  Since we *only* need to 'get', we build our
  // own using the transformer (for type-safety).... but that's not exposed, so
  // we have to keep our own normalization logic from before.

  // getAll() calls the endpoint as many times as needed to retrieve all of
  // the data, using the 'Link' header to fetch the 'next' page until there
  // are no more!  The 'params' argument should be a simple object.
  async getAll<T, K extends KeyProps<T> = KeyProps<T>>(
    endpoint: string,
    initialParams:
      | string
      | Record<string, string>
      | url.URLSearchParams
      | undefined,
    keyName: K
  ) {
    const keys: Record<PropertyKey, boolean> = {};
    const data: T[] = [];
    let page = 1;
    let fetchPage = true;

    let params = new url.URLSearchParams(initialParams);

    while (fetchPage) {
      fetchPage = false; // until proven otherwise
      // const uri = `${endpoint}?${params.toString()}`;
      dbg(3, `fetching page ${page}...`, { endpoint, params /*, uri*/ });

      // const response = await this._client.getAsync(uri);
      // const response = await this._client2.get<T[]>(
      //   `${this._apiVersion}/${endpoint}`,
      //   params
      // );

      const response = await this._ky.get(endpoint, {
        searchParams: params,
      });

      // dbg(4, 'raw body', response.body);
      // // We need to pass the body type in?
      // const body = JSON.parse(response.body) as T[] | { code: unknown };
      // const body = response.data;
      const body = await response.json<T[] | { code: unknown }>();
      dbg(4, 'parsed body', body);
      if ('code' in body) {
        throw body;
      }

      // We can't simply concat the body to the data... WordPress/WooCommerce is
      // a bit sloppy about data retrieval, and we sometimes see the same items
      // on consecutive pages.  To de-dupe, we keep a map of the keys/IDs we've
      // seen.
      let duplicates = 0;
      body.forEach((d) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore -- thinks keyName can't index the data
        const key = d[keyName] as PropertyKey;
        if (keys[key]) {
          duplicates++;
          return;
        }

        keys[key] = true;
        data.push(d);
      });

      dbg(
        1,
        `got page ${page}, ${body.length} ${endpoint} (${duplicates} duplicates), now have ${data.length} ${endpoint}`
      );

      dbg(3, 'link header?', response.headers);
      if (response.headers.has('link')) {
        const links = linkParser(response.headers.get('link'));
        if (links && links.next) {
          params = paramsFromLink(links.next);
          fetchPage = true;
          page++;
        }
      }
    }

    dbg(3, 'data', data);
    return data;
  }
}

// Stupidly, the link returned from the WordPress/WooCommerce API is not usable
// as-is... passing it back through the client results in a 401 error!  To fix,
// we need to use *only* the non-oauth params and re-create the URL from
// scratch.  Fortunately, linkParser returns the querystring parameters in
// additional to the raw url.
function paramsFromLink(link: linkParser.Link) {
  // function paramsFromLink(link: Record<string, string>) {
  const params = new url.URLSearchParams();

  for (const [key, val] of Object.entries(link)) {
    if (key !== 'rel' && key !== 'url' && !key.startsWith('oauth_') && val) {
      params.append(key, val);
    }
  }

  dbg(2, 'params from link', { link, params });

  return params;
}
