import { BlobNotFoundError, head, put } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";

export interface JsonStore<T> {
  read(): Promise<T>;
  write(value: T): Promise<void>;
  update(mutator: (current: T) => T | Promise<T>): Promise<T>;
}

export function createKvStore<T>(filename: string, fallback: T): JsonStore<T> {
  const storeId = process.env.BLOB1_STORE_ID;
  const cacheTag = `blob-json:${filename}`;

  async function readRaw(): Promise<T> {
    try {
      const blob = await head(filename, { storeId });
      const url = new URL(blob.url);
      url.searchParams.set("v", blob.etag);
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to read ${filename}: ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (error) {
      if (error instanceof BlobNotFoundError) return fallback;
      throw error;
    }
  }

  const readCached = unstable_cache(readRaw, ["blob-json", filename], {
    tags: [cacheTag],
    revalidate: 86400,
  });

  async function writeRaw(value: T): Promise<void> {
    await put(filename, JSON.stringify(value), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      storeId,
    });
    revalidateTag(cacheTag, { expire: 0 });
  }

  return {
    read: readCached,
    write: writeRaw,
    update: async (mutator) => {
      const current = await readCached();
      const next = await mutator(current);
      await writeRaw(next);
      return next;
    },
  };
}
