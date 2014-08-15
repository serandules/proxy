var proxy = require('http-proxy');
var server = new proxy.RoutingProxy();

/**
 *
 * @param allow object { 'auto.serandives.com': [{ ip: '127.0.0.1', port: 4000 }]
 * @returns {Function}
 */
module.exports = function (allow) {
    return function (req, res, next) {
        var host = req.header('x-host');
        if (host) {
            var drones = allow[host];
            if (!drones || !drones.length) {
                res.send(404, 'Not Found');
                return;
            }
            if (!drones.next || (drones.next >= drones.length)) {
                drones.next = 0;
            }
            var drone = drones[drones.next++];
            console.log('proxing request to host: ' + drone.ip + ' port: ' + drone.port);
            server.proxyRequest(req, res, {
                ip: drone.ip,
                port: drone.port
            });
            return;
        }
        next();
    }
};