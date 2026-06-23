// ════════════════════════════════════════════════════════════════
//  UI Composable — 渐变页面的响应式逻辑
//  与 gradient.ts（纯函数）分开，避免测试级联加载 vue/effect
// ════════════════════════════════════════════════════════════════

import { Colord, colord } from "colord";
import { computed, onMounted, onUnmounted, reactive, ref, type ComputedRef, type Ref } from "vue";
import type { GradientStop } from "@/effect";
import { colorToCSS, type LinearGradient } from "@/use/use-favorites-store";
import { id, randomColor, randomGradientPair } from "@/utils";
import {
  correctStopPos,
  findBestInsertionPoint,
  mapRange,
  mouseToCssAngle,
  mouseToSvgPoint,
  pointOnRay,
  projectOnSegment,
  stretchFactor,
  ARROW_VISUAL_R,
  DOT_TRACK_R,
  MAX_STOPS,
} from "./gradient";

// ════════════════════════════════════════════════════════════════
//  类型
// ════════════════════════════════════════════════════════════════

export interface DotPos {
  x: number;
  y: number;
  color: string;
  position: number;
  id: string;
}

export interface UseMessage {
  warning(msg: string): void;
  success(msg: string): void;
  error(msg: string): void;
}

const DEFAULT_ANGLE = 45;
// ════════════════════════════════════════════════════════════════
//  useGradientAngle — 渐变方向/角度系统
// ════════════════════════════════════════════════════════════════
export function useGradientAngle() {
  const angle = ref(DEFAULT_ANGLE);

  const safeAngle = computed(() => {
    if (typeof angle.value !== "number" || isNaN(angle.value)) return DEFAULT_ANGLE;
    return angle.value;
  });

  const directionCSS = computed(() => `${safeAngle.value}deg`);

  const setAngle = (a: number) => {
    angle.value = a;
  };

  const presets = [
    { angle: 0, label: "↑", title: "向上" },
    { angle: 45, label: "↗", title: "右上" },
    { angle: 90, label: "→", title: "向右" },
    { angle: 135, label: "↘", title: "右下" },
    { angle: 180, label: "↓", title: "向下" },
    { angle: 225, label: "↙", title: "左下" },
    { angle: 270, label: "←", title: "向左" },
    { angle: 315, label: "↖", title: "左上" },
  ];
  const resetAngle = () => {
    angle.value = DEFAULT_ANGLE;
  };

  return { angle, safeAngle, directionCSS, setAngle, presets, resetAngle };
}

// ════════════════════════════════════════════════════════════════
//  useGradientPreview — 预览容器尺寸追踪
// ════════════════════════════════════════════════════════════════

export function useGradientPreview() {
  const previewRef = ref<HTMLElement>();
  const box = reactive({ w: 300, h: 300 });

  onMounted(() => {
    if (!previewRef.value) return;
    const update = () => {
      if (!previewRef.value) return;
      box.w = previewRef.value.clientWidth || 300;
      box.h = previewRef.value.clientHeight || 300;
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(previewRef.value);
  });

  return { previewRef, box };
}

// ════════════════════════════════════════════════════════════════
//  useGradientArrow — 方向箭头拖拽
// ════════════════════════════════════════════════════════════════

export function useGradientArrow(previewRef: Ref<HTMLElement | undefined>, angle: Ref<number>) {
  const isDraggingArrow = ref(false);

  const onArrowDragMove = (e: MouseEvent) => {
    if (!isDraggingArrow.value || !previewRef.value) return;
    angle.value = mouseToCssAngle(e, previewRef.value);
  };

  const onArrowDragEnd = () => {
    isDraggingArrow.value = false;
    document.removeEventListener("mousemove", onArrowDragMove);
    document.removeEventListener("mouseup", onArrowDragEnd);
  };

  const onArrowDragStart = (e: MouseEvent) => {
    isDraggingArrow.value = true;
    onArrowDragMove(e);
    document.addEventListener("mousemove", onArrowDragMove);
    document.addEventListener("mouseup", onArrowDragEnd);
  };

  onUnmounted(() => {
    document.removeEventListener("mousemove", onArrowDragMove);
    document.removeEventListener("mouseup", onArrowDragEnd);
  });

  return { isDraggingArrow, onArrowDragStart };
}

// ════════════════════════════════════════════════════════════════
//  useGradientStops — 色标增删改
// ════════════════════════════════════════════════════════════════

export interface GradientStopWithId extends GradientStop {
  id: string;
}
export function useGradientStops(message: UseMessage) {
  const colorStops = ref<GradientStopWithId[]>(randomStops());
  const sortedColorStops = computed(() =>
    colorStops.value.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  );

  const addStop = () => {
    if (colorStops.value.length >= MAX_STOPS) {
      message.warning(`最多支持 ${MAX_STOPS} 个色标`);
      return;
    }
    const newPos = findBestInsertionPoint(colorStops.value.map((s) => s.position ?? 0));
    const sorted = sortedColorStops.value;
    const rightIdx = sorted.findIndex((s) => (s.position ?? 0) >= newPos);
    const mixColor =
      rightIdx >= 0
        ? (sorted[rightIdx]?.color ?? randomColor().toHex())
        : (sorted[sorted.length - 1]?.color ?? randomColor().toHex());
    colorStops.value.push({ color: mixColor, position: newPos, id: id() });
  };

  const removeStop = (id: string) => {
    if (colorStops.value.length <= 2) {
      message.warning("至少需要 2 个色标");
      return;
    }
    const idx = colorStops.value.findIndex((s) => s.id === id);
    if (idx >= 0) colorStops.value.splice(idx, 1);
  };

  const updatePosition = (id: string, pos: number) => {
    const s = colorStops.value.find((s) => s.id === id);
    if (s) s.position = pos;
  };

  const updateColor = (id: string, color: string) => {
    const s = colorStops.value.find((s) => s.id === id);
    if (s) s.color = color;
  };

  const resetColor = () => {
    colorStops.value = randomStops();
  };

  return {
    colorStops,
    sortedColorStops,
    addStop,
    removeStop,
    updatePosition,
    updateColor,
    resetColor,
  };
}

function randomStops() {
  const [c1, c2] = randomGradientPair();
  return [
    {
      color: c1.toHex(),
      position: 0,
      id: id(),
    },
    {
      color: c2.toHex(),
      position: 100,
      id: id(),
    },
  ];
}

// ════════════════════════════════════════════════════════════════
//  useGradientCss — CSS 渐变字符串（含角度补偿修正）
// ════════════════════════════════════════════════════════════════

export function useGradientCss(colorStops: Ref<GradientStop[]>, safeAngle: ComputedRef<number>) {
  const cssStops = computed(() => {
    const stretch = stretchFactor(safeAngle.value);
    return [...colorStops.value]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((s) => ({
        color: s.color,
        position: correctStopPos(s.position ?? 0, stretch),
      }));
  });

  const previewStops = computed(() =>
    cssStops.value.map((s) => `${s.color} ${s.position}%`).join(", "),
  );

  const currentGradient = computed<LinearGradient>(() => ({
    type: "linear-gradient",
    direction: `${safeAngle.value}deg`,
    stops: cssStops.value,
  }));

  const gradientCSS = computed(() => colorToCSS(currentGradient.value));

  return { cssStops, previewStops, currentGradient, gradientCSS };
}

// ════════════════════════════════════════════════════════════════
//  useGradientGeometry — 箭头/轨道/圆点 SVG 坐标
// ════════════════════════════════════════════════════════════════

export function useGradientGeometry(
  safeAngle: ComputedRef<number>,
  colorStops: Ref<GradientStopWithId[]>,
) {
  const arrowStart = computed(() => pointOnRay(50, 50, safeAngle.value + 180, ARROW_VISUAL_R));
  const arrowEnd = computed(() => pointOnRay(50, 50, safeAngle.value, ARROW_VISUAL_R));
  const dotTrackStart = computed(() => pointOnRay(50, 50, safeAngle.value + 180, DOT_TRACK_R));
  const dotTrackEnd = computed(() => pointOnRay(50, 50, safeAngle.value, DOT_TRACK_R));

  const dotPositions = computed<DotPos[]>(() => {
    const s = dotTrackStart.value;
    const e = dotTrackEnd.value;
    return [...colorStops.value].map((stop) => {
      const position = stop.position ?? 0;
      return {
        x: mapRange(position, 0, 100, s.x, e.x),
        y: mapRange(position, 0, 100, s.y, e.y),
        color: stop.color,
        position,
        id: stop.id,
      };
    });
  });

  return { arrowStart, arrowEnd, dotTrackStart, dotTrackEnd, dotPositions };
}

// ════════════════════════════════════════════════════════════════
//  useGradientDotDrag — 色标圆点拖拽
// ════════════════════════════════════════════════════════════════

export function useGradientDotDrag(
  previewRef: Ref<HTMLElement | undefined>,
  colorStops: Ref<(GradientStop & { id: string })[]>,
  dotTrackStart: ComputedRef<{ x: number; y: number }>,
  dotTrackEnd: ComputedRef<{ x: number; y: number }>,
) {
  const draggingStopId = ref<string | null>(null);

  const onDotDragMove = (e: MouseEvent) => {
    if (draggingStopId.value === null || !previewRef.value) return;
    const mouse = mouseToSvgPoint(e, previewRef.value);
    const t = projectOnSegment(
      mouse.x,
      mouse.y,
      dotTrackStart.value.x,
      dotTrackStart.value.y,
      dotTrackEnd.value.x,
      dotTrackEnd.value.y,
    );
    const step = colorStops.value.find((s) => s.id === draggingStopId.value);
    if (!step) return;
    step.position = Math.round(t * 100);
  };

  const onDotDragEnd = () => {
    draggingStopId.value = null;
    document.removeEventListener("mousemove", onDotDragMove);
    document.removeEventListener("mouseup", onDotDragEnd);
  };

  const onDotDragStart = (id: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingStopId.value = id;
    document.addEventListener("mousemove", onDotDragMove);
    document.addEventListener("mouseup", onDotDragEnd);
  };

  onUnmounted(() => {
    document.removeEventListener("mousemove", onDotDragMove);
    document.removeEventListener("mouseup", onDotDragEnd);
  });

  return { draggingStopId, onDotDragStart };
}
