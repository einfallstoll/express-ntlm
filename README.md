[![NPM version](https://img.shields.io/npm/v/express-ntlm.svg?style=flat)](https://www.npmjs.com/package/express-ntlm)

# express-ntlm

An express middleware to have basic NTLM-authentication in node.js.

> **Upgrading from 1.0:** The fields for username, domain and workstation have different names now: `UserName`, `DomainName`, `Workstation`.

*Active Directory support is heavily inspired by [PyAuthenNTLM2](https://github.com/Legrandin/PyAuthenNTLM2/).*

## important notes on (reverse) proxies and NTLM

NTLM is designed for corporate networks without a proxy between the client and the application. It does authorise the TCP connection instead of the HTTP session and with a proxy between, it'll authorise the connection between the proxy and the application and therefore mixing up users if the proxy shares the same connection or "forgetting" users if the proxy suddenly uses a different connection for the same user.

In an early state of this module `express-ntlm` tried to create a session during the negotiation, which failed (see [`50d9ac4`](https://github.com/einfallstoll/express-ntlm/commit/50d9ac4a06552ab39d49eadf9efe68f02d122176)) even though [RFC6265](https://tools.ietf.org/html/rfc6265#section-3) makes it clear it MUST be possible: "User agents [...] MUST process Set-Cookie headers contained in other responses (including responses with 400- and 500-level status codes)."

A possible solution to this problem might be to set the `keep-alive` property in nginx as mentioned in an [answer from StackOverflow regarding this issue](http://stackoverflow.com/a/22918442/377369) but it could end in the "multiple-users same-connection"-problem [mentioned from another user](http://stackoverflow.com/a/22806907/377369).

Another option would be to abandon the proxy completely and connect directly to the application on port 80 or build a custom reverse proxy that authenticates the user, creates a session and keeps the session data on a shared store, that is accessible by all applications behind the proxy (e.g. [expressjs/session](https://github.com/expressjs/session) in combination with [visionmedia/connect-redis](http://github.com/visionmedia/connect-redis)).

## install

    $ npm install express-ntlm

## example usage

    var express = require('express'),
        ntlm = require('express-ntlm');

    var app = express();

    app.use(ntlm({
        debug: function() {
            var args = Array.prototype.slice.apply(arguments);
            console.log.apply(null, args);
        },
        domain: 'MYDOMAIN',
        domaincontroller: 'ldap://myad.example',

        // use different port (default: 389)
        // domaincontroller: 'ldap://myad.example:3899',
    }));

    app.all('*', function(request, response) {
        response.end(JSON.stringify(request.ntlm)); // {"DomainName":"MYDOMAIN","UserName":"MYUSER","Workstation":"MYWORKSTATION"}
    });

    app.listen(80);


## example with ldaps

    var express = require('express'),
        ntlm = require('express-ntlm'),
        fs = require('fs');

    var app = express();

    app.use(ntlm({
        debug: function() {
            var args = Array.prototype.slice.apply(arguments);
            console.log.apply(null, args);
        },
        domain: 'MYDOMAIN',
        domaincontroller: 'ldaps://myad.example',
        tlsOptions: {
            //trusted certificate authorities (can be extracted from the server with openssh)
            ca: fs.readFileSync('./ca.pem'),
            //tells the tls module not to check the server's certificate (do not use in production)
            //rejectUnauthorized: false,
        }
    }));

    //same as above
    app.all('*', function(request, response) {
        response.end(JSON.stringify(request.ntlm)); // {"DomainName":"MYDOMAIN","UserName":"MYUSER","Workstation":"MYWORKSTATION"}
    });

    app.listen(80);

### without validation

It's not recommended, but it's possible to add NTLM-Authentication without validation. This means you can authenticate without providing valid credentials.

    app.use(ntlm());

## options

| Name | type | default | description |
|------|------|---------|-------------|
| `badrequest` | `function` | `function(request, response, next) { response.sendStatus(400); }` | Function to handle HTTP 400 Bad Request. |
| `internalservererror` | `function` | `function(request, response, next) { response.sendStatus(500); }` | Function to handle HTTP 500 Internal Server Error. |
| `forbidden` | `function` | `function(request, response, next) { response.sendStatus(403); }` | Function to handle HTTP 403 Forbidden. |
| `unauthorized` | `function` | `function(request, response, next) { response.statusCode = 401; response.setHeader('WWW-Authenticate', 'NTLM'); response.end();  }` | Function to handle HTTP 401 Unauthorized. |
| `prefix` | `string` | `[express-ntlm]` | The prefix is the first argument passed to the `debug`-function. |
| `debug` | `function` | `function() {}` | Function to log the debug messages. See [logging](#logging) for more details. |
| `domain` | `string` | `undefined` | Default domain if the DomainName-field cannot be parsed. |
| `domaincontroller` | `null` / `string` / `array` | `null` | One or more domaincontroller(s) to handle the authentication. If `null` is specified the user is not validated. Active Directory is supported. |
| `tlsOptions` | `object` | `undefined` | An options object that will be passed to [tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) and [tls.createSecureContext](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options). __Only required when using ldaps and the server's certificate is signed by a certificate authority not in Node's default list of CAs.__ (or use [NODE_EXTRA_CA_CERTS](https://nodejs.org/api/cli.html#cli_node_extra_ca_certs_file) environment variable)|
| `tlsOptions.ca` | `string` /  `array` / `Buffer` | `undefined` | Override the trusted CA certificates provided by Node. Refer to [tls.createSecureContext](https://nodejs.org/api/tls.html#tls_tls_createsecurecontext_options) |
| `getConnectionId` | `function` | `function(request, response) { return utils.uuidv4(); }` | Function to generate custom connection IDs, based optionally on the request and response objects. Used by the default implementation of `getProxyId` to keep backwards compatibility. *deprecated* |
| `getProxyId` | `function` | `function(request, response) { if (!request.connection.id) { request.connection.id = options.getConnectionId(request, response); } return request.connection.id; }` | Function to generate custom proxy cache IDs, based optionally on the request and response objects. |
| `getCachedUserData` | `function` | `function(request, response) { return request.connection.ntlm; }` | Function to return the cached NTLM user data. |
| `addCachedUserData` | `function` | `function(request, response, userData) { request.connection.ntlm = userData; }` | Function to cache the NTLM user data. |

## logging (examples)
<a name="logging" />

### simple debugging to the console

    function() {
        var args = Array.prototype.slice.apply(arguments);
        console.log.apply(null, args);
    }

### logging to [debug](https://github.com/visionmedia/debug) (or similiar logging-utilities)

    function() {
        var args = Array.prototype.slice.apply(arguments);
        debug.apply(null, args.slice(1)); // slice the prefix away, since debug is already prefixed
    }

### notes

All NTLM-fields (`UserName`, `DomainName`, `Workstation`) are also available within `response.locals.ntlm`, which means you can access it through your template engine (e.g. jade or ejs) while rendering (e.g. `<%= ntlm.UserName %>`).
