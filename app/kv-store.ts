import { list, put } from "@vercel/blob";

export interface JsonStore<T> {
  read(): Promise<T>;
  write(value: T): Promise<void>;
  update(mutator: (current: T) => T | Promise<T>): Promise<T>;
}

export function createKvStore<T>(filename: string, fallback: T): JsonStore<T> {
  async function readRaw(): Promise<T> {
    try {
      const { blobs } = await list({ prefix: filename });
      const blob = blobs.find((b) => b.pathname === filename);
      if (!blob) return fallback;
      const res = await fetch(blob.url, { cache: "no-store" });
      if (!res.ok) return fallback;
      return (await res.json()) as T;
    } catch {
      return fallback;
    }
  }

  async function writeRaw(value: T): Promise<void> {
    await put(filename, JSON.stringify(value), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
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
