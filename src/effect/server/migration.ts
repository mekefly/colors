/**
 * 服务器迁移层 — 通过 Database tag 直接操作 CouchDB
 *
 * 层级关系：API → Server → DB（Database tag）
 *
 * 迁移流程极简：
 *   1. 读取文档（最后一次 db.get）
 *   2. 在内存中按版本号依次执行所有补丁
 *   3. 一次性写入最终结果
 *
 * 不需要锁、不需要备份、不需要回滚：
 *   - 补丁是纯函数，只做数据变换，不写中间状态
 *   - 写入失败 → 数据不变，下次重试即可
 *   - 进程崩溃 → 数据不变，下次重试即可
 */
import { Effect } from "effect";
import type { MigrationFunction } from "../live/docs";
import {
  DatabaseError,
  DocumentNotFound,
  DowngradeRejected,
  PatchMissing,
  WriteConflict,
  WriteError,

} from "../errors";
import { Database } from "../tag/db";

// ── 内部字段常量 ──

const FIELD_VERSION = "__version";

// ── 类型定义 ──

/** 单个 doc 的迁移状态 */
export type DocMigrationStatus = { readonly type: "ok" } | { readonly type: "needs_migration" };
export type WithErrorDocMigrationStatus =
  | DocMigrationStatus
  | {
      readonly type: "error";
      cause: unknown;
      message: string;
    };

/** 单个 doc 的迁移信息（用于 UI 展示） */
export interface DocMigrationInfo {
  readonly docId: string;
  readonly currentVersion: number;
  readonly targetVersion: number;
  readonly status: DocMigrationStatus;
}
export interface DocMigrationInfoWithError {
  readonly docId: string;
  readonly currentVersion: number;
  readonly targetVersion: number;
  readonly status: WithErrorDocMigrationStatus;
}

/** 全部数据库迁移状态 */
export interface MigrationSummary {
  readonly infos: DocMigrationInfoWithError[];
  readonly failed: Array<DocMigrationInfoWithError>;
  //是否需要迁移，和处理数据库错误
  readonly hasPending: boolean;
}

// ── 工具函数 ──

/** 从文档中过滤内部字段，只保留用户数据 */
function stripInternalFields(doc: Record<string, any>): Record<string, any> {
  const result = { ...doc };
  delete result[FIELD_VERSION];
  delete result._id;
  delete result._rev;
  return result;
}

// ── 获取迁移状态 ──

/** 获取单个 doc 的迁移状态（只读） */
export function getDocMigrationInfo(
  docId: string,
  targetVersion: number,
): Effect.Effect<DocMigrationInfo, DatabaseError, Database> {
  return Effect.gen(function* () {
    const db = yield* Database;
    const docOption = yield* db
      .get(docId)
      .pipe(Effect.catchTag("DocumentNotFound", () => Effect.succeed(null)));

    if (docOption === null) {
      return { docId, currentVersion: 0, targetVersion, status: { type: "needs_migration" } };
    }

    const currentVersion = (docOption as any)[FIELD_VERSION] ?? 0;
    const status: DocMigrationStatus =
      currentVersion >= targetVersion ? { type: "ok" } : { type: "needs_migration" };

    return { docId, currentVersion, targetVersion, status };
  });
}

/** 获取所有数据库的迁移状态（容错：单个失败不影响整体） */
export function checkAllMigrations(
  builders: { id: string; targetVersion: number }[],
): Effect.Effect<MigrationSummary, never, Database> {
  return Effect.forEach(
    builders,
    (b) =>
      getDocMigrationInfo(b.id, b.targetVersion).pipe(
        Effect.catchTag("DatabaseError", (e) =>
          Effect.succeed({
            docId: b.id,
            currentVersion: 0,
            targetVersion: b.targetVersion,
            status: { type: "error", cause: e, message: "数据库错误" },
          } as const),
        ),
      ),
    { concurrency: 1 },
  ).pipe(
    Effect.map(
      (infos): MigrationSummary => ({
        infos,
        hasPending: infos.some(
          (i) => i.status.type === "needs_migration" || i.status.type === "error",
        ),
        failed: infos.filter((i) => i.status.type === "error"),
      }),
    ),
  );
}

// ── 迁移 ──

/** 迁移相关错误 */
export type MigrationError =
  | DatabaseError
  | DocumentNotFound
  | WriteConflict
  | WriteError
  | DowngradeRejected
  | PatchMissing;

/** 单个迁移结果 */
export type SingleMigrationResult =
  | { readonly ok: true; readonly docId: string }
  | { readonly ok: false; readonly docId: string; readonly error: unknown };

/** 全部迁移结果 */
export interface MigrateAllResult {
  readonly succeeded: string[];
  readonly failed: Array<{ docId: string; error: unknown }>;
}

/**
 * 执行迁移：读取→内存中跑完所有补丁→一次性写入
 *
 * 1. db.get 读取文档（最后一次 get）
 * 2. 在内存中按版本号依次执行补丁
 * 3. db.put 写入最终结果（一次性）
 *
 * 不需要锁、不需要备份、不需要回滚：
 *   - 补丁是纯函数，只做数据变换
 *   - 写入失败 → 数据不变，下次重试
 */
export function migrateDoc(
  docId: string,
  targetVersion: number,
  initialData: Record<string, any>,
  patches: Record<number, MigrationFunction<any>>,
): Effect.Effect<void, MigrationError, Database> {
  return Effect.gen(function* () {
    const db = yield* Database;

    // 1. 读取文档
    const docOption = yield* db
      .get(docId)
      .pipe(Effect.catchTag("DocumentNotFound", () => Effect.succeed(null)));

    // 2. 新文档 → 直接创建
    if (docOption === null) {
      yield* db.put({
        _id: docId,
        [FIELD_VERSION]: targetVersion,
        ...initialData,
      } as DbDoc);
      return;
    }

    const doc = docOption;
    const currentVersion = (doc as any)[FIELD_VERSION] ?? 0;

    // 3. 版本校验
    if (currentVersion === targetVersion) return;

    if (currentVersion > targetVersion) {
      return yield* Effect.fail(
        new DowngradeRejected({ docId, current: currentVersion, target: targetVersion }),
      );
    }

    // 4. 补丁完整性校验
    const missing: number[] = [];
    for (let v = currentVersion + 1; v <= targetVersion; v++) {
      if (!patches[v]) missing.push(v);
    }
    if (missing.length > 0) {
      return yield* Effect.fail(new PatchMissing({ docId, versions: missing }));
    }

    // 5. 内存中按版本号依次执行补丁
    let userData = stripInternalFields(doc);
    for (let v = currentVersion + 1; v <= targetVersion; v++) {
      const patch = patches[v]!;
      userData = yield* patch({ doc: userData, fromVersion: v - 1, toVersion: v });
    }

    // 6. 一次性写入最终结果
    yield* db.put({
      _id: docId,
      _rev: doc._rev,
      [FIELD_VERSION]: targetVersion,
      ...userData,
    } as DbDoc);
  });
}

// ── 批量迁移 ──

/** 迁移所有数据库（容错：单个失败不影响其他） */
export function migrateAll(
  builders: {
    id: string;
    targetVersion: number;
    initialData: Record<string, any>;
    patches: Record<number, MigrationFunction<any>>;
  }[],
): Effect.Effect<MigrateAllResult, never, Database> {
  return Effect.forEach(
    builders,
    (b) =>
      migrateDoc(b.id, b.targetVersion, b.initialData, b.patches).pipe(
        Effect.map((): SingleMigrationResult => ({ ok: true as const, docId: b.id })),
        Effect.catchAll(
          (error): Effect.Effect<SingleMigrationResult, never, never> =>
            Effect.succeed({ ok: false as const, docId: b.id, error }),
        ),
      ),
    { concurrency: 1 },
  ).pipe(
    Effect.map((results) => ({
      succeeded: results.filter((r) => r.ok).map((r) => r.docId),
      failed: results.filter((r) => !r.ok).map((r) => ({ docId: r.docId, error: r.error })),
    })),
  );
}
