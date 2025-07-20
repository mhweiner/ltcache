# API Reference

- [cache()](#cache)
- [Cache type](#type-cache)
- [Report type](#type-report)

## 🧱 Methods

### `cache()`

```ts
cache(): Cache
```

Creates a new in-memory cache instance with TTL support, concurrent request handling, and comprehensive statistics.

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();
```

---

## 🧩 Types

### `type Cache`

The main cache interface returned by `cache()`:

```ts
type Cache = {
  get: <T>(key: string, fn?: () => Promise<T>, lifetimeInSeconds?: number) => Promise<T>
  set: <T>(key: string, value: T, lifetimeInSeconds?: number) => void
  remove: (key: string | RegExp) => void
  reset: () => void
  report: () => Report
};
```

#### `get(key, fn?, lifetimeInSeconds?)`

Retrieves a value from the cache. If the key doesn't exist and a function is provided, the function will be called to generate the value, which will then be cached.

```ts
// Simple get
const value = await cache.get('my-key');

// Get with fallback function
const value = await cache.get('my-key', async () => {
  return await fetchExpensiveData();
});

// Get with fallback function and TTL
const value = await cache.get('my-key', async () => {
  return await fetchExpensiveData();
}, 300); // 5 minutes
```

**Features:**
- **Concurrent safety**: Multiple simultaneous requests for the same key will only call the function once
- **TTL support**: Values can be cached with automatic expiration
- **Type safety**: Full TypeScript support with generics

#### `set(key, value, lifetimeInSeconds?)`

Stores a value in the cache with an optional TTL.

```ts
// Store without expiration
cache.set('key', 'value');

// Store with 5-minute TTL
cache.set('key', 'value', 300);

// Store complex objects
cache.set('user:123', {name: 'Alice', email: 'alice@example.com'}, 3600);
```

#### `remove(key | pattern)`

Removes items from the cache. Supports both exact keys and regex patterns.

```ts
// Remove single key
cache.remove('user:123');

// Remove multiple keys with regex
cache.remove(/^user:/); // Removes all keys starting with "user:"
cache.remove(/\.tmp$/); // Removes all keys ending with ".tmp"
```

#### `reset()`

Clears all cached data and resets statistics.

```ts
cache.reset();
```

#### `report()`

Returns comprehensive cache statistics.

```ts
const stats = cache.report();
console.log(stats);
// {
//   numItems: 42,
//   hitRate: 85.5,
//   sizeKb: 12
// }
```

---

### `type Report`

Statistics returned by `cache.report()`:

```ts
type Report = {
  numItems: number    // Number of items currently in cache
  hitRate: number     // Hit rate percentage (0-100)
  sizeKb: number      // Estimated cache size in kilobytes
};
```

- `numItems`: Count of all cached items (excluding expired items)
- `hitRate`: Percentage of cache hits vs total requests, rounded to 2 decimal places
- `sizeKb`: Estimated memory usage based on serialized key/value sizes

---

## 🔧 Advanced Features

### Concurrent Request Handling

The cache automatically handles concurrent requests for the same key:

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

### TTL (Time To Live) Support

Values can be cached with automatic expiration:

```ts
// Cache for 1 hour
cache.set('user:123', userData, 3600);

// Cache for 5 minutes
cache.set('temp-data', tempData, 300);

// No expiration (stays until manually removed)
cache.set('config', configData);

// Negative or zero TTL = no expiration
cache.set('permanent', data, 0);
cache.set('permanent2', data, -1);
```

### Pattern-based Removal

Remove multiple keys using regex patterns:

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

### Error Handling

Functions that throw errors are not cached:

```ts
try {
  await cache.get('error-key', async () => {
    throw new Error('Something went wrong');
  });
} catch (error) {
  // Error is thrown as expected
  console.error(error.message); // "Something went wrong"
}

// The error is not cached, so subsequent calls will retry
const result = await cache.get('error-key', async () => {
  return 'success'; // This will be called again
});
```
