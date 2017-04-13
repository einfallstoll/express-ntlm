/* jshint node:true */

var net = require('net'),
    tls = require('tls');

function NTLM_Proxy(ipaddress, port, domain, protoFactory, use_tls, tlsOptions) {
    this.ipaddress = ipaddress;
    this.port = port;
    this.domain = domain;
    this.protoFactory = protoFactory;
    this.use_tls = use_tls;
    this.tlsOptions = tlsOptions;
    this.socket = null;
}

NTLM_Proxy.prototype._openConnection = function() {
    this.close();

    if (this.use_tls) {
        this.socket = tls.connect(this.port, this.ipaddress, this.tlsOptions);
    } else {
        this.socket = net.createConnection(this.port, this.ipaddress);
    }

    this.socket.setTimeout(5000);
    this.socket.setKeepAlive(true);
};

NTLM_Proxy.prototype._transaction = function(msg) {
    if (!this.socket) {
        throw new Error('Transaction on closed socket.');
    }

    this.socket.write(msg);
};

NTLM_Proxy.prototype.close = function() {
    if (this.socket) {
        this.socket.end();
    }
};

NTLM_Proxy.prototype.negotiate = function(ntlm_negotiate, negotiate_callback) {
    var _this = this;

    this._openConnection();
    this.socket.on('data', function(data) {
        if (negotiate_callback) {
            _this.proto.parse_session_setup_resp(data, function(error, result, challenge) {
                if (!result) {
                    negotiate_callback(null, false);
                } else {
                    negotiate_callback(null, challenge);
                }
                negotiate_callback = null;
            });
        }
    });
    this.socket.on('error', function(error) {
        if (negotiate_callback) {
            negotiate_callback(error);
            negotiate_callback = null;
        }
    });
    this.proto = new this.protoFactory();

    var msg = this.proto.make_session_setup_req(ntlm_negotiate, true);
    this._transaction(msg);
};

NTLM_Proxy.prototype.authenticate = function(ntlm_authenticate, authenticate_callback) {
    var _this = this;

    this.socket.on('data', function(data) {
        if (authenticate_callback) {
            _this.proto.parse_session_setup_resp(data, function(error, result) {
                authenticate_callback(null, result);
                authenticate_callback = null;
            });
        }
    });
    this.socket.on('error', function(error) {
        if (authenticate_callback) {
            authenticate_callback(error);
            authenticate_callback = null;
        }
    });

    var msg = this.proto.make_session_setup_req(ntlm_authenticate, false);
    this._transaction(msg);
};

module.exports = NTLM_Proxy;
