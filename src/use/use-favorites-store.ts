import { Effect } from "effect";
/**
 * 收藏核心 Store — 数据 + CRUD
 *
 * 职责：管理收藏数据列表，提供增删改查操作。
 * 不包含标签筛选、标签编辑等衍生功能。
 */
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { FavoritesApi, type HexColor, type LinearGradient, type ColorFavorite } from "../effect";
import { FavoritesService } from "../effect";

const { colorToCSS, colorEquals, colorToDisplay } = FavoritesService;
export { colorToCSS, colorEquals, colorToDisplay };
export type { HexColor, LinearGradient, ColorFavorite } from "../effect";

// ── Store ──

export const useFavoritesStore = defineStore("favorites", () => {
  const items = ref<ColorFavorite[]>([]);
  const loaded = ref(false);

  async function load() {
    try {
      items.value = await Effect.runPromise(FavoritesApi.getAll_());
    } catch (e) {
      console.error("[favorites] 加载失败:", e);
      items.value = [];
    } finally {
      loaded.value = true;
    }
  }

  load();

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

  return {
    items,
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
  };
});
