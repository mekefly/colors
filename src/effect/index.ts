/**
 * Effect Doc 层 — 统一导出
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

export {
  FavoritesDoc,
  type DocService,
  type ColorFavorite,
  type EffectDbDoc,
  type MigrationPatch,
} from "./tag";

export {
  MigrationService,
  type MigrationInfo,
  type MigrationResult,
  type ValidationResult,
} from "./tag/migration";
export { Database } from "./tag/db";

export { DatabaseLive } from "./live/db";

export * as FavoritesService from "./server/favorites";
export type { GradientStop, HexColor, LinearGradient } from "./tag";

export * from "./api";
export type {
  MigrationSummary,
  MigrateAllResult,
  DocMigrationInfo,
  DocMigrationStatus,
} from "./server/migration";
