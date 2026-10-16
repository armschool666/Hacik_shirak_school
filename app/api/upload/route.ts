import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "../auth-check";
import { getContentBucket } from "../../cloudflare-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".txt",
  ".csv",
  ".zip",
];

// Magic bytes per extension — guards against renamed malicious files
function hasValidMagicBytes(ext: string, buf: Buffer): boolean {
  switch (ext) {
    case ".pdf":
      return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
    case ".jpg":
    case ".jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case ".png":
      return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    case ".gif":
      return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
    case ".webp":
      return (
        buf[0] === 0x52 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x46 &&
        buf[8] === 0x57 &&
        buf[9] === 0x45 &&
        buf[10] === 0x42 &&
        buf[11] === 0x50
      );
    case ".zip":
    case ".docx":
    case ".xlsx":
    case ".pptx":
      // Modern Office formats are ZIP archives
      return buf[0] === 0x50 && buf[1] === 0x4b;
    case ".doc":
    case ".xls":
    case ".ppt":
      // Old Office formats (Compound Document)
      return buf[0] === 0xd0 && buf[1] === 0xcf;
    case ".txt":
    case ".csv":
      // Plain text — no fixed magic bytes, any content is acceptable
      return true;
    default:
      return false;
  }
}

function safeFileName(value: string) {
  const extension = path.extname(value);
  const base = path
    .basename(value, extension)
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/-+/g, "-");
  return `${base || "file"}-${Date.now()}${extension}`;
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const uploadedFile = file as File;
  const fileName = uploadedFile.name ?? "unknown";
  const fileSize = uploadedFile.size ?? 0;

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await uploadedFile.arrayBuffer());

  if (!hasValidMagicBytes(ext, buffer)) {
    return NextResponse.json(
      { error: "File content does not match its extension" },
      { status: 400 },
    );
  }

  const safeFile = safeFileName(fileName);
  const bucket = getContentBucket();
  if (bucket) {
    const objectKey = `uploads/${safeFile}`;
    await bucket.put(objectKey, buffer, {
      httpMetadata: { contentType: uploadedFile.type || "application/octet-stream" },
    });
    return NextResponse.json({
      name: fileName,
      href: `/api/files/${objectKey}`,
      size: fileSize,
    });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${safeFile}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: uploadedFile.type || "application/octet-stream",
    });
    return NextResponse.json({ name: fileName, href: blob.url, size: fileSize });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, safeFile), buffer);
  return NextResponse.json({ name: fileName, href: `/uploads/${safeFile}`, size: fileSize });
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const bucket = getContentBucket();
  if (bucket) {
    const pathname = new URL(url, request.url).pathname;
    const routePrefix = "/api/files/";
    if (!pathname.startsWith(`${routePrefix}uploads/`)) {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
    const objectKey = decodeURIComponent(pathname.slice(routePrefix.length));
    if (objectKey.includes("..")) {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
    await bucket.delete(objectKey);
    return NextResponse.json({ ok: true });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import("@vercel/blob");
    try {
      await del(url);
    } catch {
      // Already deleted or missing.
    }
    return NextResponse.json({ ok: true });
  }

  if (!url.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  const localFileName = path.basename(url);
  const filePath = path.join(process.cwd(), "public", "uploads", localFileName);
  try {
    await unlink(filePath);
  } catch {
    // File already gone.
  }
  return NextResponse.json({ ok: true });
}
