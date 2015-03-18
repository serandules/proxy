var log = require('logger')('proxer:index');
var httpProxy = require('http-proxy');
var http = require('http');

var hosts = {};

var extract = function (host) {
    var index = host.indexOf(':');
    return index !== -1 ? host.substring(0, index) : host;
};

var host;

var proxy = httpProxy.createProxyServer({
    agent: http.globalAgent
});

proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
        error: 'proxy error'
    }));
});

var update = function (self, id, domain, ip, port, done) {
    if (domain === self) {
        log.debug('skipping self domain proxying:%s', domain);
        return;
    }
    var star = domain.indexOf('*.');
    if (star === 0) {
        return done(id, domain.substring(star), ip, port);
    }
    if (domain === host) {
        return done(id, domain, ip, port);
    }
    log.debug('skipping non balancing proxying:%s', domain);
};

var joined = function (id, host, ip, port) {
    log.debug('drone joined id:%s, domain:%s, ip:%s, port:%s', id, host, ip, port);
    var drones = hosts[host] || (hosts[host] = []);
    drones.push({
        id: id,
        ip: ip,
        port: port
    });
};

var left = function (id, host, ip, port) {
    log.debug('drone left id:%s, domain:%s, ip:%s, port:%s', id, host, ip, port);
    var drones = hosts[host] || (hosts[host] = []);
    drones.every(function (drone, i) {
        if (drone.id !== id) {
            return true;
        }
        drones.splice(i, 1);
        return false;
    });
};

var rejoined = function (id, host, ip, port) {
    log.debug('drone rejoined id:%s, domain:%s, ip:%s, port:%s', id, host, ip, port);
    var drones = hosts[host] || (hosts[host] = []);
    drones.every(function (drone, i) {
        if (drone.id !== id) {
            return true;
        }
        drone.ip = ip;
        drone.port = port;
        return false;
    });
};

module.exports = function (req, res, next) {
    var host = req.header('x-host');
    if (host || /^\/apis\/.*/.test(req.path)) {
        host = extract(host || req.header('host'));
        var drones = hosts[host];
        if (!drones || !drones.length) {
            log.debug('proxy info not found for host : ' + host);
            log.debug(hosts);
            res.status(404).send('Not Found');
            return;
        }
        if (!drones.next || (drones.next >= drones.length)) {
            drones.next = 0;
        }
        var drone = drones[drones.next++];
        log.debug('proxying request to host: ' + drone.ip + ' port: ' + drone.port);
        proxy.web(req, res, {
            target: {
                host: drone.ip,
                port: drone.port
            }
        });
        return;
    }
    log.debug('non matching url pattern');
    next();
};

module.exports.listen = function (self, io) {

    host = self.substring(2);

    io.on('joined', function (id, domain, ip, port) {
        update(self, id, domain, ip, port, joined);
    });

    io.on('left', function (id, domain, ip, port) {
        left(id, domain, ip, port);
    });

    io.on('rejoined', function (id, domain, ip, port) {
        update(self, id, domain, ip, port, rejoined);
    });
};