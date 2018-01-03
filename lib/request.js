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

function createGetRequestOptions(host, path)
{
    const options = {
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
    let self = this;
    let options = createGetRequestOptions(host, path);

    return new Promise((resolve, reject) =>
    {
        const req = https.request(options, res => self.handleResponse(res).then(resolve));

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
 * @param res
 * @returns {Promise}
 */
function handleResponse(res)
{
    "use strict";
    return new Promise((resolve, reject) =>
    {
        res.on('data', (data) => {
            if (res.statusCode == 200)
            {
                resolve(JSON.parse(data.toString('utf8')))
            }
            else
            {
                reject(JSON.parse(data.toString('utf8')))
            }
        });
    })
}
