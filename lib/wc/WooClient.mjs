import url from 'url'; // import { URL, URLSearchParams } doesn't work!
import WooCommerce from 'woocommerce-api';
import linkParser from 'parse-link-header';

// import chalk from 'chalk';
import * as helpers from '../helpers';

// WooClient wraps the WooCommerce-API helper because it has some rough edges.
export default class WooClient {
  constructor(urlStr, key, secret) {
    this._client = new WooCommerce({
      wpAPI: true,
      version: 'wc/v3', // v2 has an issue with the item metadata!
      url: urlStr,
      consumerKey: key,
      consumerSecret: secret,
    });
  }

  // getAll() calls the endpoint as many times as needed to retrieve all of
  // the data, using the 'Link' header to fetch the 'next' page until there
  // are no more!  The 'params' argument should be a simple object.
  async getAll(endpoint, params, keyName) {
    const keys = {};
    const data = [];
    let page = 1;
    let fetchPage = true;

    // eslint-disable-next-line no-param-reassign
    params = new url.URLSearchParams(params);

    while (fetchPage) {
      fetchPage = false; // until proven otherwise
      const uri = `${endpoint}?${params.toString()}`;
      helpers.dbg(3, `fetching page ${page}...`, { endpoint, params, uri });

      // eslint-disable-next-line no-await-in-loop
      const response = await this._client.getAsync(uri);

      helpers.dbg(4, 'raw body', response.body);
      const body = JSON.parse(response.body);
      helpers.dbg(4, 'parsed body', body);
      if (body.code) {
        throw body;
      }

      // We can't simply concat the body to the data... WordPress/WooCommerce is
      // a bit sloppy about data retrieval, and we sometimes see the same items
      // on consecutive pages.  To de-dupe, we keep a map of the keys/IDs we've
      // seen.
      let duplicates = 0;
      // eslint-disable-next-line no-loop-func
      body.forEach(d => {
        const key = d[keyName];
        if (keys[key]) {
          duplicates++;
          return;
        }

        keys[key] = true;
        data.push(d);
      });
      // data = data.concat(body);
      helpers.dbg(
        1,
        `got page ${page}, ${body.length} ${endpoint} (${duplicates} duplicates), now have ${data.length} ${endpoint}`
      );

      const links = linkParser(response.headers.link);
      if (links && links.next) {
        // eslint-disable-next-line no-param-reassign
        params = paramsFromLink(links.next);
        fetchPage = true;
        page++;
      }
    }

    helpers.dbg(3, 'data', data);
    return data;
  }
}

// Stupidly, the link returned from the WordPress/WooCommerce API is not useable
// as-is... passing it back through the client results in a 401 error!  To fix,
// we need to use *only* the non-oauth params and re-create the URL from
// scratch.  Fortunately, linkParser reutrns the querystring parameters in
// additional to the raw url.
function paramsFromLink(link) {
  const params = new url.URLSearchParams();

  for (const key of Object.keys(link)) {
    if (key !== 'rel' && key !== 'url' && !key.startsWith('oauth_')) {
      params.append(key, link[key]);
    }
  }

  helpers.dbg(2, 'params from link', { link, params });

  return params;
}
