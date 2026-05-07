import { defineStore } from "pinia";
import { ref } from "vue";

export const useCurrentColor = defineStore("currentColor", () => {
  const currentColor = ref("#FFFFFF");
  function setCurrentColor(color: string) {
    currentColor.value = color;
  }
  return {
    currentColor,
    setCurrentColor,
  };
});
