// ════════════════════════════════════════════════════════════════
//  几何工具函数（纯函数，不依赖组件状态/响应式）
// ════════════════════════════════════════════════════════════════

import { colord, type Colord } from "colord";

interface PointXY {
  x: number;
  y: number;
}

/** 中心 + CSS角度 + 半径 → 射线上的点（SVG 0-100坐标系, 圆心50,50）
 *  方向: θ=0°→↑, 90°→→, 180°→↓, 270°→←（与 CSS linear-gradient 一致） */
export function pointOnRay(cx: number, cy: number, cssAngle: number, radius: number): PointXY {
  const rad = (cssAngle * Math.PI) / 180;
  return { x: cx + Math.sin(rad) * radius, y: cy - Math.cos(rad) * radius };
}

/** 将点投影到线段 AB 上, 返回投影比例 t ∈ [0,1]
 *  t=0 → A点, t=0.5 → 中点, t=1 → B点
 *  向量投影公式: t = dot(P-A, B-A) / dot(B-A, B-A) */
export function projectOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax,
    dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.001) return 0.5; // 零线段退化, 返回中点
  const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  return Math.max(0, Math.min(1, t));
}

/** 鼠标事件坐标 → CSS 角度（0°=↑, 顺时针递增） */
export function mouseToCssAngle(e: MouseEvent, centerEl: HTMLElement): number {
  const rect = centerEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rad = Math.atan2(e.clientX - cx, -(e.clientY - cy));
  return Math.round((rad * 180) / Math.PI + 360) % 360;
}

/** 鼠标事件坐标 → SVG 0-100 坐标系中的点 */
export function mouseToSvgPoint(e: MouseEvent, el: HTMLElement): PointXY {
  const rect = el.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100,
  };
}

/** CSS 渐变线偏移修正因子 stretch = 1/(|sinθ|+|cosθ|)
 *  详见下方「角度补偿」大段注释的推导 */
export function stretchFactor(angleDeg: number): number {
  const rad = (angleDeg * Math.PI) / 180;
  return 1 / (Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)));
}

/** 用 stretch 修正单个色标位置（用户0-100分位 → CSS 百分比） */
export function correctStopPos(position: number, stretch: number): number {
  return 50 + stretch * (position - 50);
}

/**
 * 范围0-100，自动查找最大空隙
 * @param areas
 */
export function findBestInsertionPoint(areas: number[]): number {
  if (areas.length === 0) return 0;
  const sorted = [...areas].sort((a, b) => a - b);
  let maxAreaSize = 0;
  let maxAreaInsertionPoint = 0;
  const setMaxArea = (insertionPoint: number, areaSize: number) => {
    if (areaSize > maxAreaSize) {
      maxAreaSize = areaSize;
      maxAreaInsertionPoint = insertionPoint;
    }
  };
  if (sorted[0] !== 0) {
    maxAreaSize = (sorted[0] as number) - 0;
    maxAreaInsertionPoint = 0;
  }
  if (sorted[sorted.length - 1] !== 100) {
    setMaxArea(100, 100 - (sorted[sorted.length - 1] as number));
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i] as number;
    const b = sorted[i + 1] as number;
    const gap = b - a;
    const point = a + gap / 2;
    const size = point - a;
    setMaxArea(point, size);
  }

  return maxAreaInsertionPoint;
}

/** 范围映射 value ∈ [start, end] → [start1, end1]
 *  正向/反向区间均适用，线性插值 */
export function mapRange(
  value: number,
  start: number,
  end: number,
  start1: number,
  end1: number,
): number {
  if (start === end) return start1;
  if (start > end) return mapRange(value, end, start, end1, start1);
  if (value <= start) return start1;
  if (value >= end) return end1;
  return ((value - start) / (end - start)) * (end1 - start1) + start1;
}

// ════════════════════════════════════════════════════════════════
//  视觉常量（改这里即可控制所有形状大小）
// ════════════════════════════════════════════════════════════════

/** 色点直径（px）—— 箭头粗细自动 = 该值 × 0.618（黄金比） */
export const DOT_SIZE = 30;

/** 色点轨道半径（SVG viewBox 0-100 坐标系, 50=色盘边缘） */
export const DOT_TRACK_R = 50;

/** 箭头伸出圆盘的长度增量（SVG 坐标） */
export const ARROW_EXTRA = 20;

/** 箭头三角形张开角度（度）—— 左右各张开多少 */
export const ARROW_HEAD_ANGLE = 28;
/** 箭头三角形边长（SVG 坐标） */
export const ARROW_HEAD_LEN = 15;
/** 箭头三角描边粗（SVG 坐标） */
export const ARROW_HEAD_STROKE = 1.5;

// 衍生常量（自动计算, 不用改）
export const ARROW_VISUAL_R = DOT_TRACK_R + ARROW_EXTRA;
export const ARROW_STROKE = (DOT_SIZE * 0.618) / 3;

export const MAX_STOPS = 9;
