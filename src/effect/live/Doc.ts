/**
 * Effect 数据库层 — 真实实现
 *
 * 包装 zToolsApi.db 的同步操作为 Effect。
 * 保留原 database.ts 的内部字段逻辑（__version/__backup/__locked）。
 */

import type { Tag } from "effect/Context";
import { Effect, Layer, type Context } from "effect";
import type { DatabaseMigrationStatus } from "../../utils/database";
import type { DocService } from "../tag/doc";
import type { DocServiceBuilderDeclarative } from "./docs";
import { FavoritesDoc } from "..";
import zToolsApi from "../../utils/ztoolsapi";
import { VersionMismatch, WriteConflict } from "../errors";

// ── 内部字段常量（与 database.ts 保持一致） ──

const FIELD_VERSION = "__version";
const FIELD_BACKUP = "__backup";
const FIELD_LOCKED = "__locked";
const INTERNAL_FIELDS = [FIELD_VERSION, FIELD_BACKUP, FIELD_LOCKED] as const;

// ── 工具函数 ──

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stripInternalFields<T extends {}>(doc: T): DbDoc<T> {
  const result = { ...doc } as any;
  for (const field of INTERNAL_FIELDS) {
    delete result[field];
  }
  return result;
}

// ── 底层 CouchDB 操作（同步，包装为 Effect） ──

function loadDocument<T extends {} = Record<string, any>>(
  docId: string,
): (DbDoc<T> & Record<string, any>) | null {
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
): DbDoc<T> & { [FIELD_VERSION]: number } {
  return { _id: id, [FIELD_VERSION]: version, ...clone(initialData) } as any;
}

// ── 服务创建工厂 ──

/**
 * 创建真实数据库服务实例
 * @param docId     CouchDB 文档 _id
 * @param initialData 首次使用时的初始数据
 * @param targetVersion 目标版本号
 */
export function createDocService<T extends Record<string, any>>(
  {
    id,
    initialData,
    targetVersion,
  }: Pick<DocServiceBuilderDeclarative<T>, "id" | "initialData" | "targetVersion">,
  disableVerify: boolean = false,
): Effect.Effect<DocService<T>, VersionMismatch, never> {
  return Effect.gen(function* () {
    // 创建时校验版本：已存在文档的版本必须匹配 targetVersion
    const existing = loadDocument(id);
    if (!disableVerify && existing) {
      const currentVersion = (existing[FIELD_VERSION] as number) ?? 0;
      if (currentVersion !== targetVersion) {
        return yield* Effect.fail(
          new VersionMismatch({ docId: id, current: currentVersion, target: targetVersion }),
        );
      }
    }

    // 版本匹配或新文档，返回服务实例
    return {
      docId: id,

      getVersion: () =>
        Effect.sync(() => {
          const doc = loadDocument(id);
          return (doc?.[FIELD_VERSION] as number) ?? 0;
        }),

      getDoc: () =>
        Effect.sync(() => {
          const existing = loadDocument<T>(id);
          if (existing) {
            return stripInternalFields(existing);
          }
          return createDefaultDocument(id, initialData, targetVersion);
        }),

      saveDoc: (doc) =>
        Effect.try({
          try: () => {
            const existing = loadDocument(id);
            const merged = {
              ...existing,
              ...clone(doc),
              _id: id,
              _rev: existing?._rev,
              [FIELD_VERSION]: existing?.[FIELD_VERSION] ?? targetVersion,
            } as DbDoc;
            return saveDocumentRaw(merged);
          },
          catch: (error) =>
            new WriteConflict({
              docId: id,
              message: error instanceof Error ? error.message : String(error),
            }),
        }),

      updateDoc: (handler) =>
        Effect.gen(function* () {
          const doc = yield* Effect.sync(() => {
            const existing = loadDocument<T>(id);
            return existing
              ? stripInternalFields(existing)
              : createDefaultDocument(id, initialData, targetVersion);
          });
          const nextDoc = yield* handler(clone(doc));
          const existing = yield* Effect.sync(() => loadDocument(id));
          const merged = {
            ...existing,
            ...clone(nextDoc),
            _id: id,
            _rev: existing?._rev,
            [FIELD_VERSION]: existing?.[FIELD_VERSION] ?? targetVersion,
          } as DbDoc;
          return yield* Effect.try({
            try: () => saveDocumentRaw(merged),
            catch: (error) =>
              new WriteConflict({
                docId: id,
                message: error instanceof Error ? error.message : String(error),
              }),
          });
        }),

      checkStatus: () =>
        Effect.sync(() => {
          const doc = loadDocument(id);
          if (!doc) {
            return { status: "new" } as DatabaseMigrationStatus;
          }
          const locked = (doc[FIELD_LOCKED] as boolean) ?? false;
          if (locked) {
            if (doc[FIELD_BACKUP]) {
              return { status: "interrupted" } as DatabaseMigrationStatus;
            }
            return { status: "corrupted" } as DatabaseMigrationStatus;
          }
          const currentVersion = (doc[FIELD_VERSION] as number) ?? 0;
          if (currentVersion === targetVersion) {
            return { status: "ok" } as DatabaseMigrationStatus;
          }
          return { status: "needs_migration" } as DatabaseMigrationStatus;
        }),

      getVersionInfo: () =>
        Effect.sync(() => {
          const doc = loadDocument(id);
          const currentVersion = (doc?.[FIELD_VERSION] as number) ?? 0;
          return { currentVersion, targetVersion };
        }),
    };
  });
}

/**
 *
 * @param o 构建参数
 * @param disableVerify 禁用版本校验，版本需迁移时提前构建层
 * @returns
 */
export function createDocServiceLive<
  O extends DocServiceBuilderDeclarative<T, any>,
  T extends Record<string, any>,
>(
  o: O,
  disableVerify: boolean = false,
): ReturnType<typeof createDocService> extends Effect.Effect<any, infer E, infer R>
  ? Layer.Layer<O["tag"], E, R>
  : never {
  return Layer.effect(o.tag, createDocService(o, disableVerify));
}
