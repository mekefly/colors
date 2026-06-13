/**
 * 数据库统一初始化
 *
 * useDatabases() 返回所有需要的数据和方法，无全局状态：
 *
 *   // setup 顶层调用
 *   const dbs = useDatabases();
 *
 *   onMounted(() => {
 *     if (dbs.needsAction) { ... }
 *     await dbs.migrate();
 *     dbs.build();
 *   });
 *
 * 约定：use* 函数内部顶层调用 useXxx()，
 * 只能在 Vue setup 第一层调用。
 * build() 不调用 use*，只是闭包引用 store，无需 use 前缀。
 */

import { type DatabaseMigrationStatus, type DatabaseBuilder } from "./database";
import { useDatabaseStore } from "./database-store";
import { createDB } from "./favorites";

/** 单个数据库的运行时状态 */
interface DatabaseEntry {
  name: string;
  builder: DatabaseBuilder<any>;
  status: DatabaseMigrationStatus;
  currentVersion: number;
  targetVersion: number;
}

interface DatabaseBuilders<T extends Record<string, any> = Record<string, any>> {
  name: string;
  builder: () => DatabaseBuilder<T>;
}

/** useDatabases() 返回值 */
export interface DatabaseManager {
  /** 所有数据库条目 */
  entries: DatabaseEntry[];
  /** 是否有数据库需要处理 */
  needsAction: boolean;
  /** 需要处理的数据库列表 */
  pending: DatabaseEntry[];
  /** 执行所有迁移 */
  migrate(): Promise<void>;
  /** 构建所有数据库 API 并注入到 useDatabaseStore */
  buildAndRegister(): void;
}

/**
 * 初始化所有数据库（use 函数）
 * 内部顶层调用 useDatabaseStore()，因此必须在 Vue setup 顶层调用
 */
export function useDatabaseManager(): DatabaseManager {
  // ── 顶层调用 Pinia store ──
  const store = useDatabaseStore();

  // ── 创建 builders ──
  const databaseBuilders: DatabaseBuilders<any>[] = [
    {
      name: "color-favorites",
      builder: createDB,
    },
    // 在这里添加更多数据库...
  ];

  let entries: DatabaseEntry[] = databaseBuilders.map((item) => {
    // ── 检查状态 + 获取版本号 ──
    let builder = item.builder();
    const info = builder.getVersionInfo();
    return {
      name: item.name,
      status: builder.checkStatus(),
      currentVersion: info.currentVersion,
      targetVersion: info.targetVersion,
      builder,
    };
  });

  // ── 构造返回值 ──
  const pending = entries.filter(
    (e) => e.status.status === "needs_migration" || e.status.status === "interrupted",
  );

  return {
    entries,
    needsAction: pending.length > 0,
    pending,

    async migrate() {
      for (const entry of entries) {
        await entry.builder.migrate();
      }
    },

    /** 构建并注册到 store（闭包引用 store，不调用 use*） */
    buildAndRegister() {
      for (const entry of entries) {
        const db = entry.builder.build();
        store.setDB(entry.name, db);
      }
    },
  };
}
