/* jshint node:true */

var util = require('util');

var ASN1 = require('./ASN1'),
    NTLM_Proxy = require('./NTLM_Proxy'),
    utils = require('./utils');

function LDAP_Context() {
    this.messageID = 0;

    this.LDAP_Result_success = 0;
    this.LDAP_Result_saslBindInProgress = 14;
}

LDAP_Context.prototype.make_session_setup_req = function(ntlm_token, type1) {

    var authentication = ASN1.maketlv(0xA3, utils.concatBuffer(ASN1.makeoctstr('GSS-SPNEGO'), ASN1.makeoctstr(ntlm_token))),
        bindRequest = ASN1.maketlv(0x60, utils.concatBuffer(ASN1.makeint(3), ASN1.makeoctstr(''), authentication));

    this.messageID++;

    return ASN1.makeseq(utils.concatBuffer(ASN1.makeint(this.messageID), bindRequest));
};

LDAP_Context.prototype.make_negotiate_protocol_req = function() {
    return;
};

LDAP_Context.prototype.parse_session_setup_resp = function(response, callback) {
    try {
        var data = ASN1.parseseq(response);

        var messageID = ASN1.parseint(data, true);
        data = messageID[1];
        messageID = messageID[0];


        if (messageID != this.messageID) {
            throw new Error('Unexpected MessageID: ' + messageID + ' instead of ' + this.messageID);
        }

        var controls = ASN1.parsetlv(0x61, data, true);
        data = controls[0];
        controls = controls[1];

        var resultCode = ASN1.parseenum(data, true);
        data = resultCode[1];
        resultCode = resultCode[0];

        var matchedDN = ASN1.parseoctstr(data, true);
        data = matchedDN[1];
        matchedDN = matchedDN[0];

        var diagnosticMessage = ASN1.parseoctstr(data, true);
        data = diagnosticMessage[1];
        diagnosticMessage = diagnosticMessage[0];

        if (resultCode == this.LDAP_Result_success) {
            return callback(null, true, '');
        }

        if (resultCode != this.LDAP_Result_saslBindInProgress) {
            return callback(null, false, '');
        }

        var serverSaslCreds = ASN1.parsetlv(0x87, data);
        return callback(null, true, serverSaslCreds);
    }
    catch (error) {
        return callback(error);
    }
};

function NTLM_AD_Proxy(ipad, port, domain, base, use_tls, tlsOptions) {
    this._ipad = ipad;
    this._portad = port || (use_tls ? 636 : 389);

    NTLM_Proxy.call(this, this._ipad, this._portad, domain, LDAP_Context, use_tls, tlsOptions);
    this.base = base;
}

util.inherits(NTLM_AD_Proxy, NTLM_Proxy);

module.exports = NTLM_AD_Proxy;
