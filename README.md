# ltcache

A lightweight, in-memory caching library - like Redis but much simpler. Features TTL support, concurrent request handling, and comprehensive statistics. Perfect for Node.js applications and frontend applications that need fast caching without the complexity of Redis.

[![build status](https://github.com/mhweiner/ltcache/actions/workflows/release.yml/badge.svg)](https://github.com/mhweiner/ltcache/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SemVer](https://img.shields.io/badge/SemVer-2.0.0-blue)]()
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)
[![AutoRel](https://img.shields.io/badge/%F0%9F%9A%80%20AutoRel-2D4DDE)](https://github.com/mhweiner/autorel)

## ✨ Features

- **🚀 Lightweight**: Zero external dependencies, minimal memory footprint
- **⏱️ TTL Support**: Automatic expiration with configurable time-to-live
- **🔄 Concurrent Safe**: Multiple simultaneous requests for the same key only call the function once
- **📊 Statistics**: Built-in hit rate tracking and cache size monitoring
- **🎯 Pattern Removal**: Remove multiple keys using regex patterns
- **🔒 TypeScript**: Full type safety with generics
- **⚡ Fast**: In-memory storage for maximum performance
- **🌐 Universal**: Works in Node.js, browsers, React, Vue, and other frontend frameworks

## 📦 Installation

```bash
npm install ltcache
```

## 🚀 Quick Start

```ts
import {cache} from 'ltcache';

// Create a cache instance
const cacheInstance = cache();

// Create a cache instance with debug logging enabled
const debugCache = cache(true);

// Simple caching
cacheInstance.set('user:123', {name: 'Alice', email: 'alice@example.com'}, 3600); // 1 hour TTL
const user = await cacheInstance.get('user:123');

// Caching with fallback function
const user = await cacheInstance.get('user:123', async () => {
  // This function only runs if the key doesn't exist
  return await fetchUserFromDatabase(123);
}, 3600); // Cache for 1 hour

// Get cache statistics
const stats = cacheInstance.report();
console.log(`Hit rate: ${stats.hitRate}%`);
```

## 📚 Documentation

- [API Reference](./docs/api.md) - Complete API documentation
- [Examples](./docs/examples.md) - Common usage patterns and examples

## 🎯 Use Cases

### Perfect for:
- **API Response Caching**: Cache expensive API calls
- **Database Query Results**: Store frequently accessed data
- **Configuration Storage**: Cache app configuration
- **Session Data**: Store temporary user session information
- **Microservices**: Lightweight caching between services
- **Frontend Apps**: Cache API responses, user preferences, and computed data in React, Vue, and other frameworks
- **Browser Storage**: Lightweight alternative to localStorage with TTL support
- **SPA Performance**: Improve app responsiveness by caching expensive operations

### When to use ltcache vs Redis:

**Use ltcache when:**
- You need simple, fast caching
- You want zero external dependencies
- Your cache fits in memory
- You don't need persistence across restarts
- You want minimal setup and configuration
- You're building frontend applications (React, Vue, etc.) and need client-side caching

**Use Redis when:**
- You need persistence across application restarts
- You need to share cache across multiple applications (though ltcache could be used as the foundation for a Redis-style server)
- You need advanced data structures (lists, sets, etc.)
- You need pub/sub functionality
- You need clustering or replication

## 🔧 Advanced Usage

### Debug Mode

Enable debug logging to see cache operations in real-time:

```ts
// Create cache with debug logging enabled
const cache = cache(true);

// All cache operations will now log to console
await cache.get('user:123', async () => {
  return await fetchUserFromDatabase(123);
});
// Output: miss: user:123
// Output: set: user:123

await cache.get('user:123');
// Output: hit: user:123
```

### Concurrent Request Handling

```ts
// Multiple simultaneous requests for the same key
const promises = [
  cache.get('expensive-data', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'result';
  }),
  cache.get('expensive-data', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'result';
  }),
  cache.get('expensive-data', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return 'result';
  })
];

const results = await Promise.all(promises);
// All three promises resolve to the same value
// The expensive function is only called once
```

### Pattern-based Removal

```ts
// Cache some data
cache.set('user:123:profile', profileData);
cache.set('user:123:settings', settingsData);
cache.set('user:456:profile', profileData2);
cache.set('config:app', appConfig);

// Remove all user data for user 123
cache.remove(/^user:123:/);

// Remove all user profiles
cache.remove(/^user:.*:profile$/);

// Remove all config
cache.remove(/^config:/);
```

### Cache Statistics

```ts
const stats = cache.report();
console.log({
  items: stats.numItems,        // Number of cached items
  hitRate: stats.hitRate,       // Hit rate percentage
  sizeKb: stats.sizeKb          // Estimated memory usage
});
```

## 🧪 Testing

```bash
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📈 Performance

ltcache is designed for speed and efficiency:

- **Memory efficient**: Uses Map for O(1) lookups
- **Concurrent safe**: Handles multiple simultaneous requests efficiently
- **Minimal overhead**: Zero external dependencies
- **Fast expiration**: Efficient timeout management

## 🔗 Related Projects

- [Redis](https://redis.io/) - Full-featured in-memory data store
- [node-cache](https://github.com/node-cache/node-cache) - Another Node.js caching library
- [lru-cache](https://github.com/isaacs/node-lru-cache) - LRU cache implementation

---

Made with ❤️ by [Marc H. Weiner](https://linkedin.com/in/mhweiner)