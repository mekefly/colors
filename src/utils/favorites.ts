/**
 * 颜色收藏管理工具
 *
 * 数据库由 databases.ts 统一初始化，本模块不负责初始化。
 * 使用前确保 databases.initAll() 已执行完成。
 */

import { defineStore } from "pinia";
import { computed, ref, watch, nextTick } from "vue";
import type { DatabaseApi } from "./database";
import { createDatabase } from "./database";

export interface ColorFavorite {
  id: string;
  color: string;
  tags: string[];
  createdAt: number;
}

// ── 数据库引用 ──
// 由 databases.ts 在 initAll() 完成后通过 setDatabase() 注入
let favoritesDb: DatabaseApi<{ data: ColorFavorite[] }> | null = null;

/**
 * 注入已初始化的数据库实例
 * 由 databases.ts 在 initAll() 后调用
 */
export function setDatabase(db: DatabaseApi<{ data: ColorFavorite[] }>): void {
  favoritesDb = db;
}
export function createDB() {
  return createDatabase<{ data: ColorFavorite[] }>({
    id: "color-favorites",
    initialData: { data: [] },
    version: 1,
  });
  // .patch(1, ({ db }) => {
  //   // v0 → v1 的迁移逻辑（如果有的话）
  // });
}

/**
 * 获取数据库实例
 * 如果未初始化会抛出异常
 */
function getDb(): DatabaseApi<{ data: ColorFavorite[] }> {
  if (!favoritesDb) {
    throw new Error("[favorites] 数据库未初始化，请确保在 databases.initAll() 之后使用");
  }
  return favoritesDb;
}

/**
 * 获取所有收藏的颜色
 */
export function getFavorites(): DbDoc<{ data: ColorFavorite[] }> {
  return getDb().getDoc();
}

/**
 * 保存收藏列表
 */
async function saveFavorites(favoritesDoc: DbDoc<{ data: ColorFavorite[] }>): Promise<void> {
  try {
    const result = getDb().saveDoc(JSON.parse(JSON.stringify(favoritesDoc)));
    if (result.ok) {
      favoritesDoc._rev = result.rev;
      console.log("已保存收藏", favoritesDoc);
    } else if (result.error) {
      console.error("保存收藏失败:", result.message);
      throw new Error("保存收藏失败:" + result.message);
    }
  } catch (error) {
    console.error("保存收藏失败:", error);
    throw new Error("保存收藏失败:" + error);
  }
}

export const useFavorites = defineStore("color-favorites", () => {
  const doc = ref(getFavorites());
  const value = computed({
    get: () => doc.value.data,
    set: (value) => {
      doc.value.data = value;
    },
  });

  // 使用标志位防止递归更新
  let isSaving = false;

  watch(
    doc,
    async (newValue) => {
      if (isSaving) return;
      isSaving = true;
      try {
        await saveFavorites(newValue);
      } finally {
        await nextTick();
        isSaving = false;
      }
    },
    { deep: true },
  );

  const addFavorite = (color: string, tags: string[] = []) => {
    const exists = value.value.find((f) => f.color === color);
    if (exists) {
      throw new Error("该颜色已在收藏中");
    }

    const newFavorite: ColorFavorite = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      color,
      tags,
      createdAt: Date.now(),
    };

    value.value.unshift(newFavorite);
  };

  const removeFavorite = (id: string) => {
    value.value = value.value.filter((f) => f.id !== id);
  };

  const removeColor = (color: string) => {
    value.value = value.value.filter((f) => f.color !== color);
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
    const favorite = getById(id);
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
    addColor: addFavorite,
    removeColor,
    removeFavorite,
    addTag,
    addTagByColor,
    getById,
    toggleTag,
  };
});

export const useAllTags = defineStore("all-tags", () => {
  const favorites = useFavorites();
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
  const favorites = useFavorites();
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
