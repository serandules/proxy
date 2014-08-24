var proxy = require('http-proxy');
var server = new proxy.RoutingProxy();

/**
 *
 * @param allow object { 'auto.serandives.com': [{ ip: '127.0.0.1', port: 4000 }]
 * @returns {Function}
 */
module.exports = function (allow) {
    console.log('===========================status 2===========================');
    return function (req, res, next) {
        console.log('===========================status 3===========================');
        var host = req.header('x-host');
        if (host) {
            console.log('===========================status 4===========================');
            var drones = allow[host];
            if (!drones || !drones.length) {
                console.log('proxy info not found for host : ' + host);
                console.log(allow);
                res.send(404, 'Not Found');
                return;
            }
            if (!drones.next || (drones.next >= drones.length)) {
                drones.next = 0;
            }
            var drone = drones[drones.next++];
            console.log('proxing request to host: ' + drone.ip + ' port: ' + drone.port);
            server.proxyRequest(req, res, {
                host: drone.ip,
                port: drone.port
            });
            return;
        }
        next();
    }
};