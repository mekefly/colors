/**
 * 数据库统一初始化模块
 *
 * 所有数据库在此集中定义和管理。
 * 使用流程：
 *   1. checkAll() — 检查所有数据库是否需要迁移（只读，不执行迁移）
 *   2. initAll()  — 初始化所有数据库（执行迁移，完成后注入到各模块）
 *
 * UI 层建议流程：
 *   loading → checkAll() → 需要迁移? → migration 页面 → initAll() → ready
 *                           不需要?   → initAll() → ready
 */

import { createDatabase, type DatabaseMigrationInfo } from "./database";
import { createDB, setDatabase as setFavoritesDb } from "./favorites";

// ============================================================================
// 数据库定义
// 在这里集中注册所有数据库，每个数据库包含名称和创建函数
// ============================================================================

interface DatabaseDefinition {
  /** 数据库唯一标识 */
  name: string;
  /** 创建数据库 builder 的函数 */
  create: () => ReturnType<typeof createDatabase>;
  /** 初始化完成后，将数据库注入到对应模块 */
  inject: (db: any) => void;
}

const databases: DatabaseDefinition[] = [
  {
    name: "color-favorites",
    create: createDB,
    inject: setFavoritesDb,
  },
  // 在这里添加更多数据库...
  // {
  //   name: "settings",
  //   create: () => createDatabase<Settings>({ ... }),
  //   inject: setSettingsDb,
  // },
];

// ============================================================================
// 检查与初始化
// ============================================================================

/**
 * 检查所有数据库是否需要迁移
 * 只读取版本号，不执行任何迁移操作
 * @returns 所有数据库的迁移信息列表
 */
export function checkAll(): DatabaseMigrationInfo[] {
  return databases.map((db) => db.create().getMigrationInfo());
}

/**
 * 检查是否有任何数据库需要迁移
 * @returns true 表示至少有一个数据库需要迁移
 */
export function anyNeedsMigration(): boolean {
  return databases.some((db) => db.create().needsMigration());
}

/**
 * 初始化所有数据库
 * 按顺序执行每个数据库的 build()，执行必要的迁移
 * 完成后将数据库实例注入到各模块
 * 如果任何数据库初始化失败，会抛出异常
 */
export async function initAll(): Promise<void> {
  for (const db of databases) {
    const built = await db.create().build();
    db.inject(built);
  }
}

/**
 * 获取所有数据库名称
 */
export function getDatabaseNames(): string[] {
  return databases.map((db) => db.name);
}
