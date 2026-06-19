import { Context } from "effect";
import type { DocService } from "..";

/**
 * 收藏 Doc Tag
 *
 *   const db = yield* FavoritesDoc   // DocService<FavoritesDocData>
 *   const doc = yield* db.getDoc()   // EffectDbDoc<FavoritesDocData>
 */
export class FavoritesDoc extends Context.Tag("FavoritesDoc")<
  FavoritesDoc,
  DocService<FavoritesDocData>
>() {}

// ── 收藏 Doc ──

export interface ColorFavorite1 {
  id: string;
  color:
    | { type: "hex"; hex: string }
    | {
        type: "linear-gradient";
        direction: string;
        stops: Array<{ color: string; position?: number }>;
      };
  tags: string[];
  createdAt: number;
}
export interface ColorFavorite {
  id: string;
  /**
   * hex颜色值
   */
  color: string;
  tags: string[];
  createdAt: number;
}

/** 收藏文档数据结构 */
export interface FavoritesDocData {
  data: ColorFavorite1[];
}
