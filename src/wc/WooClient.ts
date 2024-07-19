import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';
import url from 'node:url'; // import { URL, URLSearchParams } doesn't work!

import ky, { KyInstance, Options, NormalizedOptions } from 'ky';
import linkParser from 'parse-link-header';

import { dbg, err } from '../helpers.js';

type KeyProps<T> = keyof {
  [P in keyof T as T[P] extends PropertyKey ? P : never]: T[P];
};

/**
 * Manages the REST API calls to WordPress/WooCommerce.
 */
export default class WooClient {
  _apiVersion: string;
  _urlBase: string;
  _consumerKey: string;
  _consumerSecret: string;
  _ky: KyInstance;

  constructor(
    urlStr: string,
    key: string,
    secret: string
    // opts?: Partial<ConstructorParameters<typeof WooCommerce>[0]>
  ) {
    this._apiVersion = 'wc/v3';
    this._urlBase = urlStr;
    this._consumerKey = key;
    this._consumerSecret = secret;

    // determine whether to use Basic auth (on HTTPS), or one-legged OAuth
    const uri = new url.URL(urlStr);

    const options: Options = {
      prefixUrl: `${urlStr}/wp-json/wc/v3/`,
      method: 'GET',
    };

    switch (uri.protocol) {
      case 'http:':
        err(
          'Non-HTTPS authorization is not yet supported! This is likely to fail!'
        );
        options.hooks = {
          beforeRequest: [this.oneLeggedOAuth.bind(this)],
        };
        break;
      case 'https:':
        options.headers = {
          Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
        };
        break;
      default:
        throw new Error(`unexpected URL protocol: ${uri.protocol}`);
    }

    // using Basic auth only works on secure (HTTPS) connections
    this._ky = ky.create(options);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  oneLeggedOAuth(req: Request, opts: NormalizedOptions): void {
    // dbg(0, 'DOING 1-LEGGED OAUTH!', {req, opts});

    // I believe that the query params in `req` are 100% redundant with
    // `opts.searchParams`... we assume that's the case. (?)
    const uri = new url.URL(req.url);
    // dbg(4, 'DOING 1-LEGGED OAUTH!', { req, opts, uri });

    // See
    // https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication-over-http
    // for the steps for the one-legged auth.

    // collect parameters...
    // const oauthToken = '';
    const oauthSignatureMethod = 'HMAC-SHA256';
    const oauthTimestamp = (Date.now() / 1000).toFixed(0);
    const oauthNonce = crypto.randomBytes(8).toString('hex');

    const oauthParams = [
      ['oauth_consumer_key', this._consumerKey],
      // ['oauth_token', oauthToken],
      ['oauth_signature_method', oauthSignatureMethod],
      ['oauth_timestamp', oauthTimestamp],
      ['oauth_nonce', oauthNonce],
    ];

    const params = [...uri.searchParams.entries(), ...oauthParams]
      .filter(([key]) => key !== 'oauth_signature')
      .map(([key, val]) => {
        return [percentEncode(key), percentEncode(val)];
      })
      .sort(([a], [b]) => (a === b ? 0 : a < b ? -1 : 1));

    const sigParams = params.map(([key, val]) => `${key}=${val}`).join('&');

    const sigBase = [
      req.method,
      percentEncode(
        url.format(uri, { auth: false, fragment: false, search: false })
      ),
      percentEncode(sigParams),
    ].join('&');

    // create the hash
    const hmac = crypto.createHmac('sha256', this._consumerSecret);
    hmac.update(sigBase);
    const sig = hmac.digest('hex');

    dbg(3, 'params/sig', { params, sigParams, sigBase, sig });

    // update the header...
    const oauthHeaderParams = oauthParams
      .map(([key, val]) => `${key}="${val}"`)
      .join(',');

    req.headers.set(
      'Authorization',
      `OAuth ${oauthHeaderParams},oauth_signature="${sig}"`
    );

    dbg(2, 'final req', { req });
  }

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
      dbg(3, `fetching page ${page}...`, { endpoint, params });

      const response = await this._ky.get(endpoint, {
        searchParams: params,
      });

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

export function percentEncode(s: string) {
  const hexEncoding = [
    // 0-9
    0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
    // A-F
    0x41, 0x42, 0x43, 0x44, 0x45, 0x46,
  ] as const;

  // ArrayBuffer and Uint8Array aren't dynamically sizable, so we just use a
  // simple array to collect the bytes.  Encoding based on
  // https://developer.x.com/en/docs/authentication/oauth-1-0a/percent-encoding-parameters.
  const encoded = [...Buffer.from(s, 'utf8')].flatMap((b) => {
    switch (b) {
      case 0x30: // '0'
      case 0x31:
      case 0x32:
      case 0x33:
      case 0x34:
      case 0x35:
      case 0x36:
      case 0x37:
      case 0x38:
      case 0x39: // '9'
      case 0x41: // 'A'
      case 0x42:
      case 0x43:
      case 0x44:
      case 0x45:
      case 0x46:
      case 0x47:
      case 0x48:
      case 0x49:
      case 0x4a:
      case 0x4b:
      case 0x4c:
      case 0x4d:
      case 0x4e:
      case 0x4f:
      case 0x50:
      case 0x51:
      case 0x52:
      case 0x53:
      case 0x54:
      case 0x55:
      case 0x56:
      case 0x57:
      case 0x58:
      case 0x59:
      case 0x5a: // 'Z'
      case 0x61: // 'a'
      case 0x62:
      case 0x63:
      case 0x64:
      case 0x65:
      case 0x66:
      case 0x67:
      case 0x68:
      case 0x69:
      case 0x6a:
      case 0x6b:
      case 0x6c:
      case 0x6d:
      case 0x6e:
      case 0x6f:
      case 0x70:
      case 0x71:
      case 0x72:
      case 0x73:
      case 0x74:
      case 0x75:
      case 0x76:
      case 0x77:
      case 0x78:
      case 0x79:
      case 0x7a: // 'z'
      case 0x2d: // '-'
      case 0x2e: // '.'
      case 0x5f: // '_'
      case 0x7e: // '~'
        return b; // make char/string?

      default:
        return [0x25, hexEncoding[(b >> 4) & 0x0f], hexEncoding[b & 0x0f]];
    }
  });

  return Buffer.from(encoded).toString('ascii');
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
