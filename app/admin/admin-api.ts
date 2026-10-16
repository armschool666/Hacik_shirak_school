import type { ImportedFile } from "../file-utils";
import type { AdminEntry, UploadFile } from "../material-types";

export async function fetchMaterials(): Promise<AdminEntry[]> {
  const response = await fetch("/api/materials");
  if (!response.ok) throw new Error("Failed to load materials");
  return (await response.json()) as AdminEntry[];
}

export async function uploadSingleFile(file: File): Promise<UploadFile> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  if (!response.ok) throw new Error(`Upload failed: ${file.name}`);
  return (await response.json()) as UploadFile;
}

export async function uploadFiles(files: FileList | null): Promise<UploadFile[]> {
  if (!files || files.length === 0) return [];
  const uploaded: UploadFile[] = [];
  for (const file of Array.from(files)) {
    const result = await uploadSingleFile(file);
    uploaded.push({ text: result.name ?? file.name, href: result.href });
  }
  return uploaded;
}

export async function deleteUploadedFile(href: string): Promise<void> {
  if (!href) return;
  await fetch(`/api/upload?url=${encodeURIComponent(href)}`, { method: "DELETE" });
}

export async function saveEntry(
  payload: Omit<AdminEntry, "id" | "date"> | AdminEntry,
  isEdit: boolean,
): Promise<AdminEntry> {
  const response = await fetch("/api/materials", {
    method: isEdit ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Save failed");
  return (await response.json()) as AdminEntry;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const response = await fetch(`/api/materials?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return response.ok;
}

export async function deleteEntryFiles(files: ImportedFile[]): Promise<void> {
  await Promise.all(files.map((file) => deleteUploadedFile(file.href)));
}

export async function logout(): Promise<void> {
  await fetch("/api/auth", { method: "DELETE" });
}
