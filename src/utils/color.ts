import { Colord } from "colord";

export function colordToHsvString(color: Colord) {
  let hsv = color.toHsv();
  return `hsv(${hsv.h},${hsv.s * 100}%,${hsv.v * 100}%)`;
}
export function colordToHsbString(color: Colord) {
  let hsb = color.toHsv();
  return `hsb(${hsb.h},${hsb.s * 100}%,${hsb.v * 100}%)`;
}
