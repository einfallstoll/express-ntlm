# express-ntlm

an express middleware to have basic NTLM-authentication in node.js.

## install

    $ npm install express-ntlm

## usage

    var app = require('express')()
    , ntlm = require('ntlm')()
    
    app.listen(80)
    
    app.all('/', ntml())
    
    app.get('/', function(request, response) {
        console.log(request.ntml) // { target: 'MYDOMAIN', userid: 'MYUSERID', workstation: 'MYWORKSTATION' }
    })
