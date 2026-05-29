import { NextRequest, NextResponse } from "next/server";
import { readMaterials, updateMaterials } from "../../materials-store";
import type { AdminEntry } from "../../material-types";
import { requireAuth } from "../auth-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await readMaterials();
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  try {
    const payload = (await request.json()) as Omit<AdminEntry, "id" | "date">;
    const entry: AdminEntry = {
      ...payload,
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
    };
    await updateMaterials((entries) => [entry, ...entries]);
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/materials]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const payload = (await request.json()) as AdminEntry;
  if (!payload.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await updateMaterials((entries) =>
    entries.map((entry) => (entry.id === payload.id ? payload : entry)),
  );
  return NextResponse.json(payload);
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await updateMaterials((entries) => entries.filter((entry) => entry.id !== id));
  return NextResponse.json({ ok: true });
}
