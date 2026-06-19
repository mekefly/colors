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
  type FavoritesDoc as FavoritesDocType,
  type ColorFavorite,
  type EffectDbDoc,
  type MigrationPatch,
} from "./layer/doc";

export {
  MigrationService,
  type MigrationInfo,
  type MigrationResult,
  type ValidationResult,
} from "./layer/migration";

export { MigrationServiceLive } from "./impl/migration-live";

export * as FavoritesService from "./services/favorites";
export type {
  GradientStop,
  HexColor,
  LinearGradient,
} from "./services/favorites";
