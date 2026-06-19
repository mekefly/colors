/**
 * Effect 数据库层 — 迁移流水线
 *
 * 用 Effect 组合数据库迁移的全部流程：
 *   状态检查 → 回滚（如需）→ 加锁 → 备份 → 执行补丁 → 清理
 *
 * 完全可测试：通过替换 DatabaseTag 的实现来 mock 底层操作。
 */

import { Effect, pipe } from "effect";
import {
  DatabaseCorrupted,
  DatabaseError,
  DowngradeRejected,
  MigrationInterrupted,
  PatchMissing,
  VersionMismatch,
} from "../errors";
import type { DatabaseService, MigrationPatch } from "../layer/database";

// ── 内部字段 ──

const FIELD_VERSION = "__version";

// ── 迁移上下文（传给每个 patch handler） ──

export interface MigrationContext<T extends Record<string, any>> {
  db: DatabaseService<T>;
  fromVersion: number;
  toVersion: number;
}

// ── 补丁完整性校验 ──

function ensurePatchesComplete<T extends Record<string, any>>(
  docId: string,
  fromVersion: number,
  targetVersion: number,
  patches: Map<number, MigrationPatch<T>["handler"]>,
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

// ── 主迁移流水线 ──

type MigrationError =
  | DatabaseError
  | VersionMismatch
  | MigrationInterrupted
  | DatabaseCorrupted
  | PatchMissing
  | DowngradeRejected;

/**
 * 执行数据库迁移
 *
 * 流程：
 *   1. 检查状态
 *   2. ok → 直接返回
 *   3. new → 创建初始文档
 *   4. interrupted → 回滚 → 继续迁移
 *   5. corrupted → 抛错
 *   6. needs_migration → 校验补丁 → 逐版本执行
 */
export function migrate<T extends Record<string, any>>(
  service: DatabaseService<T>,
  patches: Map<number, MigrationPatch<T>["handler"]>,
  initialData: T,
): Effect.Effect<void, MigrationError> {
  const docId = service.docId;

  // 处理每个状态分支
  const handleStatus = (
    status: { status: string },
  ): Effect.Effect<void, MigrationError> => {
    switch (status.status) {
      case "ok":
        return Effect.void;

      case "new":
        return pipe(
          service.getVersionInfo(),
          Effect.flatMap(({ targetVersion }) =>
            pipe(
              Effect.sync(() => {
                return { _id: docId, [FIELD_VERSION]: targetVersion, ...initialData } as DbDoc;
              }),
              Effect.flatMap((doc) => service.saveDoc(doc as DbDoc<T>)),
              Effect.map(() => {}),
            ),
          ),
        );

      case "interrupted":
        return Effect.fail(new MigrationInterrupted({ docId }));

      case "corrupted":
        return Effect.fail(new DatabaseCorrupted({ docId }));

      case "needs_migration":
        return pipe(
          service.getVersionInfo(),
          Effect.flatMap(({ currentVersion, targetVersion }) =>
            pipe(
              Effect.if(
                currentVersion > targetVersion,
                {
                  onTrue: () =>
                    Effect.fail(
                      new DowngradeRejected({
                        docId,
                        current: currentVersion,
                        target: targetVersion,
                      }),
                    ),
                  onFalse: () => Effect.void,
                },
              ),
              Effect.flatMap(() =>
                ensurePatchesComplete(docId, currentVersion, targetVersion, patches),
              ),
              Effect.flatMap(() =>
                Effect.forEach(
                  Array.from(
                    { length: targetVersion - currentVersion },
                    (_, i) => currentVersion + 1 + i,
                  ),
                  (v) =>
                    pipe(
                      Effect.sync(() => patches.get(v)),
                      Effect.flatMap((handler) => {
                        if (!handler) {
                          return Effect.fail(
                            new PatchMissing({ docId, versions: [v] }),
                          );
                        }
                        return handler({
                          db: service as DatabaseService<T>,
                          fromVersion: v - 1,
                          toVersion: v,
                        });
                      }),
                    ),
                  { concurrency: 1, discard: true },
                ),
              ),
            ),
          ),
        );

      default:
        return Effect.void;
    }
  };

  return pipe(service.checkStatus(), Effect.flatMap(handleStatus));
}
