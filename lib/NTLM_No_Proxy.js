/* jshint node:true */

function NTLM_No_Proxy() {}

NTLM_No_Proxy.prototype.close = function() {
    
};

NTLM_No_Proxy.prototype.negotiate = function(ntlm_negotiate, negotiate_callback) {
    var challenge = new Buffer(40),
        offset = 0;

    var header = 'NTLMSSP\0';
    for (var i = 0; i < header.length; i++) {
        challenge.writeUInt8(header.charCodeAt(i), offset++);
    }

    challenge.writeUInt8(0x02, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x28, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x01, offset++);
    challenge.writeUInt8(0x82, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x01, offset++);
    challenge.writeUInt8(0x23, offset++);
    challenge.writeUInt8(0x45, offset++);
    challenge.writeUInt8(0x67, offset++);
    challenge.writeUInt8(0x89, offset++);
    challenge.writeUInt8(0xab, offset++);
    challenge.writeUInt8(0xcd, offset++);
    challenge.writeUInt8(0xef, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    challenge.writeUInt8(0x00, offset++);
    
    negotiate_callback(null, challenge);
};

NTLM_No_Proxy.prototype.authenticate = function(ntlm_authenticate, authenticate_callback) {
    authenticate_callback(null, true);
};

module.exports = NTLM_No_Proxy;
