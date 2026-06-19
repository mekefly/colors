import { describe, it, expect, beforeEach } from "vitest";
import { Effect, Layer } from "effect";
import { FavoritesDocTest, resetFavoritesDoc } from "../test/FavoritesDocTest";
import {
  getAll,
  addFavorite,
  removeFavorite,
  removeColor,
  getById,
  addTag,
  toggleTag,
  getAllTags,
  filterByTags,
  colorToCSS,
  colorEquals,
} from "./favorites";
import type { HexColor, LinearGradient } from "../tag";

const red: HexColor = { type: "hex", hex: "#FF0000" };
const blue: HexColor = { type: "hex", hex: "#0000FF" };
const gradient: LinearGradient = {
  type: "linear-gradient",
  direction: "to right",
  stops: [
    { color: "#FF0000", position: 0 },
    { color: "#0000FF", position: 100 },
  ],
};

/** 运行 Effect，注入 FavoritesDocTest layer */
function run<A, R>(effect: Effect.Effect<A, any, R>): Promise<A> {
  return Effect.runPromise(effect.pipe(Effect.provide(FavoritesDocTest)) as Effect.Effect<A, any, never>);
}

describe("color 辅助函数", () => {
  it("colorToCSS — hex", () => {
    expect(colorToCSS(red)).toBe("#FF0000");
  });

  it("colorToCSS — gradient", () => {
    expect(colorToCSS(gradient)).toBe(
      "linear-gradient(to right, #FF0000 0%, #0000FF 100%)",
    );
  });

  it("colorToCSS — gradient 无 position", () => {
    const g: LinearGradient = {
      type: "linear-gradient",
      direction: "180deg",
      stops: [{ color: "#aaa" }, { color: "#bbb" }],
    };
    expect(colorToCSS(g)).toBe("linear-gradient(180deg, #aaa, #bbb)");
  });

  it("colorEquals — 相同 hex", () => {
    expect(colorEquals(red, { type: "hex", hex: "#FF0000" })).toBe(true);
  });

  it("colorEquals — 不同 hex", () => {
    expect(colorEquals(red, blue)).toBe(false);
  });

  it("colorEquals — 相同 gradient", () => {
    expect(colorEquals(gradient, gradient)).toBe(true);
  });
});

describe("favorites CRUD", () => {
  beforeEach(() => resetFavoritesDoc());

  it("getAll — 初始为空", async () => {
    const list = await run(getAll());
    expect(list).toEqual([]);
  });

  it("addFavorite — 添加颜色", async () => {
    await run(addFavorite(red, ["tag1"]));
    const list = await run(getAll());
    expect(list).toHaveLength(1);
    expect(list[0]!.color).toEqual(red);
    expect(list[0]!.tags).toEqual(["tag1"]);
  });

  it("addFavorite — 重复颜色报错", async () => {
    await run(addFavorite(red));
    await expect(run(addFavorite(red))).rejects.toThrow("该颜色已在收藏中");
  });

  it("removeFavorite — 按 id 删除", async () => {
    await run(addFavorite(red));
    const list = await run(getAll());
    await run(removeFavorite(list[0]!.id));
    expect(await run(getAll())).toHaveLength(0);
  });

  it("removeColor — 按颜色删除", async () => {
    await run(addFavorite(red));
    await run(addFavorite(blue));
    await run(removeColor(red));
    const list = await run(getAll());
    expect(list).toHaveLength(1);
    expect(list[0]!.color).toEqual(blue);
  });

  it("getById — 查找存在的收藏", async () => {
    await run(addFavorite(red));
    const list = await run(getAll());
    const item = await run(getById(list[0]!.id));
    expect(item).not.toBeNull();
    expect(item!.color).toEqual(red);
  });

  it("getById — 查找不存在的 id 返回 null", async () => {
    const item = await run(getById("nonexistent"));
    expect(item).toBeNull();
  });
});

describe("tags 操作", () => {
  beforeEach(() => resetFavoritesDoc());

  it("addTag — 添加标签", async () => {
    await run(addFavorite(red));
    const list = await run(getAll());
    await run(addTag(list[0]!.id, "warm"));
    const item = await run(getById(list[0]!.id));
    expect(item!.tags).toEqual(["warm"]);
  });

  it("addTag — 重复标签报错", async () => {
    await run(addFavorite(red, ["warm"]));
    const list = await run(getAll());
    await expect(run(addTag(list[0]!.id, "warm"))).rejects.toThrow("该标签已存在");
  });

  it("addTag — id 不存在报错", async () => {
    await expect(run(addTag("nonexistent", "warm"))).rejects.toThrow("收藏不存在");
  });

  it("toggleTag — 切换已有标签（移除）", async () => {
    await run(addFavorite(red, ["warm"]));
    const list = await run(getAll());
    await run(toggleTag(list[0]!.id, "warm"));
    const item = await run(getById(list[0]!.id));
    expect(item!.tags).toEqual([]);
  });

  it("toggleTag — 切换不存在标签（添加）", async () => {
    await run(addFavorite(red));
    const list = await run(getAll());
    await run(toggleTag(list[0]!.id, "warm"));
    const item = await run(getById(list[0]!.id));
    expect(item!.tags).toEqual(["warm"]);
  });

  it("getAllTags — 收集所有标签并排序", async () => {
    await run(addFavorite(red, ["warm", "primary"]));
    await run(addFavorite(blue, ["cool", "primary"]));
    const tags = await run(getAllTags());
    expect(tags).toEqual(["cool", "primary", "warm"]);
  });

  it("filterByTags — 空标签返回全部", async () => {
    await run(addFavorite(red, ["warm"]));
    await run(addFavorite(blue, ["cool"]));
    const result = await run(filterByTags([]));
    expect(result).toHaveLength(2);
  });

  it("filterByTags — 按标签过滤", async () => {
    await run(addFavorite(red, ["warm"]));
    await run(addFavorite(blue, ["cool"]));
    const result = await run(filterByTags(["warm"]));
    expect(result).toHaveLength(1);
    expect(result[0]!.color).toEqual(red);
  });

  it("filterByTags — 多标签 AND 过滤", async () => {
    await run(addFavorite(red, ["warm", "primary"]));
    await run(addFavorite(blue, ["cool", "primary"]));
    const result = await run(filterByTags(["warm", "primary"]));
    expect(result).toHaveLength(1);
    expect(result[0]!.color).toEqual(red);
  });
});
