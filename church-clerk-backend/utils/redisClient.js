import { createClient } from "redis";

let clientPromise = null;

async function connectClient() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const client = createClient({ url });

  client.on("error", () => {
  });

  await client.connect();
  return client;
}

export async function getRedisClient() {
  if (clientPromise) return clientPromise;
  clientPromise = connectClient().catch(() => null);
  return clientPromise;
}
