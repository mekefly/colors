import { Effect } from "effect";
/**
 * 收藏 Pinia Store — 使用 Effect FavoritesApi
 *
 * 替代旧的 useFavorites / useAllTags / useTagFilter / useTagsEditing。
 * 所有方法返回 Promise，UI 层 await 即可。
 *
 * use* 约定：内部调用 useFavoritesStore()，只能在 setup 顶层调用。
 */
import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { FavoritesApi, type HexColor, type LinearGradient, type ColorFavorite } from "../effect";

export type { HexColor, LinearGradient, ColorFavorite } from "../effect";

// ── 纯工具函数 ──

/** 判断两个颜色是否相同 */
export function colorEquals(a: HexColor | LinearGradient, b: HexColor | LinearGradient): boolean {
  return colorToCSS(a) === colorToCSS(b);
}

/** 将颜色转为 CSS 字符串 */
export function colorToCSS(color: HexColor | LinearGradient): string {
  if (color.type === "hex") return color.hex;
  const stopsStr = color.stops
    .map((s) => (s.position != null ? `${s.color} ${s.position}%` : s.color))
    .join(", ");
  return `linear-gradient(${color.direction}, ${stopsStr})`;
}

/** 获取颜色的显示文本 */
export function colorToDisplay(color: HexColor | LinearGradient): string {
  if (color.type === "hex") return color.hex;
  return colorToCSS(color);
}

// ── Pinia Store ──

export const useFavoritesStore = defineStore("favorites-api", () => {
  // ── 状态 ──
  const _value = ref<ColorFavorite[]>([]);
  const value = computed<ColorFavorite[]>(() => _value.value);
  const loaded = ref(false);

  // ── 加载 ──
  async function load() {
    try {
      _value.value = await Effect.runPromise(FavoritesApi.getAll_());
    } catch (e) {
      console.error("[favorites] 加载失败:", e);
      _value.value = [];
    } finally {
      loaded.value = true;
    }
  }

  // 初始化加载
  load();

  // ── CRUD ──

  async function addFavorite(color: HexColor | LinearGradient, tags: string[] = []) {
    await Effect.runPromise(FavoritesApi.addFavorite(color, tags));
    await load();
  }

  async function removeFavorite(id: string) {
    await Effect.runPromise(FavoritesApi.removeFavorite(id));
    await load();
  }

  async function removeColor(color: HexColor | LinearGradient) {
    await Effect.runPromise(FavoritesApi.removeColor(color));
    await load();
  }

  function getById(id: string) {
    return Effect.runPromise(FavoritesApi.getById(id));
  }

  async function addTag(id: string, tag: string) {
    await Effect.runPromise(FavoritesApi.addTag(id, tag));
    await load();
  }

  async function addTagByColor(color: HexColor | LinearGradient, tag: string) {
    await Effect.runPromise(FavoritesApi.addTagByColor(color, tag));
    await load();
  }

  async function toggleTag(id: string, tag: string) {
    await Effect.runPromise(FavoritesApi.toggleTag(id, tag));
    await load();
  }

  async function refresh() {
    await load();
  }

  // ── allTags ──

  const allTags = computed((): string[] => {
    const tagSet = new Set<string>();
    _value.value.forEach((favorite) => {
      favorite.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  });

  // ── tagFilter ──

  const selectedTags = ref<string[]>([]);

  const filteredFavorites = computed(() => {
    if (selectedTags.value.length === 0) {
      return _value.value;
    }
    return _value.value.filter((favorite) =>
      selectedTags.value.every((tag) => favorite.tags.includes(tag)),
    );
  });

  function addSelectedTag(tag: string) {
    if (selectedTags.value.includes(tag)) {
      throw new Error("该标签已存在");
    }
    selectedTags.value.push(tag);
  }

  function removeSelectedTag(tag: string) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag);
  }

  function clearSelectedTags() {
    selectedTags.value = [];
  }

  // ── tagsEditing ──

  const editingFavoriteId = ref<string | null>(null);

  const editingTags = computed(() => {
    return editingFavoriteId.value
      ? (_value.value.find((f) => f.id === editingFavoriteId.value)?.tags ?? [])
      : [];
  });

  const isEditing = computed(() => editingFavoriteId.value !== null);

  const editingColor = computed(() => {
    return editingFavoriteId.value
      ? (_value.value.find((f) => f.id === editingFavoriteId.value)?.color ?? null)
      : null;
  });

  function startEditing(id: string) {
    editingFavoriteId.value = id;
  }

  function back() {
    editingFavoriteId.value = null;
  }

  async function editingAddTag(tag: string) {
    if (!editingFavoriteId.value) {
      throw new Error("请选择要编辑的收藏");
    }
    await addTag(editingFavoriteId.value, tag);
  }

  async function editingToggleTag(tag: string) {
    if (!editingFavoriteId.value) throw new Error("请选择要编辑的收藏");
    await toggleTag(editingFavoriteId.value, tag);
  }

  // 颜色被删除后，编辑器自动收起
  watch(editingColor, (color) => {
    if (!color) {
      editingFavoriteId.value = null;
    }
  });

  return {
    value,
    loaded,
    refresh,

    addFavorite,
    addColor: addFavorite,
    removeFavorite,
    removeColor,
    getById,
    addTag,
    addTagByColor,
    toggleTag,

    allTags,

    selectedTags,
    filteredFavorites,
    addSelectedTag,
    removeSelectedTag,
    clearSelectedTags,

    editingFavoriteId,
    editingTags,
    isEditing,
    editingColor,
    startEditing,
    back,
    editingAddTag,
    editingToggleTag,
  };
});

/**
 * 收藏 composable — 包装 useFavoritesStore
 *
 * use* 约定：内部调用 useFavoritesStore()，只能在 setup 顶层调用。
 */
export function useFavoritesApi() {
  return useFavoritesStore();
}
