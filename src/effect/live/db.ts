/**
 * Effect 数据库层 — 真实实现
 *
 * 包装 zToolsApi.db 的同步操作为 Effect。
 * 精确区分 WriteConflict（409）、WriteError（其他写入失败）与 DatabaseError。
 */
import { Effect, Layer, pipe } from "effect";
import zToolsApi from "../../utils/ztoolsapi";
import { DatabaseError, DocumentNotFound, WriteConflict, WriteError } from "../errors";
import { Database } from "../tag/db";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function toDatabaseError(error: unknown): DatabaseError {
  return new DatabaseError({
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

/**
 * 执行同步写操作，验证 DbReturn 并通过 Effect 错误通道传播错误。
 *
 * zToolsApi 返回格式：
 *   成功 → { ok: true, id, rev }
 *   冲突 → { error: true, name: "conflict", message: "Document update conflict" }
 *   其他 → { error: true, name: "...", message: "..." }
 */
function writeOp<R>(
  docId: string,
  fn: () => DbReturn,
): Effect.Effect<DbReturn, DatabaseError | WriteConflict | WriteError, never> {
  return pipe(
    tryRunDatabaseOp(fn),
    Effect.flatMap((result) => dbReturnToEffect(docId, result)),
  );
}

function dbReturnToEffect(
  docId: string,
  result: DbReturn,
): Effect.Effect<DbReturn, DatabaseError | WriteConflict | WriteError, never> {
  if (result?.ok === true) return Effect.succeed(result);
  if (result?.error === true && result?.name === "conflict") {
    return Effect.fail(new WriteConflict({ docId, message: result.message ?? "文档版本冲突" }));
  }
  return Effect.fail(
    new WriteError({
      docId,
      message:
        (result?.name ? result?.name + ":" : "") + (result?.message ?? JSON.stringify(result)),
      cause: result,
    }),
  );
}

/**
 * 执行同步读操作（get），null 映射为 DocumentNotFound。
 */
function readOp<T>(
  id: string,
  fn: () => T | null,
): Effect.Effect<T, DatabaseError | DocumentNotFound, never> {
  return pipe(
    tryRunDatabaseOp(fn),
    Effect.flatMap((val) =>
      val == null ? Effect.fail(new DocumentNotFound({ docId: id })) : Effect.succeed(val),
    ),
  );
}

/** 执行同步读操作，允许 null 返回值 */
function tryRunDatabaseOp<T>(fn: () => T): Effect.Effect<T, DatabaseError, never> {
  return Effect.try({ try: fn, catch: toDatabaseError });
}

// ── Live Layer ──

const databaseService = Database.of({
  put: (doc: DbDoc) => writeOp(doc._id, () => zToolsApi.db.put(clone(doc))),

  get: <T extends {} = Record<string, any>>(id: string) =>
    readOp(id, () => zToolsApi.db.get<T>(id)),

  remove: (doc: string | DbDoc) => {
    const docId = typeof doc === "string" ? doc : doc._id;
    return writeOp(docId, () => zToolsApi.db.remove(doc));
  },

  bulkDocs: (docs: DbDoc[]) =>
    Effect.all(docs.map((doc) => writeOp(doc._id, () => zToolsApi.db.put(clone(doc))))),

  allDocs: <T extends {} = Record<string, any>>(key?: string) =>
    Effect.try({ try: () => zToolsApi.db.allDocs<T>(key) ?? [], catch: toDatabaseError }),

  postAttachment: (docId: string, attachment: Uint8Array, type: string) =>
    writeOp(docId, () => zToolsApi.db.postAttachment(docId, attachment, type)),

  getAttachment: (docId: string) => readOp(docId, () => zToolsApi.db.getAttachment(docId)),

  getAttachmentType: (docId: string) =>
    tryRunDatabaseOp(() => zToolsApi.db.getAttachmentType(docId)),

  replicateStateFromCloud: () => tryRunDatabaseOp(() => zToolsApi.db.replicateStateFromCloud()),
});

export const DatabaseLive = Layer.succeed(Database, databaseService);
