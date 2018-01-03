const https = require('https');

/**
 * @param {String} path - request endpoint
 * @param {String} host - host url
 * @param {String} body - request body payload
 */
function createPostRequest(path, host, body)
{
    "use strict";
    let options = createPostRequestOptions(host, path, body);

    return new Promise((resolve, reject) =>
    {
        const req = https.request(options, res => handleResponse(res).then(resolve));

        req.on('error', reject);
        req.write(body);
        req.end();
    })
}

module.exports.createPostRequest = createPostRequest;

/**
 * createGetRequestOptions - create options for a GET requset
 *
 * @param  {String} host Host url
 * @param  {String} path requset endpoint
 * @return {Object} request options
 */
function createGetRequestOptions(host, path)
{
    let options = {
        hostname: host,
        port: 443,
        path: path,
        method: 'GET',
        servername: host
    };

    options.agent = new https.Agent(options);
    return options;
}

function createGetRequest(path, host)
{
    "use strict";
    let options = createGetRequestOptions(host, path);

    return new Promise((resolve, reject) =>
    {
        const req = https.request(options, res => handleResponse(res).then(resolve));

        req.on('error', reject);
        req.end();
    })
}

module.exports.createGetRequest = createGetRequest;

function createPostRequestOptions(host, path, body)
{
    "use strict";

    const options = {
        hostname: host,
        port: 443,
        path: path,
        method: 'POST',
        servername: host,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    options.agent = new https.Agent(options);

    return options;
}

/**
 * Handle request response
 * @param response
 * @returns {Promise}
 */
function handleResponse(response)
{
    "use strict";
    return new Promise((resolve, reject) =>
    {
        response.on('data', data =>
        {
            let responseData = JSON.parse(data.toString('utf8'));
            let result = validateResponse(response);

            if (result.valid) {
                resolve(responseData);
            }
            else {
                reject({message: result.message, code: result.code});
            }
        });
    });
}

function validateResponse(response)
{
    let valid, message = '', code = response.body;

    switch (response.statusCode)
    {
        case 200:
            valid = true;
            break;

        case 400:
            valid = false;
            switch (response.body)
            {
                case 'missing-parameters':
                    message = 'Some payment parameters are missing';
                    break;
                case 'invalid-hash':
                    message = 'Invalid hash string';
                    break;
                case 'invalid-amount':
                    message = 'Given amount is to high or less then minimum refund amount';
                    break;
                case 'invalid-action':
                    message = 'Invalid action provided';
                    break;
                case 'insufficient-funds':
                    message = 'Insufficient funds to process refund';
                    break;
            }
            break;
        case 401:
            valid = false;
            message = 'Authorization header is invalid';

        case 403:
            valid = false;
            switch (response.body)
            {
                case 'forbidden':
                    message = 'Merchant is not allowed to use this method';
                    break;

                case 'cannot-refund-transaction':
                    message = 'Transaction is in state that is not allowed to refund';
                    break;
            }
            break;

        case 404:
            valid = false;
            message = 'Transaction not found';
            break;

        case 500:
            valid = false;
            message = 'G2A PAY internal error';
            break;

        default:
            valid = false;
            message = `Unknown status code ${response.statusCode}`;

    }

    return {valid, message, code};
}

module.exports.validateResponse = validateResponse;