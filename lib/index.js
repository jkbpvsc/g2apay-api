const crypto = require('crypto');
const querystring = require('querystring');

const Hosts = require('../resources/EHostAddresses.js');
const request = require('./request');

/**
 * Process order item
 * @param {string} _sku - Item stock keeping unit
 * @param {string} _name - Item name
 * @param {number} _amount - Amount (float value)
 * @param {number} _qty - Quantity (integer  value)
 * @param {string} _id - Item id
 * @param {number} _price - Total item price (quantity x price)
 * @param _url - Website item url
 * @param {Object<String,String>=} extra - (extra - Item optional description, type - Item optional type) values
 * @returns {Object}
 */
function processOrderItem(_sku, _name, _amount, _qty, _id, _price, _url, extra)
{
    let item = {sku: _sku, name: _name, amount: _amount, qty: _qty, id: _id, price: _price, url: _url};

    if (extra.extra)
    {
        item.extra = extra.extra;
    }

    if (extra.type)
    {
        item.type = extra.type;
    }

    return item;
}

module.exports.processOrderItem = processOrderItem;

/**
 * Get host address
 * @param {Boolean} sandbox
 * @param {string} type - address type
 * @return {string}
 */
function getHostAddress(sandbox, type)
{
    let address;
    if (sandbox)
    {
        address = Hosts[type].sandbox;
    }
    else
    {
        address = Hosts[type].production;
    }

    return address
}

/**
 * G2A Api client
 * @param {string} apiSecret - Store Api Secret
 * @param {string} apiHash - Store API Hash
 * @param {string} returnUrl - URL to redirect the payment is successful
 * @param {string} cancelUrl - URL to redirect when payment fails
 * @param {string} currency - Currency (ISO 4217)
 * @param {boolean=} sandbox - Sandbox mode
 * @param {string=} cartType - Cart product type: physical or digital
 * @param {boolean=} verbose
 * @constructor
 */
class ApiClient
{
    constructor(apiSecret, apiHash, returnUrl, cancelUrl, currency, sandbox, cartType, verbose)
    {
        this.sandbox = sandbox;
        this.apiSecret = apiSecret;
        this.apiHash = apiHash;
        this.currency = currency;
        this.verbose = verbose;
        this.returnUrl = returnUrl;
        this.cancelUrl = cancelUrl;
        this.cartType = cartType;
    }

    /**
     * Create a payment order and return a checkout url
     * @param {string} orderId
     * @param {number} amount
     * @param {Array} items
     * @param {string} steamID - security_steam_id, add if working with the steam platform users (optional)
     * @return {Promise}
     */
    createPaymentOrder(orderId, amount, items, steamID)
    {
        "use strict";
        return new Promise((resolve, reject) =>
        {
            let body =
            {
                api_hash: this.apiHash,
                hash: this.calculatePaymentHash(String(orderId), String(amount)),
                order_id: orderId,
                amount: amount,
                currency: this.currency,
                url_failure: this.cancelUrl,
                url_ok: this.returnUrl,
                cart_type: this.cartType,
                security_steam_id: steamID,
                items: items
            };

            request.createPostRequest('/index/createQuote', getHostAddress(this.sandbox, Hosts.Types.Quote), querystring.stringify(body))
                .then(response =>
                {
                    if (response["status"] === "ok")
                    {
                        resolve(this.parseCheckoutUrl(response["token"]))
                    }
                    else
                    {
                        reject(response)
                    }

                }).catch(reject);
        });
    }

    /**
     * Get payment data
     * @param {string} transactionID
     * @return {Promise}
     */
     getPaymentData(transactionID)
    {
        "use strict";
        return new Promise((resolve, reject) =>
        {
            request.createGetRequest('/Rest/transactions/' + transactionID, getHostAddress(this.sandbox, Hosts.Types.Rest))
                .then(resolve)
                .catch(reject);
        })
    }

    /**
     * Handle ipn event
     * @param data
     * @returns {Object<Boolean,Object>}
     */
    ipnEventHandler(data)
    {
        if (!this.validateInpEvent(data))
        {
            return {valid: false };
        }

        return {valid: true, eventData: data}
    }

    /**
     * Calculate a payment hash
     * @param {string} transactionId
     * @param {string} userOrderId
     * @param {string} amount
     * @return {string}
     */
    private generateIpnHash(transactionId, userOrderId, amount)
    {
        return sha256(transactionId + userOrderId + amount + this.apiSecret);
    }

    /**
     * Calculate a payment hash
     * @param {string} userOrderId
     * @param {string} amount
     * @param {ApiClient} ApiClient
     * @return {string}
     */
    private calculatePaymentHash(userOrderId, amount)
    {
        return sha256(userOrderId + amount + this.currency + this.apiSecret);
    }

    /**
     * Parse checkout url
     * @param {string} token - checkout token
     * @returns {string}
     */
    private parseCheckoutUrl(token)
    {
        return 'https://' + getHostAddress(this.sandbox, Hosts.Types.Quote) + '/index/gateway?token=' + token;
    }

    /**
     * Validate IPN form
     * @param {Object} form
     * @returns {boolean}
     */
    private validateInpEvent(form)
    {
        return typeof form !== 'undefined' && form.hash === this.generateIpnHash(form.transactionId, form.userOrderId, form.amount)
    }
}

/**
 * Generate a sha256 hash
 * @param {string} secret
 * @return {string}
 */
function sha256(secret)
{
    "use strict";
    return crypto.createHash('sha256').update(secret).digest('hex');
}

module.exports.ApiClient = ApiClient;