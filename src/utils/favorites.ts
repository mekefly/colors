/**
 * 颜色收藏管理工具
 * 使用 localStorage 持久化存储收藏的颜色
 */

import { defineStore } from "pinia";
import { computed, ref, watch, toRaw } from "vue";
import zToolsApi from "./ztoolsapi";

export interface ColorFavorite {
  id: string;
  color: string;
  tags: string[];
  createdAt: number;
}

const STORAGE_KEY = "color-favorites";

/**
 * 获取所有收藏的颜色
 */
export function getFavorites(): ColorFavorite[] {
  try {
    const data = zToolsApi.db.get<{ data: string }>(STORAGE_KEY);
    return data ? JSON.parse(data.data) : [];
  } catch (error) {
    console.error("读取收藏失败:", error);
    return [];
  }
}

/**
 * 保存收藏列表
 */
function saveFavorites(favorites: ColorFavorite[]): void {
  try {
    zToolsApi.db.put({ _id: STORAGE_KEY, data: JSON.stringify(favorites) });
    console.log("已保存收藏", favorites);
  } catch (error) {
    console.error("保存收藏失败:", error);
    throw new Error("保存收藏失败:" + error);
  }
}
export const useFavorites = defineStore(STORAGE_KEY, () => {
  const value = ref(getFavorites());
  watch(
    value,
    (value) => {
      saveFavorites(toRaw(value));
    },
    { deep: true },
  );
  const addFavorite = (color: string, tags: string[] = []) => {
    // 检查是否已存在
    const exists = value.value.find((f) => f.color === color);
    if (exists) {
      throw new Error("该颜色已在收藏中");
    }

    const newFavorite: ColorFavorite = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      color,
      tags,
      createdAt: Date.now(),
    };

    value.value.unshift(newFavorite);
  };

  const removeFavorite = (id: string) => {
    const filtered = value.value.filter((f) => f.id !== id);
    console.log("filtered", filtered);

    value.value = filtered;
  };

  const removeColor = (color: string) => {
    const filtered = value.value.filter((f) => f.color !== color);
    value.value = filtered;
  };
  const addTag = (id: string, tag: string) => {
    const favorite = value.value.find((f) => f.id === id);
    if (!favorite) {
      throw new Error("收藏不存在");
    }
    if (favorite.tags.includes(tag)) {
      throw new Error("该标签已存在");
    }

    favorite.tags.push(tag);
  };

  const addTagByColor = (color: string, tag: string) => {
    const favorite = value.value.find((f) => f.color === color);
    if (!favorite) {
      throw new Error("收藏不存在");
    }
    if (favorite.tags.includes(tag)) {
      throw new Error("该标签已存在");
    }
    favorite.tags.push(tag);
  };
  const getById = (id: string) => {
    return value.value.find((f) => f.id === id) || null;
  };
  const toggleTag = (id: string, tag: string) => {
    let favorite = getById(id);
    if (!favorite) {
      throw new Error("收藏不存在");
    }
    if (favorite.tags.includes(tag)) {
      favorite.tags = favorite.tags.filter((t) => t !== tag);
    } else {
      favorite.tags.push(tag);
    }
  };

  return {
    value,
    addFavorite,
    removeColor,
    removeFavorite,
    addTag,
    addTagByColor,
    getById,
    toggleTag,
  };
});
export const useAllTags = defineStore("all-tags", () => {
  let favorites = useFavorites();

  const value = computed((): string[] => {
    const tagSet = new Set<string>();
    favorites.value.forEach((favorite) => {
      favorite.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  });
  return {
    value,
  };
});
export const useTagFilter = defineStore("tag-filter", () => {
  const favorites = useFavorites();
  const selectedTags = ref<string[]>([]);

  const filteredFavorites = computed(() =>
    filterFavoritesByTags(favorites.value, selectedTags.value),
  );

  const add = (tag: string) => {
    if (selectedTags.value.includes(tag)) {
      throw new Error("该标签已存在");
    }
    selectedTags.value.push(tag);
  };
  const remove = (tag: string) => {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag);
  };
  const clear = () => {
    selectedTags.value = [];
  };
  return {
    selectedTags,
    filteredFavorites,
    add,
    remove,
    clear,
  };
});

/**
 * 根据标签筛选收藏
 */
export function filterFavoritesByTags(
  favorites: ColorFavorite[],
  selectedTags: string[],
): ColorFavorite[] {
  if (selectedTags.length === 0) {
    return favorites;
  }

  return favorites.filter((favorite) => selectedTags.every((tag) => favorite.tags.includes(tag)));
}

export const useTagsEditing = defineStore("tags-editing", () => {
  let favorites = useFavorites();
  // 编辑状态
  const favoriteId = ref<string | null>(null);
  const editingTags = computed(() => {
    return favoriteId.value ? (favorites.getById(favoriteId.value)?.tags ?? null) : [];
  });
  const isEditing = computed(() => favoriteId.value !== null);

  const startEditing = (id: string) => {
    favoriteId.value = id;
  };
  const color = computed(() => {
    return favoriteId.value ? favorites.getById(favoriteId.value)?.color : null;
  });
  const addTag = (tag: string) => {
    if (!favoriteId.value) {
      throw new Error("请选择要编辑的收藏");
    }
    favorites.addTag(favoriteId.value, tag);
  };
  const back = () => {
    favoriteId.value = null;
  };
  const toggleTag = (tag: string) => {
    if (!favoriteId.value) throw new Error("请选择要编辑的收藏");

    favorites.toggleTag(favoriteId.value, tag);
  };

  /**
   * 例如颜色被删除后，编辑器自动收起
   */
  watch(color, (color) => {
    if (color) {
      return;
    }

    favoriteId.value = null;
  });

  return {
    favoriteId,
    editingTags,
    isEditing,
    startEditing,
    color,
    addTag,
    back,
    toggleTag,
  };
});
