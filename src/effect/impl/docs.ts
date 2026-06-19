import type { T } from "vue-router/dist/index-D_VEAp3P.js";
import { Effect, Layer, pipe, type Context } from "effect";
import type { DatabasePatch } from "../../utils/database";
import type {
  DatabaseCorrupted,
  DatabaseError,
  DowngradeRejected,
  MigrationInterrupted,
  WriteConflict,
} from "../errors";
import { FavoritesDoc, type ColorFavorite, type ColorFavorite1, type DocService } from "../layer";
import { createDocService, createDocServiceLive } from "./Doc";

export interface MigrationContext<T extends Record<string, any>> {
  doc: T;
  fromVersion: number;
  toVersion: number;
}

export type MigrationFunction<T extends Record<string, any>, F extends Record<string, any> = T> =
  //纯函数迁移
  (
    ctx: MigrationContext<any>,
  ) => Effect.Effect<
    T,
    | WriteConflict
    | DatabaseError
    | MigrationInterrupted
    | DatabaseCorrupted
    | DowngradeRejected
    | DatabaseError
  >;

/**
 * 文档服务构建器声明
 */
export interface DocServiceBuilderDeclarative<
  T extends Record<string, any> = Record<string, any>,
  Tag extends Context.Tag<any, any> = Context.Tag<any, any>,
> {
  id: string;
  initialData: T;
  targetVersion: number;
  tag: Tag;
  patches: Record<number, MigrationFunction<T>>;
}
/**
 * 生成DocServiceBuilderDeclarative工具函数
 * @param o
 * @returns
 */
function createDocServiceBuilderDeclarative<
  O extends Record<string, DocServiceBuilderDeclarative<Record<string, any>>>,
>(
  o: O,
): {
  [K in keyof O]: DocServiceBuilderDeclarative<O[K]["initialData"], O[K]["tag"]>;
} {
  return o as any;
}

/** 收藏文档数据结构 */
export interface FavoritesDocData1 {
  data: ColorFavorite1[];
}
export interface FavoritesDocData {
  data: ColorFavorite[];
}

/**
 * Doc 服务构建器实例（声明式定义文档服务的 ID、初始数据、目标版本和迁移补丁）
 *
 * 目前仅用于 FavoritesDoc，后续可扩展为其他文档服务。
 * 迁移补丁为纯函数，接受当前文档数据和版本信息，返回新的文档数据或抛出错误。
 */
export const DocServiceBuilderDeclarative = createDocServiceBuilderDeclarative({
  favorites: {
    id: "color-favorites",
    initialData: { data: [] } as FavoritesDocData1,
    targetVersion: 1,
    tag: FavoritesDoc,
    patches: {
      [1]: (ctx: MigrationContext<FavoritesDocData>) => {
        return Effect.succeed({
          data: ctx.doc.data.map((item) => ({ ...item, color: { type: "hex", hex: item.color } })),
        });
      },
    },
  },
});

export const FavoritesDocLive = createDocServiceLive(DocServiceBuilderDeclarative.favorites);
