/**
 * API 收藏层 — 唯一职责：提供 FavoritesDoc 层
 *
 * 使用示例：
 *   import { Effect } from "effect"
 *   import { FavoritesApi } from "../effect"
 *
 *   const list = await Effect.runPromise(FavoritesApi.getAll())
 *   await Effect.runPromise(FavoritesApi.addFavorite(color, tags))
 *   await Effect.runPromise(FavoritesApi.removeFavorite(id))
 */
import { Effect, Layer } from "effect";
import type { HexColor, LinearGradient } from "..";
import { DatabaseLive } from "../live/db";
import { DocLive } from "../live/docs";
import {
  getAll,
  addFavorite as _addFavorite,
  removeFavorite as _removeFavorite,
  removeColor as _removeColor,
  getById as _getById,
  addTag as _addTag,
  addTagByColor as _addTagByColor,
  toggleTag as _toggleTag,
  getAllTags as _getAllTags,
  filterByTags as _filterByTags,
} from "../server/favorites";

const Deps = Layer.mergeAll(DocLive.favorites);

/** 获取所有收藏 */
export function getAll_() {
  return getAll().pipe(Effect.provide(Deps));
}

/** 添加收藏 */
export function addFavorite(color: HexColor | LinearGradient, tags: string[] = []) {
  return _addFavorite(color, tags).pipe(Effect.provide(Deps));
}

/** 按 ID 删除收藏 */
export function removeFavorite(id: string) {
  return _removeFavorite(id).pipe(Effect.provide(Deps));
}

/** 按颜色删除收藏 */
export function removeColor(color: HexColor | LinearGradient) {
  return _removeColor(color).pipe(Effect.provide(Deps));
}

/** 按 ID 查找收藏 */
export function getById(id: string) {
  return _getById(id).pipe(Effect.provide(Deps));
}

/** 给收藏添加标签 */
export function addTag(id: string, tag: string) {
  return _addTag(id, tag).pipe(Effect.provide(Deps));
}

/** 按颜色添加标签 */
export function addTagByColor(color: HexColor | LinearGradient, tag: string) {
  return _addTagByColor(color, tag).pipe(Effect.provide(Deps));
}

/** 切换标签 */
export function toggleTag(id: string, tag: string) {
  return _toggleTag(id, tag).pipe(Effect.provide(Deps));
}

/** 获取所有标签 */
export function getAllTags() {
  return _getAllTags().pipe(Effect.provide(Deps));
}

/** 按标签筛选收藏 */
export function filterByTags(tags: string[]) {
  return _filterByTags(tags).pipe(Effect.provide(Deps));
}
