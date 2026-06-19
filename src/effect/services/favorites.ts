/**
 * Effect 收藏服务 — 纯业务逻辑
 *
 * 所有收藏操作通过 Effect 组合，依赖 DatabaseTag 提供数据库能力。
 * 无 Vue/Pinia 依赖，可独立测试。
 */

import { Effect, pipe } from "effect";
import { DatabaseTag } from "../layer/database";

// ── 类型定义 ──

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

export interface ColorFavorite {
  id: string;
  color: HexColor | LinearGradient;
  tags: string[];
  createdAt: number;
}

export interface FavoritesDoc {
  data: ColorFavorite[];
}

// ── 颜色辅助函数 ──

export function colorToCSS(color: HexColor | LinearGradient): string {
  if (color.type === "hex") return color.hex;
  const stopsStr = color.stops
    .map((s: GradientStop) => (s.position != null ? `${s.color} ${s.position}%` : s.color))
    .join(", ");
  return `linear-gradient(${color.direction}, ${stopsStr})`;
}

export function colorToDisplay(color: HexColor | LinearGradient): string {
  if (color.type === "hex") return color.hex;
  return colorToCSS(color);
}

export function colorEquals(a: HexColor | LinearGradient, b: HexColor | LinearGradient): boolean {
  return colorToCSS(a) === colorToCSS(b);
}

function isDuplicate(favorites: ColorFavorite[], color: HexColor | LinearGradient): boolean {
  return favorites.some((f: ColorFavorite) => colorEquals(f.color, color));
}

// ── 业务操作 ──

/** 获取所有收藏 */
export function getAll() {
  return pipe(
    DatabaseTag,
    Effect.flatMap((db) => db.getDoc()),
    Effect.map((doc: any) => (doc.data ?? []) as ColorFavorite[]),
  );
}

/** 添加收藏 */
export function addFavorite(color: HexColor | LinearGradient, tags: string[] = []) {
  return pipe(
    DatabaseTag,
    Effect.flatMap((db) =>
      pipe(
        db.getDoc(),
        Effect.flatMap((doc: any) => {
          if (isDuplicate(doc.data ?? [], color)) {
            return Effect.fail(new Error("该颜色已在收藏中"));
          }
          const newFavorite: ColorFavorite = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2),
            color,
            tags,
            createdAt: Date.now(),
          };
          doc.data = [newFavorite, ...(doc.data ?? [])];
          return db.saveDoc(doc);
        }),
        Effect.map(() => {}),
      ),
    ),
  );
}

/** 按 ID 移除收藏 */
export function removeFavorite(id: string) {
  return pipe(
    DatabaseTag,
    Effect.flatMap((db) =>
      pipe(
        db.getDoc(),
        Effect.map((doc: any) => {
          doc.data = (doc.data ?? []).filter((f: ColorFavorite) => f.id !== id);
          return doc;
        }),
        Effect.flatMap((doc: any) => db.saveDoc(doc)),
        Effect.map(() => {}),
      ),
    ),
  );
}

/** 按颜色值移除收藏 */
export function removeColor(color: HexColor | LinearGradient) {
  return pipe(
    DatabaseTag,
    Effect.flatMap((db) =>
      pipe(
        db.getDoc(),
        Effect.map((doc: any) => {
          doc.data = (doc.data ?? []).filter(
            (f: ColorFavorite) => !colorEquals(f.color, color),
          );
          return doc;
        }),
        Effect.flatMap((doc: any) => db.saveDoc(doc)),
        Effect.map(() => {}),
      ),
    ),
  );
}

/** 按 ID 获取收藏 */
export function getById(id: string) {
  return pipe(
    DatabaseTag,
    Effect.flatMap((db) => db.getDoc()),
    Effect.map(
      (doc: any) => ((doc.data ?? []).find((f: ColorFavorite) => f.id === id) ?? null) as ColorFavorite | null,
    ),
  );
}

/** 按 ID 添加标签 */
export function addTag(id: string, tag: string) {
  return pipe(
    DatabaseTag,
    Effect.flatMap((db) =>
      pipe(
        db.getDoc(),
        Effect.flatMap((doc: any) => {
          const favorite = (doc.data ?? []).find((f: ColorFavorite) => f.id === id);
          if (!favorite) return Effect.fail(new Error("收藏不存在"));
          if (favorite.tags.includes(tag)) return Effect.fail(new Error("该标签已存在"));
          favorite.tags.push(tag);
          return db.saveDoc(doc);
        }),
        Effect.map(() => {}),
      ),
    ),
  );
}

/** 按颜色值添加标签 */
export function addTagByColor(color: HexColor | LinearGradient, tag: string) {
  return pipe(
    DatabaseTag,
    Effect.flatMap((db) =>
      pipe(
        db.getDoc(),
        Effect.flatMap((doc: any) => {
          const favorite = (doc.data ?? []).find(
            (f: ColorFavorite) => colorEquals(f.color, color),
          );
          if (!favorite) return Effect.fail(new Error("收藏不存在"));
          if (favorite.tags.includes(tag)) return Effect.fail(new Error("该标签已存在"));
          favorite.tags.push(tag);
          return db.saveDoc(doc);
        }),
        Effect.map(() => {}),
      ),
    ),
  );
}

/** 切换标签 */
export function toggleTag(id: string, tag: string) {
  return pipe(
    DatabaseTag,
    Effect.flatMap((db) =>
      pipe(
        db.getDoc(),
        Effect.flatMap((doc: any) => {
          const favorite = (doc.data ?? []).find((f: ColorFavorite) => f.id === id);
          if (!favorite) return Effect.fail(new Error("收藏不存在"));
          if (favorite.tags.includes(tag)) {
            favorite.tags = favorite.tags.filter((t: string) => t !== tag);
          } else {
            favorite.tags.push(tag);
          }
          return db.saveDoc(doc);
        }),
        Effect.map(() => {}),
      ),
    ),
  );
}

/** 获取所有标签 */
export function getAllTags() {
  return pipe(
    getAll(),
    Effect.map((favorites: ColorFavorite[]) => {
      const tagSet = new Set<string>();
      favorites.forEach((f: ColorFavorite) =>
        f.tags.forEach((t: string) => tagSet.add(t)),
      );
      return Array.from(tagSet).sort();
    }),
  );
}

/** 按标签筛选收藏 */
export function filterByTags(tags: string[]) {
  return pipe(
    getAll(),
    Effect.map((favorites: ColorFavorite[]) => {
      if (tags.length === 0) return favorites;
      return favorites.filter((f: ColorFavorite) =>
        tags.every((t: string) => f.tags.includes(t)),
      );
    }),
  );
}
