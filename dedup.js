const fs = require('fs');
const path = require('path');

class DedupCache {
  constructor(maxAgeMs = 86400000) { // 24 hours
    this.maxAgeMs = maxAgeMs;
    this.cachePath = path.join(__dirname, 'dedup-cache.json');
    this.cache = {};
  }

  load() {
    if (fs.existsSync(this.cachePath)) {
      try {
        this.cache = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
        this._purgeExpired();
      } catch (error) {
        console.warn('⚠️  Failed to load dedup cache, starting fresh');
        this.cache = {};
      }
    }
  }

  save() {
    fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2));
  }

  add(key) {
    this.cache[key] = Date.now();
  }

  has(key) {
    return key in this.cache && (Date.now() - this.cache[key]) < this.maxAgeMs;
  }

  _purgeExpired() {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (now - this.cache[key] > this.maxAgeMs) {
        delete this.cache[key];
      }
    });
  }
}

module.exports = DedupCache;
