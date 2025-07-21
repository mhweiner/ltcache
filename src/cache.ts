/* eslint-disable max-lines-per-function */
import {logger} from './logger';

export type Cache = {
    get: <T>(key: string, fn?: () => Promise<T>, lifetimeInSeconds?: number) => Promise<T>
    set: <T>(key: string, value: T, lifetimeInSeconds?: number) => void
    remove: (key: string | RegExp) => void
    reset: () => void
    report: () => Report
};

export type Report = {
    numItems: number
    hitRate: number
    sizeKb: number
};

export function cache(debug = false): Cache {

    const cache = new Map<string, any>();
    const clearTimeouts = new Map<string, NodeJS.Timeout>();
    const pendingGets = new Map<string, Promise<any>>();
    let hits = 0;
    let misses = 0;

    const set = <T>(key: string, value: T, lifetimeInSeconds?: number): void => {

        cache.set(key, value);
        debug && logger.debug(`set: ${key}`);

        if (clearTimeouts.has(key)) clearTimeout(clearTimeouts.get(key) as NodeJS.Timeout);

        if (lifetimeInSeconds && lifetimeInSeconds > 0) {

            clearTimeouts.set(key, setTimeout(() => {

                cache.delete(key);
                clearTimeouts.delete(key);

            }, lifetimeInSeconds * 1000));

        }

    };

    const get = async <T>(
        key: string,
        fn?: () => Promise<T>,
        lifetimeInSeconds?: number
    ): Promise<T> => {

        if (cache.has(key)) {

            hits++;
            debug && logger.debug(`hit: ${key}`);

            return cache.get(key) as T;

        }

        misses++;
        debug && logger.debug(`miss: ${key}`);

        if (typeof fn === 'function') {

            // Check if there's already a pending request for this key
            if (pendingGets.has(key)) {

                debug && logger.debug(`waiting for pending request: ${key}`);

                return pendingGets.get(key) as T;

            }

            // Create a new pending request
            const pendingPromise = (async (): Promise<T> => {

                try {

                    const value = await fn();

                    set(key, value, lifetimeInSeconds);

                    return value;

                } finally {

                    pendingGets.delete(key);

                }

            })();

            pendingGets.set(key, pendingPromise);

            return pendingPromise;

        }

        return cache.get(key) as T;

    };

    const remove = (key: string | RegExp): void => {

        if (key instanceof RegExp) {

            for (const [k] of cache) {

                if (key.test(k)) {

                    cache.delete(k);
                    pendingGets.delete(k);

                }

            }

        } else {

            cache.delete(key);
            pendingGets.delete(key);

        }

    };

    const reset = (): void => {

        cache.clear();
        pendingGets.clear();
        hits = 0;
        misses = 0;

    };

    const getSizeKb = (): number => {

        let totalSize = 0;

        for (const [key, value] of cache) {

            // Estimate size of key and value
            const keySize = new Blob([key]).size;
            const valueSize = new Blob([JSON.stringify(value)]).size;

            totalSize += keySize + valueSize;

        }

        return Math.round(totalSize / 1024);

    };

    const report = (): Report => {

        const totalRequests = hits + misses;
        const hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;

        return {
            numItems: cache.size,
            hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
            sizeKb: getSizeKb(),
        };

    };

    return {
        get,
        set,
        remove,
        reset,
        report,
    };

}
