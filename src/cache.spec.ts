/* eslint-disable max-lines-per-function */
import {test} from 'kizu';
import {cache} from './cache';
import {mock, stub} from 'cjs-mock';

test('cache returns undefined for missing key', async (assert) => {

    const result = await cache().get('not-there');

    assert.equal(result, undefined);

});

test('set and get value', async (assert) => {

    const c = cache();

    c.set('foo', 123);
    const result = await c.get<number>('foo');

    assert.equal(result, 123);

});

test('set and get with lifetime', async (assert) => {

    const c = cache();

    c.set('foo', 123, 5);
    const result = await c.get<number>('foo');

    assert.equal(result, 123);

});

test('remove deletes key', async (assert) => {

    const c = cache();

    c.set('foo', 123);
    c.remove('foo');
    const result = await c.get('foo');

    assert.equal(result, undefined);

});

test('remove with regex pattern', async (assert) => {

    const c = cache();

    c.set('user:123', 'alice');
    c.set('user:456', 'bob');
    c.set('config:theme', 'dark');
    c.remove(/^user:/);

    assert.equal(await c.get('user:123'), undefined);
    assert.equal(await c.get('user:456'), undefined);
    assert.equal(await c.get('config:theme'), 'dark');

});

test('reset removes all keys and resets stats', async (assert) => {

    const c = cache();

    c.set('a', 1);
    c.set('b', 2);
    await c.get('a'); // This should be a hit
    await c.get('c'); // This should be a miss

    c.reset();

    assert.equal(await c.get('a'), undefined);
    assert.equal(await c.get('b'), undefined);

    const report = c.report();

    assert.equal(report.numItems, 0);
    assert.equal(report.hitRate, 0);

});

test('get with function caches result', async (assert) => {

    const c = cache();
    let count = 0;

    const value = await c.get('foo', async () => {

        count++;
        return 'bar';

    });

    assert.equal(value, 'bar');
    assert.equal(count, 1);

    const second = await c.get('foo', async () => {

        count++;
        return 'should-not-run';

    });

    assert.equal(second, 'bar');
    assert.equal(count, 1);

});

test('get with function and lifetime', async (assert) => {

    const c = cache();
    let count = 0;

    const value = await c.get('foo', async () => {

        count++;
        return 'bar';

    }, 5);

    assert.equal(value, 'bar');
    assert.equal(count, 1);

    const second = await c.get('foo', async () => {

        count++;
        return 'should-not-run';

    });

    assert.equal(second, 'bar');
    assert.equal(count, 1);

});

test('expires after timeout', async (assert) => {

    const c = cache();

    c.set('expire', 666, 1); // 1 second
    assert.equal(await c.get('expire'), 666);

    await new Promise((r) => setTimeout(r, 1100));
    assert.equal(await c.get('expire'), undefined);

});

test('expires after timeout with function', async (assert) => {

    const c = cache();
    let count = 0;

    await c.get('expire', async () => {

        count++;
        return 666;

    }, 1); // 1 second

    assert.equal(await c.get('expire'), 666);
    assert.equal(count, 1);

    await new Promise((r) => setTimeout(r, 1100));
    assert.equal(await c.get('expire'), undefined);

    // Should call function again after expiration
    const result = await c.get('expire', async () => {

        count++;
        return 777;

    });

    assert.equal(result, 777);
    assert.equal(count, 2);

});

test('clearTimeout when setting new value', async (assert) => {

    const c = cache();

    c.set('key', 'value1', 1);

    // Set new value before expiration
    await new Promise((r) => setTimeout(r, 500));
    c.set('key', 'value2', 1);

    // Should still have value after original expiration time
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(await c.get('key'), 'value2');

});

test('report returns correct statistics', async (assert) => {

    const c = cache();

    // Initial state
    let report = c.report();

    assert.equal(report.numItems, 0);
    assert.equal(report.hitRate, 0);
    assert.equal(report.sizeKb, 0);

    // Add some items
    c.set('a', 'value1');
    c.set('b', 'value2');

    // Get some hits and misses
    await c.get('a'); // hit
    await c.get('b'); // hit
    await c.get('c'); // miss
    await c.get('d'); // miss

    report = c.report();
    assert.equal(report.numItems, 2);
    assert.equal(report.hitRate, 50); // 2 hits, 2 misses = 50%
    assert.isTrue(report.sizeKb >= 0);

});

test('report hit rate calculation', async (assert) => {

    const c = cache();

    // 3 hits, 1 miss = 75% hit rate
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);

    await c.get('a');
    await c.get('b');
    await c.get('c');
    await c.get('d'); // miss

    const report = c.report();

    assert.equal(report.hitRate, 75);

});

test('report size calculation', async (assert) => {

    const c = cache();

    // Add items with known sizes
    c.set('short', 'a');
    c.set('long', 'this is a longer string that should increase the size');

    const report = c.report();

    assert.isTrue(report.sizeKb >= 0);
    assert.isTrue(report.sizeKb < 10); // Should be small for these strings

});

test('handles different data types', async (assert) => {

    const c = cache();

    c.set('string', 'hello');
    c.set('number', 42);
    c.set('boolean', true);
    c.set('object', {name: 'test', value: 123});
    c.set('array', [1, 2, 3]);
    c.set('null', null);
    c.set('undefined', undefined);

    assert.equal(await c.get('string'), 'hello');
    assert.equal(await c.get('number'), 42);
    assert.equal(await c.get('boolean'), true);
    assert.equal(await c.get('object'), {name: 'test', value: 123});
    assert.equal(await c.get('array'), [1, 2, 3]);
    assert.equal(await c.get('null'), null);
    assert.equal(await c.get('undefined'), undefined);

});

test('handles async function that throws', async (assert) => {

    const c = cache();

    try {

        await c.get('error', async () => {

            throw new Error('test error');

        });
        assert.fail('should have thrown');

    } catch (error) {

        assert.equal((error as Error).message, 'test error');

    }

    // Should not cache the error
    assert.equal(await c.get('error'), undefined);

});

test('handles multiple concurrent gets for same key', async (assert) => {

    const c = cache();
    let callCount = 0;

    const promises = [
        c.get('concurrent', async () => {

            callCount++;
            await new Promise((r) => setTimeout(r, 100));
            return 'result';

        }),
        c.get('concurrent', async () => {

            callCount++;
            await new Promise((r) => setTimeout(r, 100));
            return 'result';

        }),
        c.get('concurrent', async () => {

            callCount++;
            await new Promise((r) => setTimeout(r, 100));
            return 'result';

        }),
    ];

    const results = await Promise.all(promises);

    assert.equal(results, ['result', 'result', 'result']);
    assert.equal(callCount, 1); // Function should only be called once

});

test('remove with regex clears timeouts', async (assert) => {

    const c = cache();

    c.set('user:123', 'alice', 10);
    c.set('user:456', 'bob', 10);
    c.set('config:theme', 'dark', 10);

    c.remove(/^user:/);

    // Wait a bit to ensure timeouts are cleared
    await new Promise((r) => setTimeout(r, 100));

    const report = c.report();

    assert.equal(report.numItems, 1); // Only config:theme should remain

});

test('edge cases', async (assert) => {

    const c = cache();

    // Empty string key
    c.set('', 'empty key');
    assert.equal(await c.get(''), 'empty key');

    // Special characters in key
    c.set('key-with-dashes', 'dash');
    c.set('key_with_underscores', 'underscore');
    c.set('key.with.dots', 'dots');
    c.set('key123', 'numbers');

    assert.equal(await c.get('key-with-dashes'), 'dash');
    assert.equal(await c.get('key_with_underscores'), 'underscore');
    assert.equal(await c.get('key.with.dots'), 'dots');
    assert.equal(await c.get('key123'), 'numbers');

});

test('report after reset', async (assert) => {

    const c = cache();

    c.set('a', 1);
    c.set('b', 2);
    await c.get('a');
    await c.get('c'); // miss

    c.reset();

    const report = c.report();

    assert.equal(report.numItems, 0);
    assert.equal(report.hitRate, 0);
    assert.equal(report.sizeKb, 0);

});

test('lifetime of 0 should not expire', async (assert) => {

    const c = cache();

    c.set('no-expire', 123, 0);

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(await c.get('no-expire'), 123);

});

test('negative lifetime should not expire', async (assert) => {

    const c = cache();

    c.set('no-expire', 123, -1);

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(await c.get('no-expire'), 123);

});

test('get without function returns undefined for missing key', async (assert) => {

    const c = cache();
    const result = await c.get('missing');

    assert.equal(result, undefined);

});

test('get with function but no lifetime', async (assert) => {

    const c = cache();
    let count = 0;

    const result = await c.get('test', async () => {

        count++;
        return 'value';

    });

    assert.equal(result, 'value');
    assert.equal(count, 1);

    // Should be cached indefinitely
    const cached = await c.get('test', async () => {

        count++;
        return 'should-not-run';

    });

    assert.equal(cached, 'value');
    assert.equal(count, 1);

});

test('debug mode logs cache operations', async (assert) => {

    const debugStub = stub();
    const mod = mock('./cache', {
        './logger': {
            logger: {debug: debugStub},
        },
    });

    const c = mod.cache(true); // Enable debug mode

    // Test get with debug logging
    await c.get('test-key', async () => 'test-value');

    // Test get hit with debug logging
    assert.equal(await c.get('test-key'), 'test-value');

    // Test get miss with debug logging
    assert.equal(await c.get('missing-key'), undefined);

    // check that the debug stub was called with the correct arguments
    assert.equal(debugStub.getCalls(), [
        ['miss: test-key'],
        ['set: test-key'],
        ['hit: test-key'],
        ['miss: missing-key'],
    ]);

});
