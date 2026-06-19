/**
 * Effect 数据库层 — 统一导出
 *
 * 按需导入：
 *   import { DatabaseTag, makeDatabaseLayer } from "./effect";
 *   import { createTestDatabaseLayer } from "./effect/test/database";
 */

export {
  DatabaseError,
  DocumentNotFound,
  WriteConflict,
  VersionMismatch,
  MigrationInterrupted,
  DatabaseCorrupted,
  PatchMissing,
  DowngradeRejected,
} from "./errors";

export { DatabaseTag } from "./layer/database";
export type { DatabaseService, MigrationPatch, EffectDbDoc } from "./layer/database";

export { createDatabaseService, makeDatabaseLayer } from "./impl/database";
export { migrate } from "./impl/database-migration";
export type { MigrationContext } from "./impl/database-migration";

// ── 业务服务 ──

export * as FavoritesService from "./services/favorites";
export type {
  GradientStop,
  HexColor,
  LinearGradient,
  ColorFavorite,
  FavoritesDoc,
} from "./services/favorites";
