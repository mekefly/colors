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
  updateDoc: <E>(
    handler: (
      doc: EffectDbDoc<T>,
    ) => Effect.Effect<EffectDbDoc<T>, DatabaseError | WriteConflict | WriteError | E>,
  ) => Effect.Effect<DbReturn, DatabaseError | WriteConflict | WriteError | E>;
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
