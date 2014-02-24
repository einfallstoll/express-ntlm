var debug = require('debug')('ntlm:main')

module.exports = function() {
	return function(request, response, next) {
		var auth = request.headers.authorization
		
		if (!auth) {
			debug('Start NTLM authentication')
			
			response.statusCode = 401;
			response.setHeader('WWW-Authenticate', 'NTLM');
			response.end();
		} else {
			debug('Authentication-Header', auth)
			
			var msg = new Buffer(auth.substr(5), 'base64')
			
			if (msg.toString('utf8', 0, 8) != 'NTLMSSP\0') {
				console.error('Invalid NTLM response header.');
			}
			
			if (msg.readUInt8(8) == 1) {
				debug('NTML Message Type 1')
				
				var msg2 = new Buffer(40)
				, offset = 0
				
				var header = 'NTLMSSP\0'
				for (var i = 0; i < header.length; i++)
					msg2.writeUInt8(header.charCodeAt(i), offset++)
				
				msg2.writeUInt8(0x02, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x28, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x01, offset++)
				msg2.writeUInt8(0x82, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x01, offset++)
				msg2.writeUInt8(0x23, offset++)
				msg2.writeUInt8(0x45, offset++)
				msg2.writeUInt8(0x67, offset++)
				msg2.writeUInt8(0x89, offset++)
				msg2.writeUInt8(0xab, offset++)
				msg2.writeUInt8(0xcd, offset++)
				msg2.writeUInt8(0xef, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				msg2.writeUInt8(0x00, offset++)
				
				debug('NTML Message Type 2', 'NTLM ' + msg2.toString('base64'))
				
				response.statusCode = 401;
				response.setHeader('WWW-Authenticate', 'NTLM ' + msg2.toString('base64'));
				response.end();
			} else if (msg.readUInt8(8) == 3) {
				debug('NTML Message Type 3')
				
				var ntlmdata = {
					target: msg.toString('utf16le', msg.readUInt16LE(32), msg.readUInt16LE(32) + msg.readUInt16LE(28)),
					userid: msg.toString('utf16le', msg.readUInt16LE(40), msg.readUInt16LE(40) + msg.readUInt16LE(36)),
					workstation: msg.toString('utf16le', msg.readUInt16LE(48), msg.readUInt16LE(48) + msg.readUInt16LE(44))
				}
				
				request.ntlm = ntlmdata
				response.locals.ntlm = ntlmdata
				
				next()
			} else {
				debug('NTML Message Type not known')
				response.end()
			}
		}
	}
}