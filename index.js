var proxy = require('http-proxy');
var server = new proxy.RoutingProxy();

module.exports = function (allow) {
    return function (req, res, next) {
        var xhost = req.header('x-host');
        if (xhost) {
            xhost = xhost.split(':');
            var host = xhost[0];
            var port = xhost.length === 2 ? xhost[1] : 80;
            var drones = allow[host];
            if (drones || !drones.length) {
                res.send(404, 'Not Found');
                return;
            }
            var nxt = drones.next;
            if (nxt >= drones.length) {
                nxt = (drones.next = 0);
            } else {
                drones.next++;
            }
            var drone = drones[nxt];
            console.log('proxing request to host: ' + drone.host + ' port: ' + drone.port);
            server.proxyRequest(req, res, {
                host: drone.host,
                port: drone.port
            });
            return;
        }
        next();
    }
};