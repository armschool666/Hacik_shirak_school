import type { AdminEntry } from "./material-types";
import { createKvStore } from "./kv-store";
import { createJsonStore } from "./json-store";
import { getContentBucket } from "./cloudflare-r2";

// Keep the existing Blob key on Vercel; Cloudflare stores publications in R2.
const blobStore = createKvStore<AdminEntry[]>("materials", []);
const r2Store = createJsonStore<AdminEntry[]>("materials.json", []);
const getStore = () => (getContentBucket() ? r2Store : blobStore);

export const readMaterials = () => getStore().read();
export const writeMaterials = (entries: AdminEntry[]) => getStore().write(entries);
export const updateMaterials = (
  mutator: (entries: AdminEntry[]) => AdminEntry[] | Promise<AdminEntry[]>,
) => getStore().update(mutator);
