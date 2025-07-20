# Examples

This document provides practical examples of how to use ltcache in various scenarios.

## 📋 Table of Contents

- [Basic Usage](#basic-usage)
- [API Response Caching](#api-response-caching)
- [Database Query Caching](#database-query-caching)
- [Configuration Caching](#configuration-caching)
- [Session Management](#session-management)
- [Rate Limiting](#rate-limiting)
- [Cache Warming](#cache-warming)
- [Error Handling](#error-handling)
- [Performance Monitoring](#performance-monitoring)

## 🚀 Basic Usage

### Simple Key-Value Storage

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

// Store a value
cacheInstance.set('greeting', 'Hello, World!');

// Retrieve the value
const greeting = await cacheInstance.get('greeting');
console.log(greeting); // "Hello, World!"

// Store with TTL (5 minutes)
cacheInstance.set('temp-data', 'This will expire', 300);

// Check if exists
const exists = await cacheInstance.get('temp-data');
console.log(exists); // "This will expire" (if within 5 minutes)

// Remove a key
cacheInstance.remove('greeting');
const removed = await cacheInstance.get('greeting');
console.log(removed); // undefined
```

### Caching with Fallback Functions

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

// Expensive function that fetches user data
async function fetchUserFromDatabase(userId: number) {
  console.log(`Fetching user ${userId} from database...`);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate DB delay
  return {id: userId, name: `User ${userId}`, email: `user${userId}@example.com`};
}

// First call - function executes
const user1 = await cacheInstance.get(`user:${123}`, () => fetchUserFromDatabase(123));
// Output: "Fetching user 123 from database..."

// Second call - cached value returned
const user2 = await cacheInstance.get(`user:${123}`, () => fetchUserFromDatabase(123));
// No output - function not called

console.log(user1 === user2); // true (same object reference)
```

## 🌐 API Response Caching

### Caching External API Calls

```ts
import {cache} from 'ltcache';
import fetch from 'node-fetch';

const cacheInstance = cache();

async function getWeatherData(city: string) {
  return await cacheInstance.get(`weather:${city}`, async () => {
    console.log(`Fetching weather for ${city}...`);
    const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=${city}`);
    const data = await response.json();
    return data;
  }, 1800); // Cache for 30 minutes
}

// Usage
const weather = await getWeatherData('New York');
```

### Caching with Different TTLs

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

// Cache user profiles for 1 hour
async function getUserProfile(userId: string) {
  return await cacheInstance.get(`profile:${userId}`, async () => {
    return await fetchUserProfile(userId);
  }, 3600);
}

// Cache user settings for 24 hours
async function getUserSettings(userId: string) {
  return await cacheInstance.get(`settings:${userId}`, async () => {
    return await fetchUserSettings(userId);
  }, 86400);
}

// Cache static data indefinitely
async function getStaticData() {
  return await cacheInstance.get('static:config', async () => {
    return await fetchStaticConfig();
  }); // No TTL = never expires
}
```

## 🗄️ Database Query Caching

### Caching Database Results

```ts
import {cache} from 'ltcache';
import {db} from './database';

const cacheInstance = cache();

async function getActiveUsers() {
  return await cacheInstance.get('query:active-users', async () => {
    console.log('Executing database query...');
    const result = await db.query('SELECT * FROM users WHERE active = true');
    return result.rows;
  }, 600); // Cache for 10 minutes
}

async function getUserById(userId: number) {
  return await cacheInstance.get(`user:${userId}`, async () => {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  }, 1800); // Cache for 30 minutes
}

// Invalidate cache when user is updated
async function updateUser(userId: number, userData: any) {
  await db.query('UPDATE users SET ... WHERE id = $1', [userId]);
  cacheInstance.remove(`user:${userId}`); // Invalidate cache
}
```

### Complex Query Caching

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

async function getUsersByRole(role: string, limit: number = 10) {
  const cacheKey = `users:role:${role}:limit:${limit}`;
  
  return await cacheInstance.get(cacheKey, async () => {
    const result = await db.query(
      'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT $2',
      [role, limit]
    );
    return result.rows;
  }, 900); // 15 minutes
}

// Usage
const admins = await getUsersByRole('admin', 20);
const moderators = await getUsersByRole('moderator', 50);
```

## ⚙️ Configuration Caching

### Application Configuration

```ts
import {cache} from 'ltcache';
import {readFileSync} from 'fs';

const cacheInstance = cache();

async function getAppConfig() {
  return await cacheInstance.get('config:app', async () => {
    console.log('Loading app configuration...');
    const configFile = readFileSync('./config.json', 'utf8');
    return JSON.parse(configFile);
  }, 3600); // Reload every hour
}

async function getFeatureFlags() {
  return await cacheInstance.get('config:features', async () => {
    console.log('Loading feature flags...');
    const flags = await fetchFeatureFlagsFromAPI();
    return flags;
  }, 300); // Reload every 5 minutes
}

// Usage in your app
const config = await getAppConfig();
const features = await getFeatureFlags();

if (features.newUI) {
  // Enable new UI
}
```

## 👤 Session Management

### User Session Storage

```ts
import {cache} from 'ltcache';
import {v4 as uuidv4} from 'uuid';

const cacheInstance = cache();

interface UserSession {
  userId: string;
  email: string;
  permissions: string[];
  lastActivity: Date;
}

class SessionManager {
  private cache = cacheInstance;
  
  createSession(userId: string, email: string, permissions: string[]): string {
    const sessionId = uuidv4();
    const session: UserSession = {
      userId,
      email,
      permissions,
      lastActivity: new Date()
    };
    
    this.cache.set(`session:${sessionId}`, session, 3600); // 1 hour
    return sessionId;
  }
  
  async getSession(sessionId: string): Promise<UserSession | undefined> {
    const session = await this.cache.get<UserSession>(`session:${sessionId}`);
    if (session) {
      // Update last activity
      session.lastActivity = new Date();
      this.cache.set(`session:${sessionId}`, session, 3600);
    }
    return session;
  }
  
  invalidateSession(sessionId: string): void {
    this.cache.remove(`session:${sessionId}`);
  }
  
  invalidateUserSessions(userId: string): void {
    // This would require additional tracking in a real implementation
    // For now, we'll use a pattern-based approach
    this.cache.remove(new RegExp(`session:.*`));
  }
}

// Usage
const sessionManager = new SessionManager();
const sessionId = sessionManager.createSession('user123', 'user@example.com', ['read', 'write']);
const session = await sessionManager.getSession(sessionId);
```

## 🚦 Rate Limiting

### Simple Rate Limiter

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

class RateLimiter {
  private cache = cacheInstance;
  
  async isRateLimited(identifier: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    const key = `rate-limit:${identifier}`;
    
    const currentCount = await this.cache.get<number>(key, async () => {
      return 0;
    }, windowSeconds);
    
    if (currentCount >= maxRequests) {
      return true; // Rate limited
    }
    
    // Increment counter
    this.cache.set(key, currentCount + 1, windowSeconds);
    return false; // Not rate limited
  }
  
  async getRemainingRequests(identifier: string, maxRequests: number, windowSeconds: number): Promise<number> {
    const key = `rate-limit:${identifier}`;
    const currentCount = await this.cache.get<number>(key, async () => 0, windowSeconds);
    return Math.max(0, maxRequests - currentCount);
  }
}

// Usage
const rateLimiter = new RateLimiter();

async function handleAPIRequest(userId: string) {
  const isLimited = await rateLimiter.isRateLimited(userId, 100, 3600); // 100 requests per hour
  
  if (isLimited) {
    throw new Error('Rate limit exceeded');
  }
  
  // Process request
  console.log('Processing request...');
}

// Check remaining requests
const remaining = await rateLimiter.getRemainingRequests('user123', 100, 3600);
console.log(`Remaining requests: ${remaining}`);
```

## 🔥 Cache Warming

### Preloading Frequently Used Data

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

class CacheWarmer {
  private cache = cacheInstance;
  
  async warmUserCache(userIds: string[]) {
    console.log('Warming user cache...');
    
    const promises = userIds.map(async (userId) => {
      return await this.cache.get(`user:${userId}`, async () => {
        console.log(`Loading user ${userId}...`);
        return await fetchUserFromDatabase(userId);
      }, 3600);
    });
    
    await Promise.all(promises);
    console.log('User cache warmed successfully');
  }
  
  async warmConfigurationCache() {
    console.log('Warming configuration cache...');
    
    await this.cache.get('config:app', async () => {
      return await loadAppConfig();
    }, 3600);
    
    await this.cache.get('config:features', async () => {
      return await loadFeatureFlags();
    }, 300);
    
    console.log('Configuration cache warmed successfully');
  }
}

// Usage on application startup
const cacheWarmer = new CacheWarmer();

async function startup() {
  // Warm cache with active users
  const activeUserIds = await getActiveUserIds();
  await cacheWarmer.warmUserCache(activeUserIds);
  
  // Warm configuration cache
  await cacheWarmer.warmConfigurationCache();
  
  console.log('Application ready!');
}
```

## ⚠️ Error Handling

### Graceful Error Handling

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

async function getDataWithFallback(key: string) {
  try {
    return await cacheInstance.get(key, async () => {
      // This function might throw
      const data = await fetchDataFromExternalAPI();
      if (!data) {
        throw new Error('No data available');
      }
      return data;
    }, 300);
  } catch (error) {
    console.error(`Error fetching data for key ${key}:`, error);
    
    // Return fallback data
    return getFallbackData(key);
  }
}

async function getDataWithRetry(key: string, maxRetries: number = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await cacheInstance.get(key, async () => {
        console.log(`Attempt ${attempt} to fetch data...`);
        return await fetchDataFromExternalAPI();
      }, 300);
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to fetch data after ${maxRetries} attempts`);
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

## 📊 Performance Monitoring

### Cache Performance Tracking

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

class CacheMonitor {
  private cache = cacheInstance;
  private interval: NodeJS.Timeout;
  
  constructor() {
    this.startMonitoring();
  }
  
  private startMonitoring() {
    this.interval = setInterval(() => {
      this.logStats();
    }, 60000); // Log stats every minute
  }
  
  private logStats() {
    const stats = this.cache.report();
    
    console.log('=== Cache Statistics ===');
    console.log(`Items in cache: ${stats.numItems}`);
    console.log(`Hit rate: ${stats.hitRate}%`);
    console.log(`Memory usage: ${stats.sizeKb} KB`);
    console.log('========================');
    
    // Alert if hit rate is low
    if (stats.hitRate < 50) {
      console.warn('⚠️  Low cache hit rate detected!');
    }
    
    // Alert if memory usage is high
    if (stats.sizeKb > 1000) {
      console.warn('⚠️  High cache memory usage detected!');
    }
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

// Usage
const monitor = new CacheMonitor();

// Stop monitoring when shutting down
process.on('SIGINT', () => {
  monitor.stop();
  process.exit(0);
});
```

### Custom Metrics

```ts
import {cache} from 'ltcache';

const cacheInstance = cache();

class CacheMetrics {
  private cache = cacheInstance;
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0
  };
  
  async getWithMetrics<T>(key: string, fn?: () => Promise<T>, ttl?: number): Promise<T | undefined> {
    this.metrics.totalRequests++;
    
    try {
      const startTime = Date.now();
      const result = await this.cache.get(key, fn, ttl);
      const duration = Date.now() - startTime;
      
      // Determine if it was a hit or miss
      const stats = this.cache.report();
      if (stats.numItems > 0) {
        this.metrics.cacheHits++;
      } else {
        this.metrics.cacheMisses++;
      }
      
      console.log(`Cache operation: ${key} (${duration}ms)`);
      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache error for key ${key}:`, error);
      throw error;
    }
  }
  
  getMetrics() {
    const stats = this.cache.report();
    return {
      ...this.metrics,
      hitRate: stats.hitRate,
      memoryUsage: stats.sizeKb,
      items: stats.numItems
    };
  }
  
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0
    };
  }
}

// Usage
const metrics = new CacheMetrics();

// Use metrics wrapper
const data = await metrics.getWithMetrics('my-key', async () => {
  return await fetchExpensiveData();
}, 300);

// Check metrics
const currentMetrics = metrics.getMetrics();
console.log('Current metrics:', currentMetrics);
```

These examples demonstrate the versatility and power of ltcache for various use cases. The library's simple API makes it easy to integrate into any Node.js application while providing powerful features like TTL, concurrent safety, and comprehensive statistics. 