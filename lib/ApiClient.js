const Hosts = require('../resources/EHostAddresses.js');
const ISOCurrencies = require('../resources/ECurrencyType.js');
const CartTypes = require('../resources/ECartType');
const Subscription  = require('../resources/ESubscription');

const request = require('./request');
const crypto = require('crypto');
const querystring = require('querystring');

/**
 * G2A Api client
 * @param {string} apiSecret - Store Api Secret
 * @param {string} apiHash - Store API Hash
 * @param {string} returnUrl - URL to redirect the payment is successful
 * @param {string} cancelUrl - URL to redirect when payment fails
 * @param {string} currency - Currency (ISO 4217)
 * @param {string} cartType - Cart product type: 'physical' or 'digital'
 * @param {boolean=} sandbox - Sandbox mode
 * @constructor
 */
class ApiClient
{
    constructor(apiSecret, apiHash, returnUrl, cancelUrl, currency, cartType, sandbox)
    {
        this.apiSecret = apiSecret;
        this.apiHash  = apiHash;
        this.currency = currency;
        this.returnUrl = returnUrl;
        this.cancelUrl = cancelUrl;
        this.cartType = cartType;
        this.sandbox  = sandbox;

        this.validateClient();
    }

    private getPaymentOrderData(orderId, amount, items, options)
    {
        let baseOptions = {
            api_hash: this.apiHash,
            hash: this.generatePaymentHash(String(orderId), String(amount)),
            order_id: orderId,
            amount: amount,
            currency: this.currency,
            url_failure: this.cancelUrl,
            url_ok: this.returnUrl,
            cart_type: this.cartType,
            items: items
        };

        let extraOptions = {
            process_payment: options.process_payment,
            addresses: options.addresses,
            email: options.email,
            description: options.description,
            security_steam_id: options.security_steam_id
        };

        return Object.assign({}, baseOptions, extraOptions);
    }

    /**
     * Create a payment order and return a checkout url
     * @param {string} orderId
     * @param {number} amount
     * @param {Array} items
     * @param {Object} options
     * @return {Promise}
     */
    createPaymentOrder(orderId, amount, items, options)
    {
        return new Promise((resolve, reject) =>
        {
            let body = this.getPaymentOrderData(orderId, amount, items, options);

            request.createPostRequest('/index/createQuote', getHostAddress(this.sandbox, Hosts.Types.Quote), querystring.stringify(body))
                .then(response => {
                    if (response["status"] === "ok") {
                        resolve(this.parseCheckoutUrl(response["token"]));
                    }
                    else {
                        reject(response);
                    }
                }).catch(reject);
        });
    }

    createSubscriptionOrder(orderId, amount, items, subscription ,options)
    {
        return new Promise((resolve, reject) =>
        {
            let body = Object.assign({}, this.getPaymentOrderData(orderId, amount, items, options), {
                subscription: 1,
                subscription_product_name: subscription.subscription_product_name,
                subscription_type: subscription.subscription_type,
                subscription_period: subscription.subscription_period,
                subscription_frequency: subscription.subscription_frequency,
                subscription_start_date: subscription.subscription_start_date
            });

            request.createPostRequest('/index/createQuote', getHostAddress(this.sandbox, Hosts.Types.Quote), querystring.stringify(body))
                .then(response => {
                    if (response["status"] === "ok") {
                        resolve(this.parseCheckoutUrl(response["token"]));
                    }
                    else {
                        reject(response);
                    }
                }).catch(reject);
        })
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
            request.createGetRequest('/rest/transactions/' + transactionID, getHostAddress(this.sandbox, Hosts.Types.Rest))
                .then(resolve)
                .catch(reject);
        });
    }

    //refundPayment()

    /**
     * Handle ipn event
     * @param data
     * @returns {Object<Boolean,Object>}
     */
    ipnEventHandler(data)
    {
        if (!this.validateInpEvent(data))
        {
            return { valid: false };
        }

        return { valid: true, eventData: data }
    }

    /**
     * Calculate a payment hash
     * @param {string} transactionId
     * @param {string} userOrderId
     * @param {string} amount
     * @return {string}
     */
    private generateIpnPaymentHash(transactionId, userOrderId, amount)
    {
        return sha256(transactionId + userOrderId + amount + this.apiSecret);
    }

    private generateIpnSubscriptionHash(subscriptionId, amount, subscriptionName)
    {
        return sha256(subscriptionId + amount + subscriptionName + this.apiSecret);
    }

    /**
     * Calculate a payment hash
     * @param {string} userOrderId
     * @param {string} amount
     * @return {string}
     */
    private generatePaymentHash(userOrderId, amount)
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
        if (form.type === Subscription.IPN_TYPE.subscription_canceled || form.type === Subscription.IPN_TYPE.subscription_created)
        {
            return typeof form !== 'undefined' && form.hash === this.generateIpnSubscriptionHash(form.subscriptionId, form.amount, form.subscriptionName);
        }

        return typeof form !== 'undefined' && form.hash === this.generateIpnPaymentHash(form.transactionId, form.userOrderId, form.amount);
    }

    /**
     * Validate client creation
     */
    private validateClient()
    {
        let ERROR_BASE = 'INVALID_CONFIGURATION';

        ['apiHash', 'currency', 'returnUrl', 'cancelUrl', 'cartType'].map(key =>
        {
            if (this[key] === '')
                throw new Error(`${ERROR_BASE} - Missing param ${key}`);
        });

        if (Object.values(ISOCurrencies).indexOf(this.currency) === -1)
        {
            throw new Error(`${ERROR_BASE} - Invalid Currency Type ${this.currency}`);
        }

        if (Object.values(CartTypes).indexOf(this.cartType) === -1)
        {
            throw new Error(`${ERROR_BASE} - Invalid Cart Type ${this.cartType}`)
        }
    }
}

module.exports = ApiClient;

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

/**
 * Get host address
 * @param {Boolean} sandbox
 * @param {string} type - address type
 * @return {string}
 */
function getHostAddress(sandbox, type)
{
    if (sandbox)
        return Hosts[type].sandbox;

    return Hosts[type].production;
}
