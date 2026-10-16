import { getCloudflareContext } from "@opennextjs/cloudflare";

export interface R2ObjectLike {
  body: ReadableStream;
  httpEtag?: string;
  text(): Promise<string>;
  writeHttpMetadata?(headers: Headers): void;
}

export interface R2BucketLike {
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
}

export function getContentBucket(): R2BucketLike | null {
  try {
    const env = getCloudflareContext().env as unknown as {
      MATERIALS_BUCKET?: R2BucketLike;
    };
    return env.MATERIALS_BUCKET ?? null;
  } catch {
    return null;
  }
}
