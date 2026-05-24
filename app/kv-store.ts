import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface JsonStore<T> {
  read(): Promise<T>;
  write(value: T): Promise<void>;
  update(mutator: (current: T) => T | Promise<T>): Promise<T>;
}

export function createKvStore<T>(key: string, fallback: T): JsonStore<T> {
  async function readRaw(): Promise<T> {
    const value = await redis.get<T>(key);
    return value ?? fallback;
  }

  async function writeRaw(value: T): Promise<void> {
    await redis.set(key, value);
  }

  return {
    read: readRaw,
    write: writeRaw,
    update: async (mutator) => {
      const current = await readRaw();
      const next = await mutator(current);
      await writeRaw(next);
      return next;
    },
  };
}
