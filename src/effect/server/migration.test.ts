import { describe, it, expect, afterEach } from "vitest";
import { Effect } from "effect";
import { Database } from "../tag/db";
import { DatabaseTest, seedDoc, clearStore } from "../test/DatabaseTest";
import {
  getDocMigrationInfo,
  checkAllMigrations,
  migrateDoc,
  migrateAll,
} from "./migration";

const FIELD_VERSION = "__version";

/** 运行 Effect，注入 DatabaseTest layer */
function run<A, R>(effect: Effect.Effect<A, any, R>): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(DatabaseTest)) as Effect.Effect<A, any, never>);
}

/** 通过 Effect.gen 获取 Database 服务实例来读取文档 */
function getDoc(id: string) {
  return run(
    Effect.gen(function* () {
      const db = yield* Database;
      return yield* db.get(id);
    }),
  );
}

/** 运行 Effect 并期望失败，检查错误消息包含指定文本 */
async function runFail(effect: Effect.Effect<any, any, any>): Promise<any> {
  try {
    await run(effect);
    throw new Error("Expected failure but got success");
  } catch (e: any) {
    // FiberFailure 的 message 格式: "DowngradeRejected: An error has occurred"
    // 直接用 message 判断
    return e;
  }
}

describe("getDocMigrationInfo", () => {
  afterEach(() => clearStore());

  it("新文档 — needs_migration", async () => {
    const info = await run(getDocMigrationInfo("test-doc", 1));
    expect(info.docId).toBe("test-doc");
    expect(info.currentVersion).toBe(0);
    expect(info.targetVersion).toBe(1);
    expect(info.status).toEqual({ type: "needs_migration" });
  });

  it("已最新 — ok", async () => {
    seedDoc("test-doc", { [FIELD_VERSION]: 2, data: "hello" });
    const info = await run(getDocMigrationInfo("test-doc", 2));
    expect(info.currentVersion).toBe(2);
    expect(info.status).toEqual({ type: "ok" });
  });

  it("版本低于目标 — needs_migration", async () => {
    seedDoc("test-doc", { [FIELD_VERSION]: 1, data: "hello" });
    const info = await run(getDocMigrationInfo("test-doc", 3));
    expect(info.currentVersion).toBe(1);
    expect(info.status).toEqual({ type: "needs_migration" });
  });
});

describe("checkAllMigrations", () => {
  afterEach(() => clearStore());

  it("多个 doc 状态汇总", async () => {
    seedDoc("doc-a", { [FIELD_VERSION]: 1 });
    const summary = await run(
      checkAllMigrations([
        { id: "doc-a", targetVersion: 1 },
        { id: "doc-b", targetVersion: 2 },
      ]),
    );
    expect(summary.infos).toHaveLength(2);
    expect(summary.infos[0]!.status).toEqual({ type: "ok" });
    expect(summary.infos[1]!.status).toEqual({ type: "needs_migration" });
    expect(summary.hasPending).toBe(true);
    expect(summary.failed).toHaveLength(0);
  });
});

describe("migrateDoc", () => {
  afterEach(() => clearStore());

  const patches = {
    1: (ctx: { doc: Record<string, any>; fromVersion: number; toVersion: number }) =>
      Effect.succeed({ ...ctx.doc, fieldAdded: "v1" }),
    2: (ctx: { doc: Record<string, any>; fromVersion: number; toVersion: number }) =>
      Effect.succeed({ ...ctx.doc, fieldUpgraded: "v2" }),
  };

  it("新文档 — 创建并设为 targetVersion", async () => {
    await run(migrateDoc("new-doc", 2, { initial: true }, patches));
    const doc = await getDoc("new-doc");
    expect(doc[FIELD_VERSION]).toBe(2);
    expect(doc.initial).toBe(true);
  });

  it("已最新 — 无操作", async () => {
    seedDoc("up-to-date", { [FIELD_VERSION]: 2, data: "keep" });
    await run(migrateDoc("up-to-date", 2, {}, patches));
    const doc = await getDoc("up-to-date");
    expect(doc.data).toBe("keep");
  });

  it("补丁按版本号依次执行", async () => {
    seedDoc("old-doc", { [FIELD_VERSION]: 0, data: "old" });
    await run(migrateDoc("old-doc", 2, {}, patches));
    const doc = await getDoc("old-doc");
    expect(doc[FIELD_VERSION]).toBe(2);
    expect(doc.fieldAdded).toBe("v1");
    expect(doc.fieldUpgraded).toBe("v2");
  });

  it("降级 — 报错 DowngradeRejected", async () => {
    seedDoc("higher-doc", { [FIELD_VERSION]: 3 });
    const err = await runFail(migrateDoc("higher-doc", 1, {}, patches));
    expect(err.name).toContain("DowngradeRejected");
  });

  it("补丁缺失 — 报错 PatchMissing", async () => {
    seedDoc("patch-missing", { [FIELD_VERSION]: 0 });
    const incompletePatches = { 1: patches[1] }; // 缺少 version 2
    const err = await runFail(migrateDoc("patch-missing", 2, {}, incompletePatches));
    expect(err.name).toContain("PatchMissing");
  });
});

describe("migrateAll", () => {
  afterEach(() => clearStore());

  const patches = {
    1: (ctx: { doc: Record<string, any> }) =>
      Effect.succeed({ ...ctx.doc, migrated: true }),
  };

  it("批量迁移 — 全部成功", async () => {
    const result = await run(
      migrateAll([
        { id: "a", targetVersion: 1, initialData: {}, patches },
        { id: "b", targetVersion: 1, initialData: {}, patches },
      ]),
    );
    expect(result.succeeded).toEqual(["a", "b"]);
    expect(result.failed).toHaveLength(0);
  });

  it("批量迁移 — 部分失败不影响其他", async () => {
    seedDoc("ok-doc", { [FIELD_VERSION]: 0 });
    const result = await run(
      migrateAll([
        { id: "ok-doc", targetVersion: 1, initialData: {}, patches },
        { id: "downgrade-doc", targetVersion: 0, initialData: {}, patches },
      ]),
    );
    expect(result.succeeded.length + result.failed.length).toBe(2);
  });
});
