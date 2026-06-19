import { Context, type Effect } from "effect";
import type { DatabaseError, DocumentNotFound, WriteConflict, WriteError } from "../errors";

export class Database extends Context.Tag("Database")<
  Database,
  {
    /**
     * 创建/更新文档
     */
    put(doc: DbDoc): Effect.Effect<DbReturn, DatabaseError | WriteConflict | WriteError>;
    /**
     * 获取文档
     */
    get<T extends {} = Record<string, any>>(
      id: string,
    ): Effect.Effect<DbDoc<T>, DatabaseError | DocumentNotFound>;
    /**
     * 删除文档
     */
    remove(doc: string | DbDoc): Effect.Effect<void, DatabaseError | WriteConflict | WriteError>;
    /**
     * 批量操作文档(新增、修改、删除)
     */
    bulkDocs(docs: DbDoc[]): Effect.Effect<DbReturn, DatabaseError | WriteConflict | WriteError>[];
    /**
     * 获取所有文档 可根据文档id前缀查找
     */
    allDocs<T extends {} = Record<string, any>>(
      key?: string,
    ): Effect.Effect<DbDoc<T>[], DatabaseError | DocumentNotFound>;
    /**
     * 存储附件到新文档
     * @param docId 文档ID
     * @param attachment 附件 buffer
     * @param type 附件类型，示例：image/png, text/plain
     */
    postAttachment(
      docId: string,
      attachment: Uint8Array,
      type: string,
    ): Effect.Effect<DbReturn, DatabaseError | WriteConflict | WriteError>;
    /**
     * 获取附件
     * @param docId 文档ID
     */
    getAttachment(docId: string): Effect.Effect<Uint8Array, DatabaseError | DocumentNotFound>;
    /**
     * 获取附件类型
     * @param docId 文档ID
     */
    getAttachmentType(docId: string): Effect.Effect<string | null, DatabaseError>;
    /**
     * 云端复制数据状态 (null: 未开启数据同步、0: 已完成复制、1：复制中)
     */
    replicateStateFromCloud(): Effect.Effect<null | 0 | 1, DatabaseError>;
  }
>() {}
