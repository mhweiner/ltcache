export const logger = {
    debug: (msg: string): void => console.log(`[ltcache] DEBUG ${msg}`),
    info: (msg: string): void => console.log(`[ltcache] INFO ${msg}`),
    warn: (msg: string): void => console.warn(`[ltcache] WARN ${msg}`),
    error: (msg: string): void => console.error(`[ltcache] ERROR ${msg}`),
};
