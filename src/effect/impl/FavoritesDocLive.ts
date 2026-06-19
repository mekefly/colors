/**
 * FavoritesDoc Live — 真实实现（包装 zToolsApi.db）
 */

import { Effect, Layer } from "effect";
import type { DatabaseMigrationStatus } from "../../utils/database";
import zToolsApi from "../../utils/ztoolsapi";
import { FavoritesDoc, type DocService, type EffectDbDoc, type FavoritesDocData } from "../layer/database";
import { WriteConflict } from "../errors";

const FIELD_VERSION = "__version";
const FIELD_BACKUP = "__backup";
const FIELD_LOCKED = "__locked";
const INTERNAL_FIELDS = [FIELD_VERSION, FIELD_BACKUP, FIELD_LOCKED] as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stripInternalFields<T extends {}>(doc: T): EffectDbDoc<T> {
  const result = { ...doc } as any;
  for (const field of INTERNAL_FIELDS) {
    delete result[field];
  }
  return result;
}

function loadDocument<T extends {} = Record<string, any>>(docId: string): (EffectDbDoc<T> & Record<string, any>) | null {
  return zToolsApi.db.get<T>(docId);
}

function saveDocumentRaw<T>(doc: T): DbReturn {
  const result = zToolsApi.db.put(clone(doc) as DbDoc);
  if (!result || result.error || ("ok" in result && !result.ok)) {
    throw new Error(`数据库写入失败: ${JSON.stringify(result)}`);
  }
  return result;
}

function createDefaultDocument<T extends {}>(
  id: string,
  initialData: T,
  version = 0,
): EffectDbDoc<T> & { [FIELD_VERSION]: number } {
  return { _id: id, [FIELD_VERSION]: version, ...clone(initialData) } as any;
}

const DOC_ID = "color-favorites";
const INITIAL_DATA: FavoritesDocData = { data: [] };
const TARGET_VERSION = 1;

function createService(): DocService<FavoritesDocData> {
  return {
    docId: DOC_ID,

    getVersion: () =>
      Effect.sync(() => {
        const doc = loadDocument(DOC_ID);
        return (doc?.[FIELD_VERSION] as number) ?? 0;
      }),

    getDoc: () =>
      Effect.sync(() => {
        const existing = loadDocument<FavoritesDocData>(DOC_ID);
        if (existing) return stripInternalFields(existing);
        return createDefaultDocument(DOC_ID, INITIAL_DATA);
      }),

    saveDoc: (doc) =>
      Effect.try({
        try: () => {
          const existing = loadDocument(DOC_ID);
          const merged = {
            ...existing,
            ...clone(doc),
            _id: DOC_ID,
            _rev: existing?._rev,
            [FIELD_VERSION]: existing?.[FIELD_VERSION] ?? 0,
          } as DbDoc;
          return saveDocumentRaw(merged);
        },
        catch: (error) =>
          new WriteConflict({
            docId: DOC_ID,
            message: error instanceof Error ? error.message : String(error),
          }),
      }),

    updateDoc: (handler) =>
      Effect.gen(function* () {
        const doc = yield* Effect.sync(() => {
          const existing = loadDocument<FavoritesDocData>(DOC_ID);
          return existing
            ? stripInternalFields(existing)
            : createDefaultDocument(DOC_ID, INITIAL_DATA);
        });
        const nextDoc = yield* handler(clone(doc));
        const existing = yield* Effect.sync(() => loadDocument(DOC_ID));
        const merged = {
          ...existing,
          ...clone(nextDoc),
          _id: DOC_ID,
          _rev: existing?._rev,
          [FIELD_VERSION]: existing?.[FIELD_VERSION] ?? 0,
        } as DbDoc;
        return yield* Effect.try({
          try: () => saveDocumentRaw(merged),
          catch: (error) =>
            new WriteConflict({
              docId: DOC_ID,
              message: error instanceof Error ? error.message : String(error),
            }),
        });
      }),

    checkStatus: () =>
      Effect.sync(() => {
        const doc = loadDocument(DOC_ID);
        if (!doc) return { status: "new" } as DatabaseMigrationStatus;
        const locked = (doc[FIELD_LOCKED] as boolean) ?? false;
        if (locked) {
          return doc[FIELD_BACKUP]
            ? ({ status: "interrupted" } as DatabaseMigrationStatus)
            : ({ status: "corrupted" } as DatabaseMigrationStatus);
        }
        const v = (doc[FIELD_VERSION] as number) ?? 0;
        return v === TARGET_VERSION
          ? ({ status: "ok" } as DatabaseMigrationStatus)
          : ({ status: "needs_migration" } as DatabaseMigrationStatus);
      }),

    getVersionInfo: () =>
      Effect.sync(() => {
        const doc = loadDocument(DOC_ID);
        return {
          currentVersion: (doc?.[FIELD_VERSION] as number) ?? 0,
          targetVersion: TARGET_VERSION,
        };
      }),
  };
}

/** 创建 FavoritesDoc 服务实例 */
export function createFavoritesDocService(): DocService<FavoritesDocData> {
  return createService();
}

/** FavoritesDoc Live Layer */
export const FavoritesDocLive = Layer.succeed(FavoritesDoc, createService());
