/** Database tag 的内存 Mock — 用于 migration 测试 */
import { Effect, Layer } from "effect";
import { Database } from "../tag/db";
import { DocumentNotFound } from "../errors";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const store = new Map<string, any>();

/** 预置文档（测试前调用） */
export function seedDoc(id: string, data: Record<string, any>) {
  store.set(id, { _id: id, _rev: "0-test", ...data });
}

/** 清空 store（afterEach 调用） */
export function clearStore() {
  store.clear();
}

const databaseService = Database.of({
  put: (doc) =>
    Effect.sync(() => {
      const existing = store.get(doc._id);
      const merged = {
        ...clone(doc),
        _rev: existing ? `${parseInt(existing._rev ?? "0") + 1}-test` : "1-test",
      };
      store.set(doc._id, merged);
      return { ok: true, rev: merged._rev } as DbReturn;
    }),

  get: (id) =>
    Effect.try({
      try: () => {
        const doc = store.get(id);
        if (!doc) throw new DocumentNotFound({ docId: id });
        return clone(doc);
      },
      catch: (e) => e,
    }) as any,

  remove: (doc) =>
    Effect.sync(() => {
      store.delete(typeof doc === "string" ? doc : doc._id);
    }),

  bulkDocs: (docs) =>
    Effect.all(
      docs.map((doc) =>
        Effect.sync(() => {
          store.set(doc._id, clone(doc));
          return { ok: true, rev: "1-test" } as DbReturn;
        }),
      ),
    ),

  allDocs: () => Effect.succeed([]),

  postAttachment: () => Effect.fail(new Error("not implemented") as any),
  getAttachment: () => Effect.fail(new DocumentNotFound({ docId: "" })),
  getAttachmentType: () => Effect.succeed(null),
  replicateStateFromCloud: () => Effect.succeed(null),
});

export const DatabaseTest = Layer.succeed(Database, databaseService);
