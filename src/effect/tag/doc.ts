/**
 * Effect Doc 层 — 服务接口 + Tag
 *
 * 命名规范：
 *   Tag  = FavoritesDoc（Context.Tag class）
 *   Data = FavoritesDocData（文档数据结构）
 *   Live = FavoritesDocLive
 *   Test = FavoritesDocTest
 */
import { Context, Effect } from "effect";
import type { DatabaseMigrationStatus } from "../../utils/database";
import {
  DatabaseError,
  DocumentNotFound,
  PatchMissing,
  WriteConflict,
  type WriteError,
} from "../errors";

// ── 全局类型 ──
export type EffectDbDoc<T extends {} = Record<string, any>> = DbDoc<T>;

// ── Doc 服务接口（通用） ──
export interface DocService<T extends {} = Record<string, any>> {
  readonly docId: string;
  getVersion: () => Effect.Effect<number, DatabaseError>;
  getDoc: () => Effect.Effect<EffectDbDoc<T>, DatabaseError | DocumentNotFound>;
  saveDoc: (
    doc: EffectDbDoc<T>,
  ) => Effect.Effect<DbReturn, DatabaseError | WriteConflict | WriteError>;
  updateDoc: (
    handler: (
      doc: EffectDbDoc<T>,
    ) => Effect.Effect<EffectDbDoc<T>, DatabaseError | WriteConflict | WriteError>,
  ) => Effect.Effect<DbReturn, DatabaseError | WriteConflict | WriteError>;
}

// ── 迁移补丁 ──
export interface MigrationPatch<T extends Record<string, any>> {
  version: number;
  handler: (ctx: {
    db: {
      getDoc: () => Effect.Effect<EffectDbDoc<T>, DatabaseError | DocumentNotFound>;
      saveDoc: (doc: EffectDbDoc<T>) => Effect.Effect<DbReturn, DatabaseError | WriteConflict>;
    };
    fromVersion: number;
    toVersion: number;
  }) => Effect.Effect<void, DatabaseError | PatchMissing>;
}
