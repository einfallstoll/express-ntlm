# express-ntlm

An express middleware to have basic NTLM-authentication in node.js.

> **Upgrading from 1.0:** As of v2.0.0 `express-ntlm` requires [`express-session`](https://github.com/expressjs/session). Also the fields for username, domain and workstation have different names now.

*Active Directory support is heavily inspired by [PyAuthenNTLM2](https://github.com/Legrandin/PyAuthenNTLM2/).*

## install

    $ npm install express-ntlm

## example usage

    var express = require('express'),
        ntlm = require('./lib/express-ntlm'),
        session = require('express-session');

    var app = express();

    // express-ntlm requires a session to store its connection
    app.use(session({
        secret: 'ntlm-secret',
        resave: true,
        saveUninitialized: true
    }));

    app.use(ntlm({
        debug: function() {
            var args = Array.prototype.slice.apply(arguments);
            console.log.apply(null, args);
        },
        domain: 'MYDOMAIN',
        domaincontroller: 'ldap://myad.example',
    }));

    app.all('*', function(request, response) {
        response.end(JSON.stringify(request.ntlm)); // {"DomainName":"MYDOMAIN","UserName":"MYUSER","Workstation":"MYWORKSTATION"}
    });

    app.listen(80);

## options

| Name | type | default | description |
|------|------|---------|-------------|
| `badrequest` | `function` | `function(request, response, next) { response.sendStatus(400); }` | Function to handle HTTP 400 Bad Request. |
| `internalservererror` | `function` | `function(request, response, next) { response.sendStatus(500); }` | Function to handle 500 Internal Server Error. |
| `forbidden` | `function` | `function(request, response, next) { response.sendStatus(403); }` | Function to handle HTTP 403 Forbidden. |
| `prefix` | `string` | `[express-ntlm]` | The prefix is the first argument passed to the `debug`-function. |
| `debug` | `function` | `function() {}` | Function to log the debug messages. See [logging](#logging) for more details. |
| `domain` | `string` | `undefined` | Default domain if the DomainName-field cannot be parsed. |
| `domaincontroller` | `null` / `string` / `array` | `null` | One or more domaincontroller(s) to handle the authentication. If `null` is specified the user is not validated. |

<a name="logging" />
## logging (examples)

### simple debugging to the console

    function() {
        var args = Array.prototype.slice.apply(arguments);
        console.log.apply(null, args);
    }
    
### logging to [debug](https://github.com/visionmedia/debug)

    function() {
        var args = Array.prototype.slice.apply(arguments);
        debug.apply(null, args.slice(1)); // slice the prefix away, since debug is already prefixed
    }

### notes

ntlm is also available within `response.locals` which means you can access it through your template engine (e.g. jade or ejs) using `ntlm`.
