/**
 * API 迁移层 — 唯一职责：读取 builders + 提供 DatabaseLive 层
 *
 * 使用示例：
 *   import { Effect } from "effect"
 *   import { MigrationApi } from "../effect"
 *
 *   const summary = await Effect.runPromise(MigrationApi.checkAll())
 *   await Effect.runPromise(MigrationApi.migrateAll())
 *   await Effect.runPromise(MigrationApi.runMigration(builder))
 */
import { Effect } from "effect";
import { DatabaseLive } from "../live/db";
import { DocServiceBuilderDeclarative } from "../live/docs";
import {
  checkAllMigrations,
  migrateAll as _migrateAll,
  migrateDoc,
  type MigrationSummary,
  type MigrateAllResult,
} from "../server/migration";

const Deps = DatabaseLive;
const Builders = Object.values(DocServiceBuilderDeclarative);

/** 查所有数据库迁移状态（页面进入时调用） */
export function checkAll(): Effect.Effect<MigrationSummary, never> {
  return checkAllMigrations(Builders).pipe(Effect.provide(Deps));
}

/** 迁移所有数据库（用户点击一键迁移时调用） */
export function migrateAll(): Effect.Effect<MigrateAllResult, never> {
  return _migrateAll(Builders).pipe(Effect.provide(Deps));
}

/** 迁移单个数据库（用户点击单个迁移按钮时调用） */
export function runMigration(
  builder: (typeof DocServiceBuilderDeclarative)[keyof typeof DocServiceBuilderDeclarative],
): Effect.Effect<void, any> {
  return migrateDoc(
    builder.id,
    builder.targetVersion,
    builder.initialData,
    builder.patches,
  ).pipe(Effect.provide(Deps));
}
