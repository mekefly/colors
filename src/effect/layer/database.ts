/**
 * Effect 数据库层 — 服务接口 + Layer 定义
 *
 * 定义数据库服务的接口和标识 Tag。
 * 所有方法返回 Effect，可以组合、重试、超时等。
 *
 * 使用方式：
 *   import { DatabaseTag } from "./layer/database";
 *   import { makeDatabaseLayer } from "../impl/database";
 *
 *   // 在应用入口
 *   const program = pipe(myProgram, Effect.provide(layer));
 *
 *   // 在测试中
 *   const program = pipe(myProgram, Effect.provide(testLayer));
 */

import { Context, Effect } from "effect";
import type { DatabaseMigrationStatus } from "../../utils/database";

// ── 全局类型（来自 @ztools-center/ztools-api-types） ──
// DbDoc<T> 和 DbReturn 是全局声明，无需导入

/** 数据库文档（带 _id/_rev） */
export type EffectDbDoc<T extends {} = Record<string, any>> = DbDoc<T>;

/** 迁移补丁定义 */
export interface MigrationPatch<T extends Record<string, any>> {
  version: number;
  handler: (ctx: {
    db: DatabaseService<T>;
    fromVersion: number;
    toVersion: number;
  }) => Effect.Effect<void, any>;
}

/** 数据库服务接口 */
export interface DatabaseService<T extends {} = Record<string, any>> {
  /** 文档标识符 */
  readonly docId: string;

  /** 获取当前版本号 */
  getVersion: () => Effect.Effect<number, any>;

  /** 获取用户数据文档（过滤内部字段 __*） */
  getDoc: () => Effect.Effect<EffectDbDoc<T>, any>;

  /** 保存用户数据文档（保留内部字段） */
  saveDoc: (doc: EffectDbDoc<T>) => Effect.Effect<DbReturn, any>;

  /** 读改写一步完成 */
  updateDoc: (
    handler: (doc: EffectDbDoc<T>) => Effect.Effect<EffectDbDoc<T>, any>,
  ) => Effect.Effect<DbReturn, any>;

  /** 检查数据库状态 */
  checkStatus: () => Effect.Effect<DatabaseMigrationStatus, any>;

  /** 获取版本信息 */
  getVersionInfo: () => Effect.Effect<
    { currentVersion: number; targetVersion: number },
    any
  >;
}

/** 服务标识 Tag */
export const DatabaseTag = Context.GenericTag<DatabaseService<any>>("Database");
