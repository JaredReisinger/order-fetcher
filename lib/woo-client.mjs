'use strict';

import url from 'url';  // import { URL, URLSearchParams } doesn't work!
import WooCommerce from 'woocommerce-api';
import linkParser  from 'parse-link-header';

import * as helpers from './helpers';

// WooClient wraps the WooCommerce-API helper because it has some rough edges.
export default class WooClient {
    constructor(url, key, secret) {
        this._client = new WooCommerce({
            wpAPI: true,
            version: 'wc/v1',   // v2 has an issue with the item metadata!
            url: url,
            consumerKey: key,
            consumerSecret: secret,
        });
    }

    // getAll() calls the endpoint as many times as needed to retrieve all of
    // the data, using the 'Link' header to fetch the 'next' page until there
    // are no more!  The 'params' argument should be a simple object.
    async getAll(endpoint, params) {
        let data = [];
        let page = 1;
        let fetchPage = true;

        params = new url.URLSearchParams(params);

        while (fetchPage) {
            fetchPage = false;  // until proven otherwise
            helpers.dbg(3, `fetching page ${page}...`);
            helpers.dbg(3, 'params', params);
            const response = await this._client.getAsync(`${endpoint}?${params.toString()}`);
            helpers.dbg(4, 'raw body', response.body);
            const body = JSON.parse(response.body);
            helpers.dbg(4, 'parsed body', body);
            data = data.concat(body);
            helpers.dbg(1, `got page ${page}, ${body.length} ${endpoint}, now have ${data.length} ${endpoint}`);

            const links = linkParser(response.headers.link);
            if (links && links.next) {
                params = paramsFromLink(links.next);
                fetchPage = true;
                page++;
            }
        }

        helpers.dbg(2, 'data', data);
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
        if (key != 'rel' && key !== 'url' && !key.startsWith('oauth_')) {
            params.append(key, link[key]);
        }
    }

    helpers.dbg(2, 'params from link', { link, params} );

    return params;
}
