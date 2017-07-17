const ntlm_client = require('./')

const MESSAGE_NTLM_1 = 'MESSAGE_NTLM_1';
const MESSAGE_NTLM_3 = 'MESSAGE_NTLM_3'
const HOSTNAME = 'YOUR_HOSTNAME'
const PORT = 'YOUR_PORT'
const DOMAIN = 'YOUR_DOMAIN'

const client = ntlm_client({
    hostname: HOSTNAME,
    port: PORT,
    domain: DOMAIN,
    path: null,
    use_tls: false,
    tls_options: undefined
})

client.negotiate(MESSAGE_NTLM_1, (err, challenge) => {
    if (err) throw new Error(err);
    console.log(challenge);

    client.authenticate(MESSAGE_NTLM_3, (err, result) => {
        if (err) throw new Error(err);
        console.log(result);
    })
})
