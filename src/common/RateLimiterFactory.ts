import Redis from "ioredis";
import {Sequelize} from "sequelize";
import {
    IRateLimiterOptions,
    RateLimiterAbstract,
    RateLimiterMemory,
    RateLimiterMySQL,
    RateLimiterRedis
} from "rate-limiter-flexible";
import {MTVLogger} from "./logging.js";

export class RateLimiterFactory {

    protected redis?: Redis;
    protected db: Sequelize;
    protected backend: ('memory' | 'db' | 'redis')
    protected logger: MTVLogger;

    protected limiters: Map<string, RateLimiterAbstract> = new Map();

    constructor(backend: ('memory' | 'db' | 'redis'), db: Sequelize, logger: MTVLogger, redis?: Redis) {
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
            if(this.db.getDialect() !== 'mysql') {
                const limiterWarn = `'mariadb' is not supported by rate-limiter-flexible`;
                if(this.redis !== undefined) {
                    this.logger.warn(`${limiterWarn}, falling back to REDIS`);
                    return new RateLimiterRedis({
                        storeClient: this.redis,
                        ...opts
                    });
                } else {
                    this.logger.warn(`${limiterWarn}, falling back to MEMORY`);
                    return new RateLimiterMemory(opts);
                }
            }

            let limiter: RateLimiterMySQL;
            const rateLimitReadyPromise = new Promise((resolve, reject) => {
                limiter = new RateLimiterMySQL({
                    storeClient: this.db,
                    storeType: 'sequelize',
                    dbName: 'mtv',
                    // tableName: 'limiter',
                    // tableCreated: true,
                    ...opts,
                }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(limiter);
                    }
                });
            });
            await rateLimitReadyPromise;
            return limiter;
        }
    }
}
