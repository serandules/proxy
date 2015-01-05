var debug = require('debug')('serandules:proxy');
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer();

/**
 *
 * @param allow object { 'autos.serandives.com': [{ ip: '127.0.0.1', port: 4000 }]
 * @returns {Function}
 */
module.exports = function (allow) {
    return function (req, res, next) {
        var host = req.header('x-host');
        if (host || /^\/apis\/.*/.test(req.path)) {
            host = host || req.header('host');
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
        next();
    }
};