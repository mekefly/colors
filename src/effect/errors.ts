/**
 * Effect 数据库层 — 类型化错误定义
 *
 * 所有数据库操作的错误都通过 Error 类型传播，
 * 调用方可以 catchAll / catchTag 精确处理每种错误。
 */

import { Data } from "effect";

/** 数据库操作的通用错误基类 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** 文档不存在 */
export class DocumentNotFound extends Data.TaggedError("DocumentNotFound")<{
  readonly docId: string;
}> {}

/** 写入冲突（CouchDB 409） */
export class WriteConflict extends Data.TaggedError("WriteConflict")<{
  readonly docId: string;
  readonly message: string;
}> {}
/** 写入错误 未知错误 */
export class WriteError extends Data.TaggedError("WriteError")<{
  readonly docId: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** 版本不匹配，需要迁移 */
export class VersionMismatch extends Data.TaggedError("VersionMismatch")<{
  readonly docId: string;
  readonly current: number;
  readonly target: number;
}> {}

/** 迁移被中断（存在锁标记） */
export class MigrationInterrupted extends Data.TaggedError("MigrationInterrupted")<{
  readonly docId: string;
}> {}

/** 数据库损坏（锁存在但备份丢失） */
export class DatabaseCorrupted extends Data.TaggedError("DatabaseCorrupted")<{
  readonly docId: string;
}> {}

/** 迁移补丁缺失 */
export class PatchMissing extends Data.TaggedError("PatchMissing")<{
  readonly docId: string;
  readonly versions: number[];
}> {}

/** 软件降级（目标版本 < 当前版本） */
export class DowngradeRejected extends Data.TaggedError("DowngradeRejected")<{
  readonly docId: string;
  readonly current: number;
  readonly target: number;
}> {}
