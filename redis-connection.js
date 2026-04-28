import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();
function createRedisConnection() {
    const redis = new Redis(process.env.REDIS_CLI,{
        maxRetriesPerRequest: null, // important for pub/sub
        retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    redis.on("connect", () => {
        console.log("✅ Redis connected");
    });

    redis.on("error", (err) => {
        console.log("❌ Redis error:", err);
    });

    return redis;
}

const publisher = createRedisConnection();
const subscriber = createRedisConnection();
const redis = createRedisConnection()

export { publisher, subscriber, redis };




