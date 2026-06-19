/**
 * Effect 数据库层 — 真实实现
 *
 * 通过 Database tag 读写 CouchDB，不直接依赖 zToolsApi。
 * createDocServiceLive 注入 DatabaseLive 层。
 */

import { Effect, Layer } from "effect";

import type { DocService } from "../tag/doc";
import type { DocServiceBuilderDeclarative } from "./docs";
import { VersionMismatch, WriteConflict, type DatabaseError } from "../errors";
import { Database } from "../tag/db";
import { DatabaseLive } from "./db";

// ── 内部字段常量 ──

const FIELD_VERSION = "__version";

// ── 工具函数 ──

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stripInternalFields<T extends {}>(doc: T): DbDoc<T> {
  const result = { ...doc } as any;
  delete result[FIELD_VERSION];
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
 * 内部使用 Database tag 读写，不直接依赖 zToolsApi。
 */
export function createDocService<T extends Record<string, any>>({
  id,
  initialData,
  targetVersion,
}: Pick<DocServiceBuilderDeclarative<T>, "id" | "initialData" | "targetVersion">): Effect.Effect<
  DocService<T>,
  VersionMismatch | DatabaseError,
  Database
> {
  return Effect.gen(function* () {
    const db = yield* Database;

    const existing = yield* db
      .get(id)
      .pipe(Effect.catchTag("DocumentNotFound", () => Effect.succeed(null)));

    if (existing) {
      const currentVersion = (existing as any)[FIELD_VERSION] ?? 0;
      if (currentVersion !== targetVersion) {
        return yield* Effect.fail(
          new VersionMismatch({ docId: id, current: currentVersion, target: targetVersion }),
        );
      }
    }

    // 版本匹配或新文档，返回服务实例
    const server: DocService<T> = {
      docId: id,

      getVersion: () =>
        Effect.gen(function* () {
          const doc = yield* db
            .get(id)
            .pipe(Effect.catchTag("DocumentNotFound", () => Effect.succeed(null)));
          return (doc as any)?.[FIELD_VERSION] ?? 0;
        }),

      getDoc: () =>
        Effect.gen(function* () {
          const existing = yield* db
            .get<T>(id)
            .pipe(Effect.catchTag("DocumentNotFound", () => Effect.succeed(null)));
          if (existing) {
            return stripInternalFields(existing);
          }
          return createDefaultDocument(id, initialData, targetVersion);
        }),

      saveDoc: (doc) =>
        Effect.gen(function* () {
          const merged = {
            ...clone(doc),
            //遮盖
            _id: id,
            [FIELD_VERSION]: targetVersion,
          } as DbDoc;
          return yield* db.put(merged);
        }),

      updateDoc: (handler) =>
        Effect.gen(function* () {
          const existing = yield* db
            .get<T>(id)
            .pipe(Effect.catchTag("DocumentNotFound", () => Effect.succeed(null)));
          const doc = existing
            ? stripInternalFields(existing)
            : createDefaultDocument(id, initialData, targetVersion);
          const nextDoc = yield* handler(clone(doc));
          const merged = {
            ...nextDoc,
            _id: id,
            _rev: doc._rev,
            [FIELD_VERSION]: targetVersion,
          } as DbDoc;
          return yield* db.put(merged);
        }),
    };
    return server;
  });
}

/**
 * 创建 DocService Live Layer
 * 注入 DatabaseLive，调用方可直接使用，无需关心 Database 依赖。
 */
export function createDocServiceLive<
  O extends DocServiceBuilderDeclarative<T, any>,
  T extends Record<string, any>,
>(
  o: O,
): ReturnType<typeof createDocService> extends Effect.Effect<any, infer E, infer _R>
  ? Layer.Layer<O["tag"], E, never>
  : never {
  return Layer.effect(o.tag, createDocService(o).pipe(Effect.provide(DatabaseLive))) as any;
}
