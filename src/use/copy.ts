import { Colord } from "colord";
import { type ColorToStringOptions, colordToString } from "../utils/color";
import { useMessage } from "./message";

export const useCopy = () => {
  const message = useMessage();

  const copyColor = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`已复制颜色: ${text}`);
    } catch (err) {
      console.error("复制失败:", err);
      message.error("复制失败");
    }
  };
  const copyColor2 = async (color: Colord, options?: ColorToStringOptions) => {
    const colorText = colordToString(color, options);

    copyColor(colorText);
  };
  const copyCSS = async (css: string) => {
    const message = useMessage();
    try {
      await navigator.clipboard.writeText(css);
      message.success(`已复制 CSS: ${css}`);
    } catch (err) {
      console.error("复制失败:", err);
      message.error("复制失败");
    }
  };
  return { copyColor, copyColor2, copyCSS };
};
