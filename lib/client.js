'use strict';

const NTLM_AD_Proxy = require('./NTLM_AD_Proxy');
const utils = require('./utils');

const ntlm_client = (options) => {

    let {
        hostname,
        port,
        domain,
        path,
        use_tls,
        tls_options
    } = options;

    let proxy = new NTLM_AD_Proxy(hostname, port, domain, path, use_tls, tls_options);

    let module = {}

    const ntlm_message_type = (msg) => {
        if (msg.toString('utf8', 0, 8) != 'NTLMSSP\0') {
            return new Error('Not a valid NTLM message:', msg.toString('hex'));
        }
        let msg_type = msg.readUInt8(8);
        if (!~[1, 2, 3].indexOf(msg_type)) {
            return new Error('Incorrect NTLM message Type', msg_type);
        }
        return msg_type;
    }

    const parse_ntlm_authenticate = (msg) => {
        var NTLMSSP_NEGOTIATE_UNICODE = utils.toBinary('00000001'),
            DomainNameLen = msg.readUInt16LE(0x1C),
            DomainNameBufferOffset = msg.readUInt32LE(0x20),
            DomainName = msg.slice(DomainNameBufferOffset,
                DomainNameBufferOffset + DomainNameLen),
            UserNameLen = msg.readUInt16LE(0x24),
            UserNameBufferOffset = msg.readUInt32LE(0x28),
            UserName = msg.slice(UserNameBufferOffset,
                UserNameBufferOffset + UserNameLen),
            WorkstationLen = msg.readUInt16LE(0x2C),
            WorkstationBufferOffset = msg.readUInt32LE(0x30),
            Workstation = msg.slice(WorkstationBufferOffset,
                WorkstationBufferOffset + WorkstationLen)

        if (utils.isFlagSet(msg.readUInt8(0x3C), utils.toBinary('00000001'))) {
            DomainName = DomainName.toString('utf16le')
            UserName = UserName.toString('utf16le')
            Workstation = Workstation.toString('utf16le')
        } else {
            DomainName = DomainName.toString()
            UserName = UserName.toString()
            Workstation = Workstation.toString()
        }

        return {
            UserName,
            DomainName,
            Workstation
        }
    }

    module.negotiate = (ntlm_negotiate_base64, negotiate_callback) => {

        let ntlm_negotiate = new Buffer(ntlm_negotiate_base64, 'base64');
        let ntlm_version = ntlm_message_type(ntlm_negotiate);

        if (ntlm_version instanceof Error) return negotiate_callback(ntlm_version)
        if (ntlm_version !== 1)
            return negotiate_callback(new Error('Expected NTLM message1 Type'))

        proxy.negotiate(ntlm_negotiate, (err, challenge) => {
            if (err) {
                proxy.close()
                proxy = null
            }
            return negotiate_callback(err, 'NTLM ' + challenge.toString('base64'))
        })
    }

    module.authenticate = (ntlm_auth_base64, authenticate_callback) => {
        let ntlm_auth = new Buffer(ntlm_auth_base64, 'base64');
        let ntlm_version = ntlm_message_type(ntlm_auth);

        if (ntlm_version instanceof Error) return authenticate_callback(ntlm_version)
        if (ntlm_version !== 3)
            return authenticate_callback(new Error('Expected NTLM message3 Type'))

        proxy.authenticate(ntlm_auth, (err, result) => {
            if (err || !result) {
                proxy.close()
                proxy = null
                return authenticate_callback(new Error('Authentication error'))
            }
            return authenticate_callback(null, parse_ntlm_authenticate(ntlm_auth))
        })
    }

    return module
}

module.exports = ntlm_client
