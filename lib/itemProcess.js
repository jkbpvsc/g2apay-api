/**
 * Process order item
 * @param {string} sku - Item stock keeping unit
 * @param {string} name - Item name
 * @param {number} amount - Amount (float value)
 * @param {number} qty - Quantity (integer  value)
 * @param {string} id - Item id
 * @param {number} price - Total item price (quantity x price)
 * @param url - Website item url
 * @param {Object<String,String>=} extra - (extra - Item optional description, type - Item optional type) values
 * @returns {Object}
 */
module.exports.processOrderItem = function (sku, name, amount, qty, id, price, url, extra)
{
    let item = {sku: sku, name: name, amount: amount, qty: qty, id: id, price: price, url: url};
    return  Object.assign({}, item, {extra:  extra.extra, type: extra.type});
};

/**
 *
 * @param {Array} billing - Array of billing address params
 * @param {Array} shipping - Array of shipping address params
 * @returns {Object}
 */
module.exports.processAddress = function(billing, shipping)
{
    return {billing: billing, shipping: shipping};
};

module.exports.parseAddressShipping = function(firstname, lastname, line_1, line_2, zip_code, city, company, county, country)
{
    return {firstname, lastname, line_1, line_2, zip_code, city, company, county, country};
};

module.exports.parseAddressBilling = function(firstname, lastname, line_1, line_2, zip_code, city, company, county, country)
{
    return {firstname, lastname, line_1, line_2, zip_code, city, company, county, country};
};
