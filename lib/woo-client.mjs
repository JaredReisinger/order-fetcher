'use strict';

import url from 'url';  // import { URL, URLSearchParams } doesn't work!
import WooCommerce from 'woocommerce-api';
import linkParser  from 'parse-link-header';

import * as util from './util';

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
            // util.dbg(`fetching page ${page}...`);
            // util.dbg(params);
            const response = await this._client.getAsync(`${endpoint}?${params.toString()}`);
            // util.dbg(response.body);
            const body = JSON.parse(response.body);
            // util.dbg(body);
            data = data.concat(body);
            util.dbg(`got page ${page}, ${body.length} ${endpoint}, now have ${data.length} ${endpoint}`);

            const links = linkParser(response.headers.link);
            if (links && links.next) {
                params = paramsFromLink(links.next);
                fetchPage = true;
                page++;
            }
        }

        // util.dbg(data);
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

    // util.dbg(link);
    // util.dbg(params);

    return params;
}
