import { defineStore } from "pinia";
import type { ColorFormat } from "../utils/color";

export const useConfigStore = defineStore("config", {
  state: () => {
    return { removeHash: false, format: "hex" } as Config;
  },
});

export interface Config {
  removeHash: boolean;
  format: ColorFormat;
}
