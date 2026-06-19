/**
 * 标签筛选 Store — 管理选中的标签 + 筛选结果
 *
 * 职责：维护 selectedTags 状态，计算筛选后的收藏列表。
 * 依赖：useFavoritesStore。
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useFavoritesStore } from "./use-favorites-store";

export const useTagFilterStore = defineStore("tag-filter", () => {
  const favorites = useFavoritesStore();

  const selectedTags = ref<string[]>([]);

  const filteredFavorites = computed(() => {
    if (selectedTags.value.length === 0) {
      return favorites.items;
    }
    return favorites.items.filter((favorite) =>
      selectedTags.value.every((tag) => favorite.tags.includes(tag)),
    );
  });

  function add(tag: string) {
    if (selectedTags.value.includes(tag)) {
      return;
    }
    selectedTags.value.push(tag);
  }

  function remove(tag: string) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag);
  }

  function clear() {
    selectedTags.value = [];
  }

  return {
    selectedTags,
    filteredFavorites,
    add,
    remove,
    clear,
  };
});
