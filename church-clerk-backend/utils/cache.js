import { getRedisClient } from "./redisClient.js";

export async function getCachedJson(key) {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCachedJson(key, value, ttlSeconds) {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, payload);
    } else {
      await client.set(key, payload);
    }
    return true;
  } catch {
    return false;
  }
}

export async function withCacheJson({ key, ttlSeconds = 60, getValue }) {
  const cached = await getCachedJson(key);
  if (cached !== null) return cached;
  const value = await getValue();
  await setCachedJson(key, value, ttlSeconds);
  return value;
}
