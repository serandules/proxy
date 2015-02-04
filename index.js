var debug = require('debug')('serandules:proxy');
var httpProxy = require('http-proxy');
var http = require('http');

/**
 *
 * @param allow object { 'autos.serandives.com': [{ ip: '127.0.0.1', port: 4000 }]
 * @returns {Function}
 */
module.exports = function (allow) {
    var proxy = httpProxy.createProxyServer({
        procevent: http.globalAgent
    });

    proxy.on('error', function (err, req, res) {
        res.writeHead(500, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
            error: 'proxy error'
        }));
    });

    var extract = function (host) {
        var index = host.indexOf(':');
        return index !== -1 ? host.substring(0, index) : host;
    };

    return function (req, res, next) {
        var host = req.header('x-host');
        if (host || /^\/apis\/.*/.test(req.path)) {
            host = extract(host || req.header('host'));
            var drones = allow[host];
            if (!drones || !drones.length) {
                debug('proxy info not found for host : ' + host);
                debug(allow);
                res.send(404, 'Not Found');
                return;
            }
            if (!drones.next || (drones.next >= drones.length)) {
                drones.next = 0;
            }
            var drone = drones[drones.next++];
            debug('proxing request to host: ' + drone.ip + ' port: ' + drone.port);
            proxy.web(req, res, {
                target: {
                    host: drone.ip,
                    port: drone.port
                }
            });
            return;
        }
        debug('non matching url pattern');
        next();
    }
};