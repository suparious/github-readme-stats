// @ts-check

import { createClient } from "redis";
import { logger } from "./log.js";

/** @type {import('redis').RedisClientType | null} */
let client = null;

/** @type {boolean} */
let connectionAttempted = false;

/**
 * Get or create a Redis client connection.
 * Returns null if Redis is not configured or connection fails.
 *
 * @returns {Promise<import('redis').RedisClientType | null>}
 */
export async function getRedisClient() {
  // If no REDIS_HOST configured, skip Redis
  if (!process.env.REDIS_HOST) {
    return null;
  }

  // If we already have a connected client, return it
  if (client && client.isOpen) {
    return client;
  }

  // If we already tried and failed, don't retry
  if (connectionAttempted && !client) {
    return null;
  }

  connectionAttempted = true;

  try {
    const redisUrl = `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
    client = createClient({ url: redisUrl });

    client.on("error", (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    await client.connect();
    logger.log(`Connected to Redis at ${process.env.REDIS_HOST}`);
    return client;
  } catch (err) {
    logger.error(`Failed to connect to Redis: ${err.message}`);
    client = null;
    return null;
  }
}

/**
 * Get a cached value from Redis.
 *
 * @param {string} key - The cache key
 * @returns {Promise<string | null>} - The cached value or null
 */
export async function getCached(key) {
  try {
    const redis = await getRedisClient();
    if (!redis) return null;
    return await redis.get(key);
  } catch (err) {
    logger.error(`Redis get error: ${err.message}`);
    return null;
  }
}

/**
 * Set a cached value in Redis with TTL.
 *
 * @param {string} key - The cache key
 * @param {string} value - The value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<void>}
 */
export async function setCached(key, value, ttlSeconds) {
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.setEx(key, ttlSeconds, value);
  } catch (err) {
    logger.error(`Redis set error: ${err.message}`);
  }
}

/**
 * Delete a cached value from Redis.
 *
 * @param {string} key - The cache key
 * @returns {Promise<void>}
 */
export async function deleteCached(key) {
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    await redis.del(key);
  } catch (err) {
    logger.error(`Redis delete error: ${err.message}`);
  }
}

/**
 * Check if Redis is connected and healthy.
 *
 * @returns {Promise<boolean>}
 */
export async function isRedisHealthy() {
  try {
    const redis = await getRedisClient();
    if (!redis) return false;
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Gracefully close the Redis connection.
 *
 * @returns {Promise<void>}
 */
export async function closeRedis() {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
    logger.log("Redis connection closed");
  }
}
