/* jshint node:true */

function NTLM_No_Proxy() {}

NTLM_No_Proxy.prototype.close = function() {

};

const NEGOTIATE_UNICODE     = 1;
const NEGOTIATE_OEM         = 1 << 1;
const REQUEST_TARGET        = 1 << 2;
const NEGOTIATE_NTLM_KEY    = 1 << 9;
const TARGET_TYPE_DOMAIN    = 1 << 16;
const NEGOTIATE_NTLM2_KEY   = 1 << 19;
const NEGOTIATE_TARGET_INFO = 1 << 23;

NTLM_No_Proxy.prototype.negotiate = function(ntlm_negotiate, negotiate_callback) {
    const target_name = 'ALPHA';
    let challenge_flags = REQUEST_TARGET | TARGET_TYPE_DOMAIN;

    // Follow requested NTLM protocol version
    const request_flags = ntlm_negotiate.readUInt32LE(12);
    const ntlm_version = request_flags & NEGOTIATE_NTLM2_KEY ? 2 : 1;
    const use_unicode = request_flags & NEGOTIATE_UNICODE;
    let header_len;
    let data_len;
    let target_name_buffer_len; 
    
    if (use_unicode) {
      challenge_flags |= NEGOTIATE_UNICODE;
      target_name_buffer_len = target_name.length * 2;
    } else {
      challenge_flags |= NEGOTIATE_OEM;
      target_name_buffer_len = target_name.length;
    }

    if (ntlm_version === 2) {
      challenge_flags |= NEGOTIATE_NTLM2_KEY | NEGOTIATE_TARGET_INFO;
      header_len = 40 + 8;
      data_len = target_name_buffer_len + ((2 * target_name.length) + 8);
    } else {
      challenge_flags |= NEGOTIATE_NTLM_KEY;
      header_len = 40;
      data_len = target_name_buffer_len;
    }
	
    let challenge = new Buffer(header_len + data_len);
    let offset = 0;

    const header = 'NTLMSSP\0';
    offset += challenge.write(header, 0, 'ascii');

    // Type 2 message
    offset = challenge.writeUInt32LE(0x00000002, offset);

    // Target name security buffer
    offset = challenge.writeUInt16LE(target_name_buffer_len, offset);
    offset = challenge.writeUInt16LE(target_name_buffer_len, offset);
    offset = challenge.writeUInt32LE(header_len, offset);

    // Flags
    offset = challenge.writeUInt32LE(challenge_flags, offset);

    // Server challenge
    offset = challenge.writeUInt32LE(0x89abcdef, offset);
    offset = challenge.writeUInt32LE(0x01234567, offset);

    // Context
    offset = challenge.writeUInt32LE(0, offset);
    offset = challenge.writeUInt32LE(0, offset);

    if (ntlm_version === 2) {
      // Target info security buffer
      offset = challenge.writeUInt16LE(target_name.length * 2 + 8, offset);
      offset = challenge.writeUInt16LE(target_name.length * 2 + 8, offset);
      offset = challenge.writeUInt32LE(header_len + target_name_buffer_len, offset);
    }

    // Target name data
    offset += challenge.write(target_name, offset, use_unicode ? 'ucs2' : 'ascii');

    if (ntlm_version === 2) {
      // Target info data
      offset = challenge.writeUInt16LE(0x0002, offset); // Domain
      offset = challenge.writeUInt16LE(target_name.length * 2, offset);
      offset += challenge.write(target_name, offset, 'ucs2');
      offset = challenge.writeUInt16LE(0x0000, offset); // Terminator block
      offset = challenge.writeUInt16LE(0, offset);
    }

    negotiate_callback(null, challenge);
};

NTLM_No_Proxy.prototype.authenticate = function(ntlm_authenticate, authenticate_callback) {
    authenticate_callback(null, true);
};

module.exports = NTLM_No_Proxy;
