import { list, put } from "@vercel/blob";

export interface JsonStore<T> {
  read(): Promise<T>;
  write(value: T): Promise<void>;
  update(mutator: (current: T) => T | Promise<T>): Promise<T>;
}

export function createKvStore<T>(filename: string, fallback: T): JsonStore<T> {
  async function readRaw(): Promise<T> {
    try {
      const token = process.env.BLOB1_READ_WRITE_TOKEN;
      console.log(`[kv-store] reading "${filename}", token: ${token ? "ok" : "MISSING"}`);
      const { blobs } = await list({ prefix: filename, token });
      console.log(`[kv-store] blobs found: ${blobs.length}`, blobs.map((b) => b.pathname));
      const blob = blobs.find((b) => b.pathname === filename);
      if (!blob) {
        console.log(`[kv-store] "${filename}" not found in list, returning fallback`);
        return fallback;
      }
      console.log(`[kv-store] fetching: ${blob.url}`);
      const res = await fetch(blob.url, { cache: "no-store" });
      console.log(`[kv-store] fetch status: ${res.status}`);
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch (err) {
      console.error(`[kv-store] error reading "${filename}":`, err);
      return fallback;
    }
  }

  async function writeRaw(value: T): Promise<void> {
    await put(filename, JSON.stringify(value), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      storeId: process.env.BLOB1_STORE_ID,
      token: process.env.BLOB1_READ_WRITE_TOKEN,
    });
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
