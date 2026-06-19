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

//当前版本的数据库类型
export interface ColorFavorite extends ColorFavorite1 {}
export interface FavoritesDocData extends FavoritesDocData1 {}

// ── 类型重新导出 ──

export interface GradientStop {
  color: string;
  position?: number;
}

export interface HexColor {
  type: "hex";
  hex: string;
}

export interface LinearGradient {
  type: "linear-gradient";
  direction: string;
  stops: GradientStop[];
}

export interface ColorFavorite1 {
  id: string;
  color: HexColor | LinearGradient;
  tags: string[];
  createdAt: number;
}

export interface FavoritesDocData1 {
  data: ColorFavorite1[];
}

// ── 收藏 Doc ──
export interface ColorFavorite0 {
  id: string;
  /**
   * hex颜色值
   */
  color: string;
  tags: string[];
  createdAt: number;
}

/** 收藏文档数据结构 */
export interface FavoritesDocData0 {
  data: ColorFavorite0[];
}
