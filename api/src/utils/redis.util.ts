import Redis from "ioredis";
import { ENV } from "../config/env";
/**
 * Redis connection configuration options passed to BullMQ
 */
export const redisConnectionOptions = {
    host: ENV.REDIS_HOST,
    port: ENV.REDIS_PORT,
};

export const redisClient = new Redis(redisConnectionOptions);
