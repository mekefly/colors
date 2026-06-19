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
} from "./layer/database";

export { FavoritesDocLive, createFavoritesDocService } from "./impl/FavoritesDocLive";
export { FavoritesDocTest } from "./test/FavoritesDocTest";
export { migrate } from "./impl/database-migration";
export type { MigrationContext } from "./impl/database-migration";

export * as FavoritesService from "./services/favorites";
export type {
  GradientStop,
  HexColor,
  LinearGradient,
} from "./services/favorites";
