/* jshint node:true */

function NTLM_No_Proxy() {}

NTLM_No_Proxy.prototype.close = function() {
    
};

const NEGOTIATE_OEM         = 1 << 1;
const REQUEST_TARGET        = 1 << 2;
const TARGET_TYPE_DOMAIN    = 1 << 16;
const NEGOTIATE_NTLM2_KEY   = 1 << 19;
const NEGOTIATE_TARGET_INFO = 1 << 23;

NTLM_No_Proxy.prototype.negotiate = function(ntlm_negotiate, negotiate_callback) {
    const targetName = 'ALPHA';
    const flags = NEGOTIATE_OEM || REQUEST_TARGET || TARGET_TYPE_DOMAIN || NEGOTIATE_NTLM2_KEY || NEGOTIATE_TARGET_INFO;
    var challenge = new Buffer(40 + targetName.length),
        offset = 0;

    const header = 'NTLMSSP\0';
    offset += challenge.write(header, 0, 'ascii');

    // Type 2 message
    offset = challenge.writeUInt32LE(0x00000002, offset);

    // Target name security buffer
    offset = challenge.writeUInt16LE(targetName.length, offset);
    offset = challenge.writeUInt16LE(targetName.length, offset);
    offset = challenge.writeUInt32LE(40, offset);

    // Flags
    offset = challenge.writeUInt32LE(flags, offset);

    // Server challenge
    offset = challenge.writeUInt32LE(0x89abcdef, offset);
    offset = challenge.writeUInt32LE(0x01234567, offset);

    // Context
    offset = challenge.writeUInt32LE(0, offset);
    offset = challenge.writeUInt32LE(0, offset);

    // Target name data
    offset += challenge.write(targetName, offset, 'ascii');
    console.log(challenge.toString('base64'));

    negotiate_callback(null, challenge);
};

NTLM_No_Proxy.prototype.authenticate = function(ntlm_authenticate, authenticate_callback) {
    authenticate_callback(null, true);
};

module.exports = NTLM_No_Proxy;
