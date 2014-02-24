# express-ntlm

an express middleware to have basic NTLM-authentication in node.js.

## install

    $ npm install express-ntlm

## usage

    var app = require('express')()
    , ntlm = require('express-ntlm')()
    
    app.listen(80)
    
    app.all('/', ntlm())
    
    app.get('/', function(request, response) {
        console.log(request.ntlm) // { target: 'MYDOMAIN', userid: 'MYUSERID', workstation: 'MYWORKSTATION' }
    })
    
### notes

ntlm is also available within `response.locals` which means you can access it through your template engine (e.g. jade or ejs) using `ntlm`.
