import Redis from "ioredis";
import {Sequelize} from "sequelize";
import {
    IRateLimiterOptions,
    RateLimiterAbstract,
    RateLimiterMemory,
    RateLimiterMySQL,
    RateLimiterRedis
} from "rate-limiter-flexible";

export class RateLimiterFactory {

    protected redis?: Redis;
    protected db: Sequelize;
    protected backend: ('memory' | 'db' | 'redis')

    protected limiters: Map<string, RateLimiterAbstract> = new Map();

    constructor(backend: ('memory' | 'db' | 'redis'), db: Sequelize, redis?: Redis) {
        this.backend = backend;
        this.db = db;
        this.redis = redis;
    }

    getLimiter = async (type, points: number, duration: number) => {
        const key = `${type}-${points}-${duration}`;
        let limiter = this.limiters.get(key);
        if (limiter !== undefined) {
            return limiter;
        }
        limiter = await this.createLimiter({points, duration, keyPrefix: key});
        this.limiters.set(key, limiter);
        return limiter;
    }

    protected createLimiter = async (opts: IRateLimiterOptions): Promise<RateLimiterAbstract> => {
        if (this.backend === 'memory') {
            return new RateLimiterMemory(opts);
        } else if (this.backend === 'redis') {
            if (this.redis === undefined) {
                throw new Error('Cannot use Redis as rate limiter backend because it is not configured.');
            }
            return new RateLimiterRedis({
                storeClient: this.redis,
                ...opts
            });
        } else if (this.backend === 'db') {
            const rateLimitReadyPromise = new Promise((resolve, reject) => {
                const limiter = new RateLimiterMySQL({
                    storeClient: this.db,
                    storeType: 'sequelize',
                    dbName: 'mtv',
                    ...opts,
                }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(limiter);
                    }
                });
                return limiter;
            });
            const limited = await rateLimitReadyPromise as RateLimiterMySQL;
            return limited;
        }
    }
}
