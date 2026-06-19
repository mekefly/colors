/**
 * 收藏 API — 统一导出所有 store
 *
 * Vue 组件按需导入具体 store：
 *   import { useFavoritesStore } from "@/use"
 *   import { useTagFilterStore } from "@/use"
 */
export { useFavoritesStore, colorEquals, colorToCSS, colorToDisplay } from "./use-favorites-store";
export type { HexColor, LinearGradient, ColorFavorite } from "./use-favorites-store";
export { useAllTagsStore } from "./use-all-tags-store";
export { useTagFilterStore } from "./use-tag-filter-store";
export { useTagsEditingStore } from "./use-tags-editing-store";
