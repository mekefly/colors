/**
 * Effect 数据库层 — 迁移流水线
 *
 * 参数直接对齐 DocServiceBuilderDeclarative，返回 Layer 隐藏实现细节。
 */

import { Effect, Layer, pipe, type Context } from "effect";
import {
  DatabaseCorrupted,
  DatabaseError,
  MigrationInterrupted,
  PatchMissing,
  VersionMismatch,
} from "../errors";
import type { DocService } from "../layer/doc";
import type { DocServiceBuilderDeclarative } from "./docs";

type MigrationError =
  | DatabaseError
  | VersionMismatch
  | MigrationInterrupted
  | DatabaseCorrupted
  | PatchMissing;

/**
 * 创建迁移 Layer
 *
 * @param builder  文档服务声明（包含 id、initialData、targetVersion、patches）
 * @param service  已创建的 DocService 实例（用于读写文档）
 */
export function createMigrationLive<
  T extends Record<string, any>,
  Tag extends Context.Tag<any, DocService<T>>,
>(
  builder: DocServiceBuilderDeclarative<T, Tag>,
  service: DocService<T>,
): Layer.Layer<Tag, MigrationError, never> {
  const { id, patches, targetVersion } = builder;

  const migrateEffect: Effect.Effect<void, MigrationError> = pipe(
    service.getVersion(),
    Effect.catchAll(() => Effect.succeed(0)),
    Effect.flatMap((currentVersion) => {
      if (currentVersion >= targetVersion) {
        return Effect.void;
      }

      const versions = Array.from(
        { length: targetVersion - currentVersion },
        (_, i) => currentVersion + i + 1,
      );

      return Effect.forEach(
        versions,
        (v) => {
          const patch = patches[v];
          if (!patch) {
            return Effect.fail(
              new PatchMissing({ docId: id, versions: [v] }),
            );
          }
          return pipe(
            service.getDoc(),
            Effect.flatMap((doc) =>
              pipe(
                patch({ doc, fromVersion: v - 1, toVersion: v }),
                Effect.flatMap((newDoc) => service.saveDoc(newDoc as any)),
              ),
            ),
            Effect.catchAll(() => Effect.void),
          );
        },
        { concurrency: 1, discard: true },
      );
    }),
  );

  return Layer.effect(builder.tag, migrateEffect);
}
