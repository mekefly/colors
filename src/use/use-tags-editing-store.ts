/**
 * 标签编辑 Store — 管理当前正在编辑标签的收藏
 *
 * 职责：维护 editingFavoriteId 状态，提供编辑操作。
 * 依赖：useFavoritesStore。
 */
import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useFavoritesStore } from "./use-favorites-store";

export const useTagsEditingStore = defineStore("tags-editing", () => {
  const favorites = useFavoritesStore();

  const editingFavoriteId = ref<string | null>(null);

  const editingTags = computed(() => {
    return editingFavoriteId.value
      ? (favorites.items.find((f) => f.id === editingFavoriteId.value)?.tags ?? [])
      : [];
  });

  const isEditing = computed(() => editingFavoriteId.value !== null);

  const editingColor = computed(() => {
    return editingFavoriteId.value
      ? (favorites.items.find((f) => f.id === editingFavoriteId.value)?.color ?? null)
      : null;
  });

  function startEditing(id: string) {
    editingFavoriteId.value = id;
  }

  function back() {
    editingFavoriteId.value = null;
  }

  async function addTag(tag: string) {
    if (!editingFavoriteId.value) {
      throw new Error("请选择要编辑的收藏");
    }
    await favorites.addTag(editingFavoriteId.value, tag);
  }

  async function toggleTag(tag: string) {
    if (!editingFavoriteId.value) throw new Error("请选择要编辑的收藏");
    await favorites.toggleTag(editingFavoriteId.value, tag);
  }

  // 颜色被删除后，编辑器自动收起
  watch(editingColor, (color) => {
    if (!color) {
      editingFavoriteId.value = null;
    }
  });

  return {
    editingFavoriteId,
    editingTags,
    isEditing,
    editingColor,
    startEditing,
    back,
    addTag,
    toggleTag,
  };
});
