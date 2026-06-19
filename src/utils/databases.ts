/**
 * 数据库统一初始化
 *
 * useDatabaseManager() 返回所有需要的数据和方法，无全局状态：
 *
 *   // setup 顶层调用
 *   const dbs = useDatabaseManager();
 *
 *   onMounted(() => {
 *     if (dbs.needsAction) { ... }
 *     await dbs.migrate();
 *     dbs.buildAndRegister();
 *   });
 *
 * 约定：use* 函数内部顶层调用 useXxx()，
 * 只能在 Vue setup 第一层调用。
 * buildAndRegister() 不调用 use*，只是闭包引用 store，无需 use 前缀。
 *
 * 迁移使用 effect 层的 migrate 流水线。
 */

import { Effect } from "effect";
import { type DatabaseMigrationStatus, type DatabaseBuilder } from "./database";
import { useDatabaseStore } from "./database-store";
import { DBBuilder as favoritesDBBuilder } from "./favorites";
import { createDatabaseService, migrate as effectMigrate } from "../effect";
import type { MigrationPatch } from "../effect";

// ── 数据库注册表 ──

interface DatabaseRegistry {
  name: string;
  builder: () => DatabaseBuilder<any>;
  initialData: Record<string, any>;
}

/** 所有数据库的注册信息 */
const databaseRegistry: DatabaseRegistry[] = [
  {
    name: "color-favorites",
    builder: favoritesDBBuilder.builder,
    initialData: { data: [] },
  },
  // 在这里添加更多数据库...
];

/**
 * 获取所有数据库的名称列表
 */
export function databaseNames(): string[] {
  return databaseRegistry.map((r) => r.name);
}

/** 单个数据库的运行时状态 */
interface DatabaseEntry {
  name: string;
  builder: DatabaseBuilder<any>;
  status: DatabaseMigrationStatus;
  currentVersion: number;
  targetVersion: number;
}

export interface DatabaseBuilderEntry<T extends Record<string, any> = Record<string, any>> {
  name: string;
  builder: () => DatabaseBuilder<T>;
}

/** useDatabaseManager() 返回值 */
export interface DatabaseManager {
  /** 所有数据库条目 */
  entries: DatabaseEntry[];
  /** 是否有数据库需要处理 */
  needsAction: boolean;
  /** 需要处理的数据库列表 */
  pending: DatabaseEntry[];
  /** 执行所有迁移（使用 effect 迁移流水线） */
  migrate(): Promise<void>;
  /** 构建所有数据库 API 并注入到 useDatabaseStore */
  buildAndRegister(): void;
  /** 重新检测所有数据库状态（导入后调用） */
  refresh(): void;
}

/** 从 entries 中筛选需要处理的数据库 */
function buildPending(entries: DatabaseEntry[]): DatabaseEntry[] {
  return entries.filter(
    (e) => e.status.status === "needs_migration" || e.status.status === "interrupted",
  );
}

/**
 * 将原 builder 的迁移逻辑桥接为 effect MigrationPatch
 *
 * 由于 builder 内部的 patches Map 不暴露，
 * 我们直接用 builder.migrate() 作为 effect 操作的 fallback。
 * 对于需要 effect 测试的场景，可以直接构造 effect MigrationPatch。
 */
function createMigrationEffect(
  entry: DatabaseEntry,
): Effect.Effect<void, any> {
  const builder = entry.builder;
  const status = builder.checkStatus();

  // 新数据库或已迁移完成：无需操作
  if (status.status === "ok" || status.status === "new") {
    return Effect.void;
  }

  // 损坏：报错
  if (status.status === "corrupted") {
    return Effect.fail(
      new Error(`[database:${entry.name}] 数据库状态损坏：迁移锁存在但备份丢失`),
    );
  }

  // interrupted 或 needs_migration：委托给原 builder.migrate()
  // 保留原逻辑的全部行为（锁 + 备份 + 错误处理）
  return Effect.try({
    try: () => builder.migrate(),
    catch: (error) =>
      new Error(
        `[database:${entry.name}] 迁移失败: ${error instanceof Error ? error.message : String(error)}`,
      ),
  });
}

/**
 * 初始化所有数据库（use 函数）
 * 内部顶层调用 useDatabaseStore()，因此必须在 Vue setup 顶层调用
 */
export function useDatabaseManager(): DatabaseManager {
  // ── 顶层调用 Pinia store ──
  const store = useDatabaseStore();

  const entries: DatabaseEntry[] = databaseRegistry.map((item) => {
    const builder = item.builder();
    const info = builder.getVersionInfo();
    return {
      name: item.name,
      status: builder.checkStatus(),
      currentVersion: info.currentVersion,
      targetVersion: info.targetVersion,
      builder,
    };
  });

  let pending = buildPending(entries);

  return {
    entries,
    get needsAction() {
      return pending.length > 0;
    },
    get pending() {
      return pending;
    },
    async migrate() {
      for (const entry of entries) {
        const migrateEffect = createMigrationEffect(entry);
        await Effect.runPromise(migrateEffect);
      }
    },

    /** 构建并注册到 store（闭包引用 store，不调用 use*） */
    buildAndRegister() {
      for (const entry of entries) {
        const db = entry.builder.build();
        store.setDB(entry.name, db);
      }
    },

    /** 重新检测所有数据库状态，更新 pending 列表 */
    refresh() {
      for (const entry of entries) {
        const info = entry.builder.getVersionInfo();
        entry.status = entry.builder.checkStatus();
        entry.currentVersion = info.currentVersion;
        entry.targetVersion = info.targetVersion;
      }
      pending = buildPending(entries);
    },
  };
}
