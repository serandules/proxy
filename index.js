var proxy = require('http-proxy');
var server = new proxy.RoutingProxy();

module.exports = function (allow) {
    return function (req, res, next) {
        var xhost = req.header('x-host');
        if (xhost) {
            xhost = xhost.split(':');
            var host = xhost[0];
            var port = xhost.length === 2 ? xhost[1] : 80;
            if (allow[host] != port) {
                res.send(404, 'Not Found');
                return;
            }
            console.log('proxing request to host: ' + host + ' port: ' + port);
            server.proxyRequest(req, res, {
                host: host,
                port: port
            });
            return;
        }
        next();
    }
};