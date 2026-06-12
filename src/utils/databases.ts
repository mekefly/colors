/**
 * 数据库统一初始化
 *
 * 一个 initDatabases() 返回所有需要的数据和方法，无全局状态：
 *
 *   const dbs = await initDatabases();
 *   if (dbs.needsAction) { ... }
 *   await dbs.migrate();
 *   dbs.build();
 */

import { type DatabaseMigrationStatus, type DatabaseBuilder, type DatabaseApi } from "./database";
import { createDB, setDatabase as setFavoritesDb } from "./favorites";

/** 单个数据库的运行时状态 */
interface DatabaseEntry {
  name: string;
  builder: DatabaseBuilder<any>;
  status: DatabaseMigrationStatus;
  currentVersion: number;
  targetVersion: number;
  inject: (db: DatabaseApi<any>) => void;
}
interface DatabaseBuilders<T extends Record<string, any> = Record<string, any>> {
  name: string;
  builder: () => DatabaseBuilder<T>;
  inject: (db: DatabaseApi<T>) => void;
}

/** initDatabases() 返回值 */
export interface DatabaseManager {
  /** 所有数据库条目 */
  entries: DatabaseEntry[];
  /** 是否有数据库需要处理 */
  needsAction: boolean;
  /** 需要处理的数据库列表 */
  pending: DatabaseEntry[];
  /** 执行所有迁移 */
  migrate(): Promise<void>;
  /** 构建所有数据库 API 并注入到各模块 */
  build(): void;
}

/**
 * 初始化所有数据库
 * 返回 DatabaseManager，包含状态和方法，无全局依赖
 */
export function initDatabases(): DatabaseManager {
  // ── 创建 builders ──
  const databaseBuilders: DatabaseBuilders<any>[] = [
    {
      name: "color-favorites",
      builder: createDB,
      inject: setFavoritesDb,
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
      inject: item.inject,
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

    build() {
      for (const entry of entries) {
        const db = entry.builder.build();
        // 注入到对应模块
        entry.inject(db);
      }
    },
  };
}
