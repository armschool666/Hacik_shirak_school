import type { AdminEntry } from "./material-types";
import { createKvStore } from "./kv-store";

const store = createKvStore<AdminEntry[]>("materials", []);

export const readMaterials = () => store.read();
export const writeMaterials = (entries: AdminEntry[]) => store.write(entries);
export const updateMaterials = store.update;
