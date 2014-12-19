/* jshint node: true */

function Cache() {
    this._cache = {};
}

Cache.prototype.remove = function(id) {
    var proxy = this._cache[id];
    if (proxy) {
        proxy[0].close();
        delete this._cache[id];
    }
};

Cache.prototype.add = function(id, proxy) {
    this._cache[id] = [proxy, Date.now()];
};

Cache.prototype.clean = function() {
    var now = Date.now();
    for (var id in this._cache) {
        if (this._cache[id][1] + 60 * 1000 < now) {
            this.remove(id);
        }
    }
};

Cache.prototype.get_proxy = function(id) {
    if (!this._cache[id]) return null;
    return this._cache[id][0];
};

module.exports = Cache;
