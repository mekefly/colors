import { colord, Colord } from "colord";

export function colordToHsvString(color: Colord) {
  let hsv = color.toHsv();
  return `hsv(${hsv.h.toFixed(0)},${hsv.s.toFixed(0)}%,${hsv.v.toFixed(0)}%)`;
}
export type ColorFormat =
  | "hex"
  | "hsv"
  | "hsv/hsb"
  | "hsl"
  | "rgb"
  | "hwb"
  | "cmyk"
  | "lab"
  | "lch"
  | "xyz";
export interface ColorToStringOptions {
  format: ColorFormat;
  removeHash?: boolean;
}

export function colordToString(color: Colord, options?: ColorToStringOptions): string {
  const { format = "hex", removeHash = false } = options || {};
  switch (format) {
    case "hsl":
      return color.toHslString();
    case "hsv/hsb":
    case "hsv":
      return colordToHsvString(color);
    case "hex":
      let hex = removeHash ? color.toHex().substring(1) : color.toHex();
      return hex;
    case "rgb":
      return color.toRgbString();
    case "hwb":
      return color.toHwbString();
    case "cmyk":
      return color.toCmykString();
    case "lab":
      const lab = color.toLab();
      return `lab(${lab.l.toFixed(0)} ${lab.a.toFixed(0)} ${lab.b.toFixed(0)})`;
    case "lch":
      const lch = color.toLch();
      return `lch(${lch.l.toFixed(0)} ${lch.c.toFixed(0)} ${(lch.h ?? 0).toFixed(0)})`;
    case "xyz":
      const xyz = color.toXyz();
      return `xyz(${xyz.x.toFixed(2)} ${xyz.y.toFixed(2)} ${xyz.z.toFixed(2)})`;
    default:
      return color.toHex();
  }
}

export function randomColor(): Colord {
  return colord(
    `#${Math.floor(Math.random() * 255 * 255 * 255)
      .toString(16)
      .padStart(6, "0")}`,
  );
}

// ════════════════════════════════════════════════════════════════
//  随机渐变色生成
// ════════════════════════════════════════════════════════════════

/** 生成一组高级渐变默认色标 */
export function randomGradientPair(): [Colord, Colord] {
  const c1 = randomColor();
  const c1hsl = c1.toHsl();
  const c2 = colord({
    h: Math.floor(noise(c1hsl.h, 90, 50) % 360),
    s: Math.floor(Math.min(noise(c1hsl.s, 10), 100)),
    l: Math.floor(Math.min(noise(c1hsl.l, 10), 100)),
  });
  console.log("两个颜色值", c2.toHsl().h - c1.toHsl().h);
  return [c1, c2];
}

/**
 *  在震动范围内震动，震动浮动不得小于minAmplitude，不得大于maxAmplitude
 * @param n
 * @param maxAmplitude
 * @param minAmplitude
 * @returns
 */
export function noise(n: number, maxAmplitude: number, minAmplitude: number = 0): number {
  // 向正方向震动
  let r = (Math.random() * (maxAmplitude - minAmplitude) + minAmplitude) / 2;
  // 一半的可能性负方向震动
  if (Math.random() > 0.5) r *= -1;

  return n + r;
}
