/* jshint node:true */
const crypto = require('crypto');

var utils = {
    concatBuffer: function() {
        var bufs = Array.prototype.slice.call(arguments, 0),
            totalLength = 0,
            i,
            offset = 0;

        for (i = 0; i < bufs.length; i++) {
            totalLength += bufs[i].length;
        }

        var finalBuf = new Buffer(totalLength);

        for (i = 0; i < bufs.length; i++) {
            bufs[i].copy(finalBuf, offset);
            offset += bufs[i].length;
        }

        return finalBuf;
    },
    isFlagSet: function(field, flag) {
        return (field & flag) === flag;
    },
    toBinary: function(int) {
        return parseInt(int, 2);
    },
    uuidv4: function() {
        var buf = new Uint32Array(4);
        crypto.getRandomValues(buf);
        var idx = -1;
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            idx++;
            var r = (buf[idx>>3] >> ((idx%8)*4))&15;
            var v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }
};

module.exports = utils;
