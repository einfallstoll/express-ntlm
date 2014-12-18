/* jshint node:true */

var utils = {
    concatBuffer: function() {
        var bufs = Array.prototype.slice.call(arguments, 0),
            totalLength = 0,
            buf,
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
    }
};

module.exports = utils;
