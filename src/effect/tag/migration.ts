/**
 * Effect Migration 层 — 服务接口 + Tag
 *
 * 迁移服务负责所有 doc 的版本迁移，对外暴露简单接口。
 */
import { Context, Effect } from "effect";
import type { DatabaseError } from "../errors";

/** 单个 doc 的迁移信息 */
export interface MigrationInfo {
  docId: string;
  currentVersion: number;
  targetVersion: number;
  missingPatches: number[];
}

/** 迁移结果 */
export interface MigrationResult {
  migrated: string[];
  skipped: string[];
  failed: Array<{ docId: string; error: unknown }>;
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  issues: Array<{ docId: string; issue: string }>;
}

/** 迁移服务 Tag */
export class MigrationService extends Context.Tag("MigrationService")<
  MigrationService,
  {
    /** 检查所有 doc 的迁移状态 */
    checkMigrations: () => Effect.Effect<MigrationInfo[], DatabaseError>;

    /** 验证迁移是否可行（补丁是否完整） */
    validateMigrations: () => Effect.Effect<ValidationResult, DatabaseError>;

    /** 执行所有 doc 的迁移 */
    migrateAll: () => Effect.Effect<MigrationResult, Error>;
  }
>() {}
