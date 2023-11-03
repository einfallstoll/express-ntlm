/* jshint node:true */

// node.js modules
var url = require('url');

// 3rd-party modules
var _ = require('underscore'),
    async = require('async');

// Custom modules
var Cache = require('./Cache'),
    NTLM_AD_Proxy = require('./NTLM_AD_Proxy'),
    NTLM_No_Proxy = require('./NTLM_No_Proxy'),
    utils = require('./utils');

// Globals
var cache = new Cache();

module.exports = function(options) {

    // Overwrite the default options by the user-defined
    options = _.extend({
        badrequest: function(request, response, next) {
            response.sendStatus(400);
        },
        internalservererror: function(request, response, next) {
            response.sendStatus(500);
        },
        forbidden: function(request, response, next) {
            response.sendStatus(403);
        },
        unauthorized: function(request, response, next) {
            response.statusCode = 401;
            response.setHeader('WWW-Authenticate', 'NTLM');
            response.end();
        },
        prefix: '[express-ntlm]',
        debug: function() {

        },

        domaincontroller: null,

        getConnectionId(request, response) {
            return utils.uuidv4();
        },

        getProxyId(request, response) {
            if (!request.connection.id) {
                request.connection.id = options.getConnectionId(request, response);
            }

            return request.connection.id;
        },

        getCachedUserData(request, response) {
            return request.connection.ntlm;
        },
        addCachedUserData(request, response, userData) {
            request.connection.ntlm = userData;
        }
    }, options);

    function ntlm_message_type(msg) {
        if (msg.toString('utf8', 0, 8) != 'NTLMSSP\0') {
            return new Error('Not a valid NTLM message:', msg.toString('hex'));
        }
        var msg_type = msg.readUInt8(8);
        if (!~[1, 2, 3].indexOf(msg_type)) {
            return new Error('Incorrect NTLM message Type', msg_type);
        }
        return msg_type;
    }

    function parse_ntlm_authenticate(msg) {
        var DomainNameLen = msg.readUInt16LE(0x1C),
            DomainNameBufferOffset = msg.readUInt32LE(0x20),
            DomainName = msg.slice(DomainNameBufferOffset, DomainNameBufferOffset + DomainNameLen),
            UserNameLen = msg.readUInt16LE(0x24),
            UserNameBufferOffset = msg.readUInt32LE(0x28),
            UserName = msg.slice(UserNameBufferOffset, UserNameBufferOffset + UserNameLen),
            WorkstationLen = msg.readUInt16LE(0x2C),
            WorkstationBufferOffset = msg.readUInt32LE(0x30),
            Workstation = msg.slice(WorkstationBufferOffset, WorkstationBufferOffset + WorkstationLen);

        if (utils.isFlagSet(msg.readUInt8(0x3C), utils.toBinary('00000001'))) {
            DomainName = DomainName.toString('utf16le');
            UserName = UserName.toString('utf16le');
            Workstation = Workstation.toString('utf16le');
        } else {
            DomainName = DomainName.toString();
            UserName = UserName.toString();
            Workstation = Workstation.toString();
        }

        return [UserName, DomainName, Workstation];
    }

    function decode_http_authorization_header(auth) {
        var ah = auth.split(' ');
        if (ah.length === 2) {
            if (ah[0] === 'NTLM') {
                return ['NTLM', new Buffer(ah[1], 'base64')];
            }
        }
        return false;
    }

    function connect_to_proxy(type1, callback) {
        var domain = options.domain;

        var proxy,
            ntlm_challenge;

        async.eachSeries(!options.domaincontroller ? [ -1 ] : typeof options.domaincontroller === 'string' ? [ options.domaincontroller ] : options.domaincontroller, function(server, eachDomaincontrollerCallback) {
            if (!server || ntlm_challenge) return eachDomaincontrollerCallback();

            if (server === -1) {
                options.debug(options.prefix, 'No domaincontroller was specified, all Authentication messages are valid.');
                proxy = new NTLM_No_Proxy();
            } else if (!server.indexOf('ldap')) {
                var serverurl = url.parse(server),
                    use_tls = serverurl.protocol === 'ldaps:',
                    decoded_path = decodeURI(serverurl.path);
                options.debug(options.prefix, 'Initiating connection to Active Directory server ' + serverurl.host + ' (domain ' + domain + ') using base DN "' + decoded_path + '".');
                proxy = new NTLM_AD_Proxy(serverurl.hostname, serverurl.port, domain, decoded_path, use_tls, options.tlsOptions);
            } else {
                return eachDomaincontrollerCallback(new Error('Domaincontroller must be an AD and start with ldap://'));
            }

            proxy.negotiate(type1, function(error, challenge) {
                if (error) {
                    proxy.close();
                    proxy = null;
                    options.debug(options.prefix, error);
                    return eachDomaincontrollerCallback();
                }

                ntlm_challenge = challenge;

                return eachDomaincontrollerCallback();
            });
        }, function(error) {
            if (error) return callback(error);

            if (!proxy) {
                return callback(new Error('None of the Domain Controllers are available.'));
            }

            return callback(null, proxy, ntlm_challenge);
        });
    }

    function handle_type1(request, response, next, ntlm_message, callback) {
        var proxyId = options.getProxyId(request, response);

        cache.remove(proxyId);
        cache.clean();

        connect_to_proxy(ntlm_message, function(error, proxy, challenge) {
            if (error) return callback(error);

            response.statusCode = 401;
            response.setHeader('WWW-Authenticate', 'NTLM ' + challenge.toString('base64'));
            response.end();

            cache.add(proxyId, proxy);

            return callback();
        });
    }

    function handle_type3(request, response, next, ntlm_message, callback) {
        var proxyId = options.getProxyId(request, response),
            proxy = cache.get_proxy(proxyId);

        var userDomainWorkstation = parse_ntlm_authenticate(ntlm_message),
            user = userDomainWorkstation[0],
            domain = userDomainWorkstation[1],
            workstation = userDomainWorkstation[2];

        if (!domain) {
            domain = options.domain;
        }
        proxy.authenticate(ntlm_message, function(error, result) {
            if (error) return callback(error);

            var userData = {
                DomainName: domain,
                UserName: user,
                Workstation: workstation,
                Authenticated: false
            };

            request.ntlm = userData;
            response.locals.ntlm = userData;
            options.addCachedUserData(request, response, userData);

            if (!result) {
                cache.remove(proxyId);
                options.debug(options.prefix, 'User ' + domain + '/' + user + ' authentication for URI ' + request.protocol + '://' + request.get('host') + request.originalUrl);
                return options.forbidden(request, response, next);
            } else {
                userData.Authenticated = true;
                return next();
            }
        });
    }

    return function(request, response, next) {
        var auth_headers = request.headers.authorization;

        var user = options.getCachedUserData(request, response);
        if (user && user.Authenticated) {
            options.debug(options.prefix, 'Connection already authenticated ' + user.DomainName + '/' + user.UserName);
            if (auth_headers) {
                if (request.method != 'POST') {
                    request.ntlm = user;
                    response.locals.ntlm = user;
                    return next();
                }
            } else {
                request.ntlm = user;
                response.locals.ntlm = user;
                return next();
            }
        }

        if (!auth_headers) {
            options.debug(options.prefix, 'No Authorization header present');
            return options.unauthorized(request, response, next);
        }

        var ah_data = decode_http_authorization_header(auth_headers);

        if (!ah_data) {
            options.debug(options.prefix, 'Error when parsing Authorization header for URI ' + request.protocol + '://' + request.get('host') + request.originalUrl);
            return options.badrequest(request, response, next);
        }

        var ntlm_version = ntlm_message_type(ah_data[1]);

        if (ntlm_version instanceof Error) {
            options.debug(options.prefix, ntlm_version.stack);
            return options.badrequest(request, response, next);
        }

        if (ntlm_version === 1) {
            return handle_type1(request, response, next, ah_data[1], function(error) {
                if (error) {
                    options.debug(options.prefix, error.stack);
                    return options.internalservererror(request, response, next);
                }
            });
        }

        if (ntlm_version === 3) {
            if (cache.get_proxy(options.getProxyId(request, response)) !== null) {
                return handle_type3(request, response, next, ah_data[1], function(error) {
                    if (error) {
                        options.debug(options.prefix, error.stack);
                        return options.internalservererror(request, response, next);
                    }
                });
            }
            options.debug(options.prefix, 'Unexpected NTLM message Type 3 in new connection for URI ' + request.protocol + '://' + request.get('host') + request.originalUrl);
            return options.internalservererror(request, response, next);
        }
        options.debug(options.prefix, 'Type 2 message in client request');
        return options.badrequest(request, response, next);
    };
};
