import { describe, expect, it } from "vitest";
import {
  correctStopPos,
  findBestInsertionPoint,
  mapRange,
  pointOnRay,
  projectOnSegment,
  stretchFactor,
} from "./gradient";
import type { GradientStop } from "../effect";

// ════════════════════════════════════════════════════════════════
//  pointOnRay — 中心+CSS角度+半径 → 射线上的点
// ════════════════════════════════════════════════════════════════
// CSS 角度约定: 0°=↑, 90°=→, 180°=↓, 270°=←（顺时针）
// SVG 0-100 坐标系，圆心 (50,50)
describe("pointOnRay", () => {
  it("0° — 向上", () => {
    const p = pointOnRay(50, 50, 0, 50);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(0);
  });
  it("90° — 向右", () => {
    const p = pointOnRay(50, 50, 90, 50);
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(50);
  });
  it("180° — 向下", () => {
    const p = pointOnRay(50, 50, 180, 50);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(100);
  });
  it("270° — 向左", () => {
    const p = pointOnRay(50, 50, 270, 50);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(50);
  });
  it("45° — 右上", () => {
    const p = pointOnRay(50, 50, 45, 50);
    expect(p.x).toBeCloseTo(50 + 50 * Math.SQRT1_2); // ≈ 85.36
    expect(p.y).toBeCloseTo(50 - 50 * Math.SQRT1_2); // ≈ 14.64
  });
  it("半径=0 → 恒等于圆心", () => {
    const p = pointOnRay(50, 50, 123, 0);
    expect(p.x).toBe(50);
    expect(p.y).toBe(50);
  });
  it("角度 360° 等价于 0°", () => {
    const p = pointOnRay(50, 50, 360, 50);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(0);
  });
  it("负数角度 -90° 等价于 270°", () => {
    const p = pointOnRay(50, 50, -90, 50);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(50);
  });
});

// ════════════════════════════════════════════════════════════════
//  projectOnSegment — 点到线段的投影比例 t ∈ [0,1]
// ════════════════════════════════════════════════════════════════
describe("projectOnSegment", () => {
  it("点在起点 → t=0", () => {
    expect(projectOnSegment(0, 0, 0, 0, 100, 0)).toBe(0);
  });
  it("点在终点 → t=1", () => {
    expect(projectOnSegment(100, 0, 0, 0, 100, 0)).toBe(1);
  });
  it("点在线段中点 → t=0.5", () => {
    expect(projectOnSegment(50, 0, 0, 0, 100, 0)).toBe(0.5);
  });
  it("点在线段垂直上方 → 投影到最近点（中点）", () => {
    expect(projectOnSegment(50, 50, 0, 0, 100, 0)).toBe(0.5);
  });
  it("点在起点之前 → 钳位到 0", () => {
    expect(projectOnSegment(-10, 0, 0, 0, 100, 0)).toBe(0);
  });
  it("点在终点之后 → 钳位到 1", () => {
    expect(projectOnSegment(110, 0, 0, 0, 100, 0)).toBe(1);
  });
  it("零线段 → 返回中点 0.5", () => {
    expect(projectOnSegment(50, 50, 0, 0, 0, 0)).toBe(0.5);
  });
  it("斜线段 45°", () => {
    const t = projectOnSegment(25, 25, 0, 0, 100, 100);
    expect(t).toBeCloseTo(0.25);
  });
  it("垂直线段", () => {
    expect(projectOnSegment(0, 50, 0, 0, 0, 100)).toBe(0.5);
  });
  it("反向线段（B → A 方向）— 结果与正向一致", () => {
    // 斜线段从 (100,0) 到 (0,0), 点 (80,10)
    const t = projectOnSegment(80, 10, 100, 0, 0, 0);
    // 从 A(100,0) 到 B(0,0), 方向向量 = (-100, 0)
    // P(80,10), PA = (80-100, 10-0) = (-20, 10)
    // 投影 t = dot((-20,10), (-100,0)) / |(-100,0)|² = 2000/10000 = 0.2
    expect(t).toBeCloseTo(0.2);
  });
});

// ════════════════════════════════════════════════════════════════
//  stretchFactor — CSS 渐变线偏移修正因子
// ════════════════════════════════════════════════════════════════
describe("stretchFactor", () => {
  it("0° → 1.0（轴向无修正）", () => {
    expect(stretchFactor(0)).toBeCloseTo(1.0);
  });
  it("90° → 1.0（轴向无修正）", () => {
    expect(stretchFactor(90)).toBeCloseTo(1.0);
  });
  it("45° → 1/√2 ≈ 0.707", () => {
    expect(stretchFactor(45)).toBeCloseTo(1 / Math.SQRT2, 3);
  });
  it("30° → 1/(0.5+√3/2) ≈ 0.732", () => {
    const expected = 1 / (0.5 + Math.sqrt(3) / 2);
    expect(stretchFactor(30)).toBeCloseTo(expected, 3);
  });
  it("135° → 1/(|sin135|+|cos135|) = 1/(√2/2+√2/2) = 1/√2", () => {
    expect(stretchFactor(135)).toBeCloseTo(1 / Math.SQRT2, 3);
  });
  it("360° 等价于 0°", () => {
    expect(stretchFactor(360)).toBeCloseTo(1.0);
  });
  it("负数角度 -45° 等价于 315°", () => {
    expect(stretchFactor(-45)).toBeCloseTo(stretchFactor(315), 3);
  });
});

// ════════════════════════════════════════════════════════════════
//  correctStopPos — 单色标位置修正
// ════════════════════════════════════════════════════════════════
describe("correctStopPos", () => {
  it("stretch=1（轴向）: 0→0, 50→50, 100→100", () => {
    expect(correctStopPos(0, 1)).toBe(0);
    expect(correctStopPos(50, 1)).toBe(50);
    expect(correctStopPos(100, 1)).toBe(100);
  });
  it("stretch=0.707（45°）: 0→14.65, 50→50, 100→85.35", () => {
    const s = 1 / Math.SQRT2; // ≈ 0.7071
    expect(correctStopPos(0, s)).toBeCloseTo(50 - 50 * s, 3);
    expect(correctStopPos(50, s)).toBe(50);
    expect(correctStopPos(100, s)).toBeCloseTo(50 + 50 * s, 3);
  });
  it("stretch=0 → 恒等于 50", () => {
    expect(correctStopPos(0, 0)).toBe(50);
    expect(correctStopPos(100, 0)).toBe(50);
  });
});

// ════════════════════════════════════════════════════════════════
//  findBestInsertionPoint — 找最大空隙插入点
// ════════════════════════════════════════════════════════════════
describe("findBestInsertionPoint", () => {
  it("两端 [0, 100] → 50", () => {
    const stops: GradientStop[] = [
      { color: "#000", position: 0 },
      { color: "#fff", position: 100 },
    ];
    expect(findBestInsertionPoint(stops)).toBe(50);
  });
  it("三个等距 [0, 50, 100] → 第一个大间隙中点 25", () => {
    const stops: GradientStop[] = [
      { color: "#000", position: 0 },
      { color: "#888", position: 50 },
      { color: "#fff", position: 100 },
    ];
    expect(findBestInsertionPoint(stops)).toBe(25);
  });
  it("不均匀 [0, 20, 80, 100] → 第一个大间隙 0-20 的中点 10", () => {
    const stops: GradientStop[] = [
      { color: "#a", position: 0 },
      { color: "#b", position: 20 },
      { color: "#c", position: 80 },
      { color: "#d", position: 100 },
    ];
    // 间隙: 20-0=20(第一), 80-20=60, 100-80=20
    expect(findBestInsertionPoint(stops)).toBe(10);
  });
  it("间隙不足 2 → 默认返回 50", () => {
    const stops: GradientStop[] = [
      { color: "#a", position: 0 },
      { color: "#b", position: 1 },
    ];
    expect(findBestInsertionPoint(stops)).toBe(50);
  });
  it("单个色标 → 返回 50", () => {
    const stops: GradientStop[] = [{ color: "#000", position: 0 }];
    expect(findBestInsertionPoint(stops)).toBe(50);
  });
  it("空数组 → 返回 50", () => {
    expect(findBestInsertionPoint([])).toBe(50);
  });
  it("未排序输入 → 自动排序后插入", () => {
    const stops: GradientStop[] = [
      { color: "#c", position: 100 },
      { color: "#a", position: 0 },
    ];
    expect(findBestInsertionPoint(stops)).toBe(50);
  });
  it("大量相邻色标密集填充 → 返回第一个≥2的间隙中点", () => {
    const stops: GradientStop[] = [
      { color: "#a", position: 0 },
      { color: "#b", position: 1 },
      { color: "#c", position: 2 },
      { color: "#d", position: 10 },
    ];
    // 间隙: 1-0=1, 2-1=1, 10-2=8(≥2) → (2+10)/2 = 6
    expect(findBestInsertionPoint(stops)).toBe(6);
  });
});

// ════════════════════════════════════════════════════════════════
//  mapRange — 范围映射（线性插值，钳位）
// ════════════════════════════════════════════════════════════════
describe("mapRange", () => {
  describe("正向输出区间", () => {
    it("边界值", () => {
      expect(mapRange(0, 0, 100, 0, 100)).toBe(0);
      expect(mapRange(100, 0, 100, 0, 100)).toBe(100);
    });
    it("中间值", () => {
      expect(mapRange(50, 0, 100, 0, 100)).toBe(50);
      expect(mapRange(20, 0, 100, 0, 100)).toBe(20);
      expect(mapRange(75, 0, 100, 0, 100)).toBe(75);
    });
    it("钳位（值超出输入范围）", () => {
      expect(mapRange(-10, 0, 100, 0, 100)).toBe(0); // 低于下限
      expect(mapRange(200, 0, 100, 0, 100)).toBe(100); // 高于上限
    });
    it("非零起始输出区间", () => {
      expect(mapRange(0, 0, 100, 100, 200)).toBe(100);
      expect(mapRange(50, 0, 100, 100, 200)).toBe(150);
      expect(mapRange(100, 0, 100, 100, 200)).toBe(200);
    });
  });

  describe("反向输出区间（start1 > end1）", () => {
    it("边界值", () => {
      expect(mapRange(0, 0, 100, 100, 0)).toBe(100);
      expect(mapRange(100, 0, 100, 100, 0)).toBe(0);
    });
    it("中间值 — 线性按比例反向", () => {
      expect(mapRange(50, 0, 100, 100, 0)).toBe(50);
      expect(mapRange(20, 0, 100, 100, 0)).toBe(80);
      expect(mapRange(75, 0, 100, 100, 0)).toBe(25);
    });
    it("负值输出区间", () => {
      expect(mapRange(0, 0, 100, 0, -100)).toBe(0);
      expect(mapRange(50, 0, 100, 0, -100)).toBe(-50);
      expect(mapRange(100, 0, 100, 0, -100)).toBe(-100);
    });
    it("负值反向输出区间", () => {
      expect(mapRange(0, 0, 100, 100, -100)).toBe(100);
      expect(mapRange(25, 0, 100, 100, -100)).toBe(50);
      expect(mapRange(50, 0, 100, 100, -100)).toBe(0);
      expect(mapRange(75, 0, 100, 100, -100)).toBe(-50);
      expect(mapRange(100, 0, 100, 100, -100)).toBe(-100);
    });
  });

  describe("反向输入区间（start > end）", () => {
    it("自动翻转后正确映射", () => {
      // mapRange(0, 100, 0, 0, 100) → swap → mapRange(0, 0, 100, 100, 0) → 100
      expect(mapRange(0, 100, 0, 0, 100)).toBe(100);
      expect(mapRange(50, 100, 0, 0, 100)).toBe(50);
      expect(mapRange(100, 100, 0, 0, 100)).toBe(0);
    });
    it("反向输入 + 反向输出", () => {
      // mapRange(0, 100, 0, 100, 0) → swap → mapRange(0, 0, 100, 0, 100) → 0
      expect(mapRange(0, 100, 0, 100, 0)).toBe(0);
      expect(mapRange(50, 100, 0, 100, 0)).toBe(50);
      expect(mapRange(100, 100, 0, 100, 0)).toBe(100);
    });
  });

  describe("退化区间", () => {
    it("start === end → 返回 start1", () => {
      expect(mapRange(0, 100, 100, 0, 100)).toBe(0);
      expect(mapRange(50, 100, 100, 0, 100)).toBe(0);
      expect(mapRange(100, 100, 100, 0, 100)).toBe(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════
//  mouseToCssAngle — 鼠标坐标 → CSS 角度
// ════════════════════════════════════════════════════════════════
// 需 mock DOM 元素，所以单独 import
import { mouseToCssAngle, mouseToSvgPoint } from "./gradient";

describe("mouseToCssAngle", () => {
  /** 创建一个 300×300、位于 (0,0) 的 mock 元素 */
  function mockEl(): HTMLElement {
    return {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 300,
        height: 300,
        right: 300,
        bottom: 300,
      }),
    } as unknown as HTMLElement;
  }

  function mockMouse(clientX: number, clientY: number): MouseEvent {
    return { clientX, clientY } as unknown as MouseEvent;
  }

  const el = mockEl();

  it("鼠标在圆心正上方 → 0°", () => {
    expect(mouseToCssAngle(mockMouse(150, 0), el)).toBe(0);
  });
  it("鼠标在圆心正右方 → 90°", () => {
    expect(mouseToCssAngle(mockMouse(300, 150), el)).toBe(90);
  });
  it("鼠标在圆心正下方 → 180°", () => {
    expect(mouseToCssAngle(mockMouse(150, 300), el)).toBe(180);
  });
  it("鼠标在圆心正左方 → 270°", () => {
    expect(mouseToCssAngle(mockMouse(0, 150), el)).toBe(270);
  });
  it("鼠标在 45° 方向（右上）", () => {
    const cx = 150,
      cy = 150;
    const r = 50;
    const angle = 45;
    const rad = (angle * Math.PI) / 180;
    const mx = cx + Math.sin(rad) * r;
    const my = cy - Math.cos(rad) * r;
    expect(mouseToCssAngle(mockMouse(mx, my), el)).toBe(45);
  });
  it("鼠标在 135° 方向（右下）", () => {
    const cx = 150,
      cy = 150;
    const r = 50;
    const angle = 135;
    const rad = (angle * Math.PI) / 180;
    const mx = cx + Math.sin(rad) * r;
    const my = cy - Math.cos(rad) * r;
    expect(mouseToCssAngle(mockMouse(mx, my), el)).toBe(135);
  });
});

// ════════════════════════════════════════════════════════════════
//  mouseToSvgPoint — 鼠标坐标 → SVG 0-100 坐标系
// ════════════════════════════════════════════════════════════════
describe("mouseToSvgPoint", () => {
  function mockEl(left: number, top: number, w: number, h: number): HTMLElement {
    return {
      getBoundingClientRect: () => ({
        left,
        top,
        width: w,
        height: h,
        right: left + w,
        bottom: top + h,
      }),
    } as unknown as HTMLElement;
  }

  function mockMouse(clientX: number, clientY: number): MouseEvent {
    return { clientX, clientY } as unknown as MouseEvent;
  }

  it("300×300 左上角 → (0, 0)", () => {
    const p = mouseToSvgPoint(mockMouse(0, 0), mockEl(0, 0, 300, 300));
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
  });
  it("300×300 中心 → (50, 50)", () => {
    const p = mouseToSvgPoint(mockMouse(150, 150), mockEl(0, 0, 300, 300));
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(50);
  });
  it("300×300 右下角 → (100, 100)", () => {
    const p = mouseToSvgPoint(mockMouse(300, 300), mockEl(0, 0, 300, 300));
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(100);
  });
  it("元素不在原点偏移时正确映射", () => {
    // 元素位于 (100, 50)，尺寸 200×200
    const p = mouseToSvgPoint(mockMouse(200, 150), mockEl(100, 50, 200, 200));
    expect(p.x).toBeCloseTo(50); // ((200-100)/200)*100
    expect(p.y).toBeCloseTo(50); // ((150-50)/200)*100
  });
  it("鼠标在元素外部（负坐标）→ 返回负数 SVG 坐标", () => {
    const p = mouseToSvgPoint(mockMouse(-50, -50), mockEl(0, 0, 300, 300));
    expect(p.x).toBeCloseTo(-16.667, 2);
    expect(p.y).toBeCloseTo(-16.667, 2);
  });
});
