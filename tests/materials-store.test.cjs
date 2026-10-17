const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

test("Cloudflare reads and saves materials through R2 without accessing Blob", async () => {
  const records = new Map();
  let cloudflare = true;
  let blobCalls = 0;
  const store = (key) => ({
    read: async () => records.get(key) ?? [],
    write: async (entries) => records.set(key, entries),
    update: async (mutator) => {
      const entries = await mutator(records.get(key) ?? []);
      records.set(key, entries);
      return entries;
    },
  });
  const legacy = store("legacy");
  const source = fs.readFileSync(path.join(__dirname, "../app/materials-store.ts"), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "./cloudflare-r2") return { getContentBucket: () => (cloudflare ? {} : null) };
      if (name === "./json-store")
        return {
          createJsonStore: (key) => {
            assert.equal(key, "materials.json");
            return store(key);
          },
        };
      if (name === "./kv-store")
        return {
          createKvStore: (key) => {
            assert.equal(key, "materials");
            return Object.fromEntries(
              Object.entries(legacy).map(([method, fn]) => [
                method,
                (...args) => {
                  blobCalls++;
                  return fn(...args);
                },
              ]),
            );
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  assert.deepEqual(await exports.readMaterials(), []);
  const first = { id: "one", title: "First" };
  await exports.updateMaterials((entries) => [first, ...entries]);
  assert.deepEqual(await exports.readMaterials(), [first]);
  await exports.updateMaterials((entries) => [{ id: "two" }, ...entries]);
  assert.equal((await exports.readMaterials()).length, 2);
  await exports.writeMaterials([first]);
  assert.deepEqual(records.get("materials.json"), [first]);
  assert.equal(blobCalls, 0);
  cloudflare = false;
  await exports.writeMaterials([{ id: "old-host" }]);
  assert.deepEqual(await exports.readMaterials(), [{ id: "old-host" }]);
  assert.equal(blobCalls, 2);
  assert.deepEqual(records.get("materials.json"), [first]);
});
