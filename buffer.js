function emptyBuffer(length) {
    var buf = new Buffer(length);
    for (var i = 0; i < length; i++) {
        buf.writeUInt8(0, i);
    }
    return buf;
}

for (var i = 0; i < 100; i++) {
    console.log((emptyBuffer(30)).toString('hex'));
}
