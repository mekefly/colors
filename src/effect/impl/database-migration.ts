/**
 * Effect 数据库层 — 迁移流水线（通用）
 *
 * 接受任意 { getDoc, saveDoc } 形状的服务，不绑定具体 tag。
 */

import { Effect, pipe } from "effect";
import {
  DatabaseCorrupted,
  DatabaseError,
  DowngradeRejected,
  MigrationInterrupted,
  PatchMissing,
  VersionMismatch,
  WriteConflict,
} from "../errors";

const FIELD_VERSION = "__version";

/** 通用迁移上下文 */
export interface MigrationContext<T extends Record<string, any>> {
  db: { getDoc: () => Effect.Effect<any, any>; saveDoc: (doc: any) => Effect.Effect<any, any> };
  fromVersion: number;
  toVersion: number;
}

type MigrationError =
  | DatabaseError
  | WriteConflict
  | VersionMismatch
  | MigrationInterrupted
  | DatabaseCorrupted
  | PatchMissing
  | DowngradeRejected;

function ensurePatchesComplete(
  docId: string,
  fromVersion: number,
  targetVersion: number,
  patches: Map<number, (ctx: MigrationContext<any>) => Effect.Effect<void, any>>,
): Effect.Effect<void, PatchMissing> {
  const missing: number[] = [];
  for (let v = fromVersion + 1; v <= targetVersion; v++) {
    if (!patches.has(v)) missing.push(v);
  }
  if (missing.length > 0) {
    return Effect.fail(new PatchMissing({ docId, versions: missing }));
  }
  return Effect.void;
}

/**
 * 执行数据库迁移
 *
 * @param docId       文档标识符
 * @param service     任意提供 getDoc/saveDoc 的服务
 * @param patches     版本补丁
 * @param initialData 初始数据
 * @param targetVersion 目标版本
 */
export function migrate<T extends Record<string, any>>(
  docId: string,
  service: { getDoc: () => Effect.Effect<any, any>; saveDoc: (doc: any) => Effect.Effect<any, any> },
  patches: Map<number, (ctx: MigrationContext<T>) => Effect.Effect<void, any>>,
  initialData: T,
  targetVersion: number,
): Effect.Effect<void, MigrationError> {
  const getStatus = (): Effect.Effect<string, DatabaseError> =>
    Effect.sync(() => {
      // 简化：通过 getDoc 是否返回默认文档判断
      // 实际状态检查应在 service 层实现
      return "ok";
    });

  const handleStatus = (status: string): Effect.Effect<void, MigrationError> => {
    switch (status) {
      case "ok":
        return Effect.void;
      case "interrupted":
        return Effect.fail(new MigrationInterrupted({ docId }));
      case "corrupted":
        return Effect.fail(new DatabaseCorrupted({ docId }));
      case "needs_migration":
        return pipe(
          Effect.forEach(
            Array.from({ length: targetVersion }, (_, i) => i + 1),
            (v) =>
              pipe(
                Effect.sync(() => patches.get(v)),
                Effect.flatMap((handler) => {
                  if (!handler) {
                    return Effect.fail(new PatchMissing({ docId, versions: [v] }));
                  }
                  return handler({ db: service, fromVersion: v - 1, toVersion: v });
                }),
              ),
            { concurrency: 1, discard: true },
          ),
        );
      default:
        return Effect.void;
    }
  };

  return pipe(getStatus(), Effect.flatMap(handleStatus));
}
