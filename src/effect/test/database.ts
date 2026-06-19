/**
 * Effect 数据库层 — 测试 Mock 实现
 *
 * 用内存 Map 模拟 CouchDB，不依赖真实数据库。
 * 可以注入到任何需要 DatabaseTag 的 Effect 程序中。
 *
 * 使用方式：
 *   import { createTestDatabaseLayer, createTestDatabaseService } from "../test/database";
 *
 *   const testService = createTestDatabaseService<{ items: string[] }>({
 *     docId: "test-db",
 *     initialData: { items: [] },
 *     targetVersion: 1,
 *   });
 *
 *   const program = pipe(
 *     myEffect,
 *     Effect.provide(Layer.succeed(DatabaseTag, testService)),
 *   );
 */

import { Effect, Layer } from "effect";
import type { DatabaseMigrationStatus } from "../../utils/database";
import type { DatabaseService } from "../layer/database";
import { DatabaseTag } from "../layer/database";

// ── 内部字段 ──

const FIELD_VERSION = "__version";
const FIELD_LOCKED = "__locked";
const FIELD_BACKUP = "__backup";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stripInternalFields<T extends {}>(doc: T): DbDoc<T> {
  const result = { ...doc } as any;
  delete result[FIELD_VERSION];
  delete result[FIELD_LOCKED];
  delete result[FIELD_BACKUP];
  return result;
}

// ── 内存存储 ──

export interface TestDatabaseConfig<T extends Record<string, any>> {
  docId: string;
  initialData: T;
  targetVersion: number;
}

/**
 * 创建测试用数据库服务
 * 使用内存 Map 存储文档，完全不依赖 zToolsApi
 */
export function createTestDatabaseService<T extends Record<string, any>>(
  config: TestDatabaseConfig<T>,
): DatabaseService<T> {
  const store = new Map<string, any>();

  // 初始化文档
  store.set(config.docId, {
    _id: config.docId,
    [FIELD_VERSION]: 0,
    ...clone(config.initialData),
  });

  return {
    docId: config.docId,

    getVersion: () =>
      Effect.sync(() => {
        const doc = store.get(config.docId);
        return (doc?.[FIELD_VERSION] as number) ?? 0;
      }),

    getDoc: () =>
      Effect.sync(() => {
        const doc = store.get(config.docId);
        if (doc) {
          return stripInternalFields(doc);
        }
        return { _id: config.docId, ...clone(config.initialData) } as DbDoc<T>;
      }),

    saveDoc: (doc) =>
      Effect.sync(() => {
        const existing = store.get(config.docId);
        const merged = {
          ...existing,
          ...clone(doc),
          _id: config.docId,
          _rev: existing?._rev ?? "1-test",
          [FIELD_VERSION]: existing?.[FIELD_VERSION] ?? 0,
        };
        // 模拟 _rev 递增
        merged._rev = `${parseInt(existing?._rev ?? "0") + 1}-test`;
        store.set(config.docId, merged);
        return { ok: true, rev: merged._rev } as DbReturn;
      }),

    updateDoc: (handler) =>
      Effect.gen(function* () {
        const doc = store.get(config.docId);
        const userDoc = doc
          ? stripInternalFields(doc)
          : ({ _id: config.docId, ...clone(config.initialData) } as DbDoc<T>);
        const nextDoc = yield* handler(clone(userDoc));
        const existing = store.get(config.docId);
        const merged = {
          ...existing,
          ...clone(nextDoc),
          _id: config.docId,
          _rev: existing?._rev ?? "1-test",
          [FIELD_VERSION]: existing?.[FIELD_VERSION] ?? 0,
        };
        merged._rev = `${parseInt(existing?._rev ?? "0") + 1}-test`;
        store.set(config.docId, merged);
        return { ok: true, rev: merged._rev } as DbReturn;
      }),

    checkStatus: () =>
      Effect.sync(() => {
        const doc = store.get(config.docId);
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
        if (currentVersion === config.targetVersion) {
          return { status: "ok" } as DatabaseMigrationStatus;
        }
        return { status: "needs_migration" } as DatabaseMigrationStatus;
      }),

    getVersionInfo: () =>
      Effect.sync(() => {
        const doc = store.get(config.docId);
        const currentVersion = (doc?.[FIELD_VERSION] as number) ?? 0;
        return { currentVersion, targetVersion: config.targetVersion };
      }),
  };
}

/**
 * 创建测试用数据库 Layer
 * 通过 Effect.provide(testDatabaseLayer) 注入到测试程序中
 */
export function createTestDatabaseLayer<T extends Record<string, any>>(
  config: TestDatabaseConfig<T>,
) {
  return Layer.succeed(DatabaseTag, createTestDatabaseService(config));
}

/**
 * 运行一个 Effect 程序，使用测试数据库
 *
 * @example
 *   const result = await runWithTestDb(
 *     { docId: "test", initialData: { items: [] }, targetVersion: 1 },
 *     (db) => db.getDoc(),
 *   );
 *   expect(result.items).toEqual([]);
 */
export async function runWithTestDb<T extends Record<string, any>, R>(
  config: TestDatabaseConfig<T>,
  fn: (db: DatabaseService<T>) => Effect.Effect<R, any>,
): Promise<R> {
  const service = createTestDatabaseService(config);
  const program = fn(service);
  return Effect.runPromise(program);
}
