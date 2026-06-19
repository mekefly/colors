/**
 * 全部标签 Store — 从收藏数据中提取所有标签
 *
 * 职责：提供去重、按颜色数量降序排列的标签列表。
 * 依赖：useFavoritesStore。
 */
import { defineStore } from "pinia";
import { computed } from "vue";
import { useFavoritesStore } from "./use-favorites-store";

export const useAllTagsStore = defineStore("all-tags", () => {
  const favorites = useFavoritesStore();

  const value = computed((): string[] => {
    const counts = new Map<string, number>();
    favorites.items.forEach((favorite) => {
      favorite.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return Array.from(counts.keys()).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  });

  return { value };
});
