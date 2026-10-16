import { revalidateTag, unstable_cache } from "next/cache";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { getContentBucket } from "./cloudflare-r2";

export interface JsonStore<T> {
  read(): Promise<T>;
  write(value: T): Promise<void>;
  update(mutator: (current: T) => T | Promise<T>): Promise<T>;
}

const dataDir = path.join(process.cwd(), "data");
const locks = new Map<string, Promise<unknown>>();

function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  locks.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

async function atomicWrite(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(tmp, contents, "utf8");
  await rename(tmp, filePath);
}

function createFsStore<T>(fileName: string, fallback: T): JsonStore<T> {
  const filePath = path.join(dataDir, fileName);
  const readRaw = async (): Promise<T> => {
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as T;
    } catch {
      return fallback;
    }
  };
  const writeRaw = (value: T) => atomicWrite(filePath, JSON.stringify(value, null, 2));
  return {
    read: () => withLock(filePath, readRaw),
    write: (value) => withLock(filePath, () => writeRaw(value)),
    update: (mutator) =>
      withLock(filePath, async () => {
        const next = await mutator(await readRaw());
        await writeRaw(next);
        return next;
      }),
  };
}

function createR2Store<T>(fileName: string, fallback: T): JsonStore<T> {
  const objectKey = `data/${fileName}`;
  const lockKey = `r2:${objectKey}`;
  const readRaw = async (): Promise<T> => {
    const bucket = getContentBucket();
    if (!bucket) throw new Error("MATERIALS_BUCKET is not configured");
    const object = await bucket.get(objectKey);
    return object ? (JSON.parse(await object.text()) as T) : fallback;
  };
  const writeRaw = async (value: T): Promise<void> => {
    const bucket = getContentBucket();
    if (!bucket) throw new Error("MATERIALS_BUCKET is not configured");
    await bucket.put(objectKey, JSON.stringify(value, null, 2), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
  };
  return {
    read: () => withLock(lockKey, readRaw),
    write: (value) => withLock(lockKey, () => writeRaw(value)),
    update: (mutator) =>
      withLock(lockKey, async () => {
        const next = await mutator(await readRaw());
        await writeRaw(next);
        return next;
      }),
  };
}

function createBlobStore<T>(fileName: string, fallback: T): JsonStore<T> {
  const blobKey = `data/${fileName}`;
  const cacheTag = `blob-json:${blobKey}`;
  const readRaw = async (): Promise<T> => {
    const { BlobNotFoundError, head } = await import("@vercel/blob");
    try {
      const blob = await head(blobKey);
      const url = new URL(blob.url);
      url.searchParams.set("v", blob.etag);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to read ${blobKey}: ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof BlobNotFoundError) return fallback;
      throw error;
    }
  };
  const readCached = unstable_cache(readRaw, ["blob-json", blobKey], {
    tags: [cacheTag],
    revalidate: 86400,
  });
  const writeRaw = async (value: T): Promise<void> => {
    const { put } = await import("@vercel/blob");
    await put(blobKey, JSON.stringify(value, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    revalidateTag(cacheTag, { expire: 0 });
  };
  return {
    read: async () => {
      try {
        return await readCached();
      } catch (error) {
        console.error(`Failed to read ${blobKey}; using the local fallback.`, error);
        return fallback;
      }
    },
    write: writeRaw,
    update: async (mutator) => {
      const next = await mutator(await readRaw());
      await writeRaw(next);
      return next;
    },
  };
}

export function createJsonStore<T>(fileName: string, fallback: T): JsonStore<T> {
  const r2Store = createR2Store(fileName, fallback);
  const fallbackStore = process.env.BLOB_READ_WRITE_TOKEN
    ? createBlobStore(fileName, fallback)
    : createFsStore(fileName, fallback);
  const selectStore = () => (getContentBucket() ? r2Store : fallbackStore);
  return {
    read: () => selectStore().read(),
    write: (value) => selectStore().write(value),
    update: (mutator) => selectStore().update(mutator),
  };
}
