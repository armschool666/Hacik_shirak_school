import { getContentBucket } from "../../../cloudflare-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const bucket = getContentBucket();
  if (!bucket) return new Response("Not found", { status: 404 });

  const { path } = await params;
  const key = path.join("/");
  if (!key.startsWith("uploads/") || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
