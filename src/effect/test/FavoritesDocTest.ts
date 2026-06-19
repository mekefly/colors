/**
 * FavoritesDoc Test — 内存 Mock
 */

import { Effect, Layer } from "effect";
import { FavoritesDoc, type DocService, type EffectDbDoc, type FavoritesDocData } from "../tag";

const FIELD_VERSION = "__version";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stripInternalFields<T extends {}>(doc: T): EffectDbDoc<T> {
  const result = { ...doc } as any;
  delete result[FIELD_VERSION];
  return result;
}

function createService(): DocService<FavoritesDocData> {
  const docId = "color-favorites";
  const store = new Map<string, any>();

  store.set(docId, { _id: docId, [FIELD_VERSION]: 0, data: [] });

  return {
    docId,

    getVersion: () => Effect.sync(() => (store.get(docId)?.[FIELD_VERSION] as number) ?? 0),

    getDoc: () =>
      Effect.sync(() => {
        const doc = store.get(docId);
        if (doc) return stripInternalFields(doc);
        return { _id: docId, data: [] } as EffectDbDoc<FavoritesDocData>;
      }),

    saveDoc: (doc) =>
      Effect.sync(() => {
        const existing = store.get(docId);
        const merged = {
          ...existing,
          ...clone(doc),
          _id: docId,
          _rev: existing?._rev ?? "1-test",
          [FIELD_VERSION]: existing?.[FIELD_VERSION] ?? 0,
        };
        merged._rev = `${parseInt(existing?._rev ?? "0") + 1}-test`;
        store.set(docId, merged);
        return { ok: true, rev: merged._rev } as DbReturn;
      }),

    updateDoc: (handler) =>
      Effect.gen(function* () {
        const doc = store.get(docId);
        const userDoc = doc
          ? stripInternalFields(doc)
          : ({ _id: docId, data: [] } as EffectDbDoc<FavoritesDocData>);
        const nextDoc = yield* handler(clone(userDoc));
        const existing = store.get(docId);
        const merged = {
          ...existing,
          ...clone(nextDoc),
          _id: docId,
          _rev: existing?._rev ?? "1-test",
          [FIELD_VERSION]: existing?.[FIELD_VERSION] ?? 0,
        };
        merged._rev = `${parseInt(existing?._rev ?? "0") + 1}-test`;
        store.set(docId, merged);
        return { ok: true, rev: merged._rev } as DbReturn;
      }),
  };
}

/** FavoritesDoc Test Layer */
export const FavoritesDocTest = Layer.succeed(FavoritesDoc, createService());
