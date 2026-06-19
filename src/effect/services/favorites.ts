/**
 * Effect 收藏服务 — 纯业务逻辑
 *
 * yield* FavoritesDoc 拿到 DocService<FavoritesDoc>，类型自动精确。
 */

import { Effect } from "effect";
import { FavoritesDoc } from "../layer/database";
import type { ColorFavorite, FavoritesDoc as FavoritesDocType } from "../layer/database";

// ── 类型重新导出 ──

export type { ColorFavorite, FavoritesDoc as FavoritesDocType } from "../layer/database";

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

// ── 颜色辅助函数 ──

export function colorToCSS(color: HexColor | LinearGradient): string {
  if (color.type === "hex") return color.hex;
  const stopsStr = color.stops
    .map((s) => (s.position != null ? `${s.color} ${s.position}%` : s.color))
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

// ── 业务操作 ──

export function getAll() {
  return Effect.gen(function* () {
    const db = yield* FavoritesDoc;
    const doc = yield* db.getDoc();
    return doc.data ?? [];
  });
}

export function addFavorite(color: HexColor | LinearGradient, tags: string[] = []) {
  return Effect.gen(function* () {
    const db = yield* FavoritesDoc;
    const doc = yield* db.getDoc();
    if (doc.data.some((f) => colorEquals(f.color, color))) {
      return yield* Effect.fail(new Error("该颜色已在收藏中"));
    }
    doc.data.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      color, tags, createdAt: Date.now(),
    });
    yield* db.saveDoc(doc);
  });
}

export function removeFavorite(id: string) {
  return Effect.gen(function* () {
    const db = yield* FavoritesDoc;
    const doc = yield* db.getDoc();
    doc.data = doc.data.filter((f) => f.id !== id);
    yield* db.saveDoc(doc);
  });
}

export function removeColor(color: HexColor | LinearGradient) {
  return Effect.gen(function* () {
    const db = yield* FavoritesDoc;
    const doc = yield* db.getDoc();
    doc.data = doc.data.filter((f) => !colorEquals(f.color, color));
    yield* db.saveDoc(doc);
  });
}

export function getById(id: string) {
  return Effect.gen(function* () {
    const db = yield* FavoritesDoc;
    const doc = yield* db.getDoc();
    return doc.data.find((f) => f.id === id) ?? null;
  });
}

export function addTag(id: string, tag: string) {
  return Effect.gen(function* () {
    const db = yield* FavoritesDoc;
    const doc = yield* db.getDoc();
    const f = doc.data.find((x) => x.id === id);
    if (!f) return yield* Effect.fail(new Error("收藏不存在"));
    if (f.tags.includes(tag)) return yield* Effect.fail(new Error("该标签已存在"));
    f.tags.push(tag);
    yield* db.saveDoc(doc);
  });
}

export function addTagByColor(color: HexColor | LinearGradient, tag: string) {
  return Effect.gen(function* () {
    const db = yield* FavoritesDoc;
    const doc = yield* db.getDoc();
    const f = doc.data.find((x) => colorEquals(x.color, color));
    if (!f) return yield* Effect.fail(new Error("收藏不存在"));
    if (f.tags.includes(tag)) return yield* Effect.fail(new Error("该标签已存在"));
    f.tags.push(tag);
    yield* db.saveDoc(doc);
  });
}

export function toggleTag(id: string, tag: string) {
  return Effect.gen(function* () {
    const db = yield* FavoritesDoc;
    const doc = yield* db.getDoc();
    const f = doc.data.find((x) => x.id === id);
    if (!f) return yield* Effect.fail(new Error("收藏不存在"));
    if (f.tags.includes(tag)) {
      f.tags = f.tags.filter((t) => t !== tag);
    } else {
      f.tags.push(tag);
    }
    yield* db.saveDoc(doc);
  });
}

export function getAllTags() {
  return Effect.gen(function* () {
    const favorites = yield* getAll();
    const tagSet = new Set<string>();
    favorites.forEach((f) => f.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  });
}

export function filterByTags(tags: string[]) {
  return Effect.gen(function* () {
    const favorites = yield* getAll();
    if (tags.length === 0) return favorites;
    return favorites.filter((f) => tags.every((t) => f.tags.includes(t)));
  });
}
