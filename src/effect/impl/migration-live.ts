/**
 * Effect Migration 层 — 真实实现
 *
 * 使用 Layer.effect 构建，内部自动创建所有 doc service，
 * 不对外暴露任何依赖关系（Avoiding Requirement Leakage）。
 */
import { Effect, Layer, pipe } from "effect";
import type { DocService } from "../layer";
import { MigrationService } from "../layer/migration";
import { createDocService } from "./Doc";
import { DocServiceBuilderDeclarative, type FavoritesDocData1 } from "./docs";

/** 获取所有 builder */
function getAllBuilders() {
  return Object.values(DocServiceBuilderDeclarative);
}

/** 迁移单个 doc */
function migrateDoc(
  docId: string,
  fromVersion: number,
  toVersion: number,
  patches: Record<number, (ctx: any) => Effect.Effect<any, any>>,
  service: any,
): Effect.Effect<void, Error> {
  if (fromVersion >= toVersion) {
    return Effect.void;
  }

  const versions = Array.from({ length: toVersion - fromVersion }, (_, i) => fromVersion + i + 1);

  return Effect.forEach(
    versions,
    (v) => {
      const patch = patches[v];
      if (!patch) {
        return Effect.fail(new Error(`[${docId}] 缺少补丁版本 ${v}`));
      }
      return pipe(
        service.getDoc(),
        Effect.flatMap((doc: any) =>
          pipe(
            patch({ doc, fromVersion: v - 1, toVersion: v }),
            Effect.flatMap((newDoc: any) => service.saveDoc(newDoc as any)),
          ),
        ),
        Effect.map((): void => {}),
      );
    },
    { concurrency: 1, discard: true },
  ) as Effect.Effect<void, never, never>;
}

/** MigrationService Live Layer — 内部创建所有 doc service，不泄露依赖 */
export const MigrationServiceLive: Layer.Layer<MigrationService, never, never> = Layer.effect(
  MigrationService,
  Effect.gen(function* () {
    // 内部创建所有 doc service，disableVerify=true 允许版本不匹配
    const docServices = new Map<
      string,
      { service: DocService<any>; builder: DocServiceBuilderDeclarative<any> }
    >();
    for (const builder of getAllBuilders()) {
      yield* pipe(
        createDocService(builder, true),
        Effect.catchTag(
          "VersionMismatch",
          (e): Effect.Effect<DocService<FavoritesDocData1>, never, never> => {
            // 不应该发生的情况
            throw new Error(`不应该发生的情况，代码有错误`, { cause: e });
          },
        ),
        Effect.andThen((service) => docServices.set(builder.id, { service, builder })),
      );
    }

    return {
      checkMigrations: () =>
        pipe(
          Effect.forEach(
            Array.from(docServices.entries()),
            ([docId, entry]) =>
              pipe(
                entry.service.getVersion(),
                Effect.map((currentVersion: number) => ({
                  docId,
                  currentVersion,
                  targetVersion: entry.builder.targetVersion,
                  missingPatches: [] as number[],
                })),
              ),
            { concurrency: 1 },
          ),
        ),

      validateMigrations: () =>
        pipe(
          Effect.forEach(
            Array.from(docServices.entries()),
            ([, entry]) =>
              pipe(
                entry.service.getVersion(),
                Effect.map((currentVersion: number) => {
                  const missing: number[] = [];
                  for (let v = currentVersion + 1; v <= entry.builder.targetVersion; v++) {
                    if (!(v in entry.builder.patches)) {
                      missing.push(v);
                    }
                  }
                  return missing.length > 0
                    ? { docId: entry.builder.id, issue: `缺少补丁版本: ${missing.join(", ")}` }
                    : null;
                }),
              ),
            { concurrency: 1 },
          ),
          Effect.map((results) => {
            const issues = results.filter((r): r is { docId: string; issue: string } => r !== null);
            return { valid: issues.length === 0, issues };
          }),
        ),

      migrateAll: () =>
        pipe(
          Effect.forEach(
            getAllBuilders(),
            (builder) => {
              const entry = docServices.get(builder.id);
              if (!entry) {
                return Effect.succeed({
                  success: false as const,
                  docId: builder.id,
                  error: new Error("service not created"),
                });
              }
              return pipe(
                entry.service.getVersion(),
                Effect.flatMap((currentVersion: number) =>
                  migrateDoc(
                    builder.id,
                    currentVersion,
                    builder.targetVersion,
                    builder.patches,
                    entry.service,
                  ),
                ),
                Effect.map((): { success: true; docId: string } => ({
                  success: true as const,
                  docId: builder.id,
                })),
                Effect.catchAll((error: unknown) =>
                  Effect.succeed({
                    success: false as const,
                    docId: builder.id,
                    error,
                  } as const),
                ),
              );
            },
            { concurrency: 1 },
          ),
          Effect.map((results) => {
            const migrated: string[] = [];
            const failed: Array<{ docId: string; error: unknown }> = [];
            for (const r of results) {
              if (r.success) {
                migrated.push(r.docId);
              } else {
                failed.push({ docId: r.docId, error: r.error });
              }
            }
            return { migrated, skipped: [], failed };
          }),
        ),
    };
  }),
);
