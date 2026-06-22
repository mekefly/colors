<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { colorToCSS, useFavoritesStore, type LinearGradient } from "@/use/use-favorites-store";
import type { GradientStop } from "../effect";
import { useMessage } from "../use";

const { addFavorite } = useFavoritesStore();
const message = useMessage();

// ════════════════════════════════════════════════════════════════
//  预览容器尺寸（ResizeObserver 实时追踪）
// ════════════════════════════════════════════════════════════════
// 之所以需要这个, 是因为色点位置基于 SVG viewBox 百分比 (0-100),
// 但拖拽时鼠标坐标是像素值, 需要靠容器实际宽高把像素 → 百分比。
// 没有这个, 缩放窗口后拖拽映射就偏了。

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

// ════════════════════════════════════════════════════════════════
//  渐变方向 / 角度系统
// ════════════════════════════════════════════════════════════════
// CSS 角度约定:
//   0° = 向上 (↑)   90° = 向右 (→)   180° = 向下 (↓)   270° = 向左 (←)
//   顺时针递增, +1° 就顺时针偏 1°
// 这与数学标准坐标系 (0°=向右, 逆时针递增) 不同, 所有三角计算需注意。

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

const angle = ref(90);

/** 防 NaN 的安全角度 */
const safeAngle = computed(() => {
  if (typeof angle.value !== "number" || isNaN(angle.value)) return 90;
  return angle.value;
});

/** 角度 → CSS linear-gradient 方向字符串 */
const directionCSS = computed(() => `${safeAngle.value}deg`);

const setAngle = (a: number) => {
  angle.value = a;
};

// ════════════════════════════════════════════════════════════════
//  箭头拖拽 — 鼠标位置 → 角度
// ════════════════════════════════════════════════════════════════
// 核心思路: 鼠标在圆盘上划一圈, 实时更新 angle。
//
// Math.atan2(dx, dy) 的坐标系:
//   atan2(y, x) 返回 x 轴正方向到 (x,y) 的夹角, 逆时针为正。
//   但我们想要 CSS 的 0°=↑、90°=→ 的顺时针约定。
//
// 换算: atan2(e.clientX - cx, -(e.clientY - cy))
//   - dx = clientX - cx → 水平偏移 (右为正)
//   - dy = -(clientY - cy) → 垂直偏移, 取反后 "上为正"
//   这样 atan2(dx, dy) 刚好在 0°=↑、正角度=顺时针 时给出正确的 rad。
//
// 最后 (rad * 180 / PI + 360) % 360 把负角度归一化到 0-360。

const isDraggingArrow = ref(false);

const startArrowDrag = (e: MouseEvent) => {
  isDraggingArrow.value = true;
  updateArrowAngle(e);
  document.addEventListener("mousemove", updateArrowAngle);
  document.addEventListener("mouseup", stopArrowDrag);
};

const updateArrowAngle = (e: MouseEvent) => {
  if (!isDraggingArrow.value || !previewRef.value) return;
  const rect = previewRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rad = Math.atan2(e.clientX - cx, -(e.clientY - cy));
  angle.value = Math.round((rad * 180) / Math.PI + 360) % 360;
};

const stopArrowDrag = () => {
  isDraggingArrow.value = false;
  document.removeEventListener("mousemove", updateArrowAngle);
  document.removeEventListener("mouseup", stopArrowDrag);
};

// ════════════════════════════════════════════════════════════════
//  渐变状态 (用户位置, 0-100)
// ════════════════════════════════════════════════════════════════
// position = 0% → 渐变在箭头尾部方向 (色盘边缘)
// position = 50% → 渐变在圆心
// position = 100% → 渐变在箭头头部方向 (色盘对侧边缘)

const stops = ref<GradientStop[]>([
  { color: "#FF6B6B", position: 0 },
  { color: "#4ECDC4", position: 100 },
]);

const gradientCSS = computed(() => colorToCSS(currentGradient.value));

// ════════════════════════════════════════════════════════════════
//  角度补偿 — 圆形容器中 CSS linear-gradient 的偏移修正
// ════════════════════════════════════════════════════════════════
//
// 问题现象:
//   渐变方向为 45° 时, 色标位置明显偏移, 对角方向越偏离轴越明显。
//   而 0° / 90° 完全准确。
//
// 原因追查 — CSS 渐变线长度不是"中心到边的距离":
//
//   W3C 规范规定渐变线用"垂线-角点法"(perpendicular-corner method):
//     1. 从包围盒四个角向渐变线作垂线
//     2. 最远的两个垂足分别定为起点(0%)和终点(100%)
//
//   对于正方形包围盒 (300x300) 和角度 θ:
//     渐变线半长 = W/2 × (|sinθ| + |cosθ|)
//
//   轴向 (0°)       : 半长 = 150 × 1         = 150 — 刚好等于圆形半径
//   对角 (45°)      : 半长 = 150 × 1.414     = 212 — 远大于圆形半径
//   中角 (30°/60°)  : 半长 = 150 × 1.366     = 205
//
//   而圆形可视范围半径永远 = W/2 = 150
//   → 对角方向渐变线比圆形长了约 41%, 导致色标实际位置偏移。
//
// 修正公式推导:
//
//   期望色标离圆心距离  d_user = R × (2p/100 - 1)
//                                 = (W/2) × (2p/100 - 1)
//   渐变线半长              t_half = (W/2) × (|sinθ| + |cosθ|)
//
//   圆形边缘在渐变线上的 CSS position %:
//     css_p = 50 + (d_user / t_half) × 50
//           = 50 + (p - 50) / (|sinθ| + |cosθ|)
//
//   修正因子 stretch = 1 / (|sinθ| + |cosθ|)
//   css_p = 50 + stretch × (p - 50)
//
// 验证:
//   角度  | |sin|+|cos| | stretch | 用户 0%→CSS | 用户 100%→CSS
//   ------|------------|---------|-------------|---------------
//   0°    | 1.000      | 1.000   | 0%          | 100%
//   30°   | 1.366      | 0.732   | 13.4%       | 86.6%
//   45°   | 1.414      | 0.707   | 14.6%       | 85.4%
//   60°   | 1.366      | 0.732   | 13.4%       | 86.6%
//   90°   | 1.000      | 1.000   | 0%          | 100%
//
//   → 45°压缩最多, 轴向不变, 完美对齐圆形边缘。
//
// 特别说明: 不能用 max(|sinθ|, |cosθ|) 做修正因子!
//   这个公式对应"中心到边交点法", 不是 CSS 的垂线-角点法。
//   两者在 45° 巧合一致, 但 60° 时差 18% (0.866 vs 0.732)。

const cssStops = computed(() => {
  const rad = (safeAngle.value * Math.PI) / 180;
  const stretch = 1 / (Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)));
  const correct = (p: number) => 50 + stretch * (p - 50);
  const sorted = [...stops.value].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return sorted.map((s) => ({
    color: s.color,
    position: correct(s.position ?? 0),
  }));
});

/** 修正后的预览 CSS 渐变字符串 */
const previewStops = computed(() => {
  return cssStops.value.map((s) => `${s.color} ${s.position}%`).join(", ");
});

/** 带修正的 currentGradient（用于 CSS 复制 → colorToCSS 输出） */
const currentGradient = computed<LinearGradient>(() => ({
  type: "linear-gradient",
  direction: directionCSS.value,
  stops: cssStops.value,
}));

// ════════════════════════════════════════════════════════════════
//  视觉参数（改这里即可控制所有形状大小）
// ════════════════════════════════════════════════════════════════

/** 色点直径（px）—— 箭头粗细自动 = 该值 × 0.618（黄金比） */
const DOT_SIZE = 30;

/** 色点轨道半径（SVG viewBox 0-100 坐标系, 50=色盘边缘） */
const DOT_TRACK_R = 50;

/** 箭头伸出圆盘的长度增量（SVG 坐标） */
const ARROW_EXTRA = 20;

/** 箭头三角形张开角度（度）—— 左右各张开多少 */
const ARROW_HEAD_ANGLE = 28;
/** 箭头三角形边长（SVG 坐标） */
const ARROW_HEAD_LEN = 15;
/** 箭头三角描边粗（SVG 坐标） */
const ARROW_HEAD_STROKE = 1.5;

// 衍生常量（自动计算, 不用改）
const ARROW_VISUAL_R = DOT_TRACK_R + ARROW_EXTRA;
const ARROW_STROKE = (DOT_SIZE * 0.618) / 3; // 除以 3 是因为 SVG viewBox 100 → 300px 缩放比

// ════════════════════════════════════════════════════════════════
//  箭头端点 + 色点轨道（SVG 坐标系 0-100）
// ════════════════════════════════════════════════════════════════
// SVG viewBox="0 0 100 100" → 可视区 300×300px, 1 SVG 单位 = 3px
// 圆心在 (50, 50)
//
// 方向向量: (sinθ, -cosθ)  （θ 是 CSS 角度: 0°↑, 90°→）
//   0°:  (0, -1) → 向上
//   90°: (1, 0)  → 向右
//   180°:(0, 1)  → 向下
//
// 端点计算:
//   起点 (箭头尾部, = 渐变起点 0%)   = 圆心 - 方向 × R
//   终点 (箭头头部, = 渐变终点 100%) = 圆心 + 方向 × R

/** 箭头视觉起点（超出色盘） */
const arrowStart = computed(() => {
  const rad = (safeAngle.value * Math.PI) / 180;
  return {
    x: 50 - Math.sin(rad) * ARROW_VISUAL_R,
    y: 50 + Math.cos(rad) * ARROW_VISUAL_R,
  };
});

/** 箭头视觉终点（超出色盘） */
const arrowEnd = computed(() => {
  const rad = (safeAngle.value * Math.PI) / 180;
  return {
    x: 50 + Math.sin(rad) * ARROW_VISUAL_R,
    y: 50 - Math.cos(rad) * ARROW_VISUAL_R,
  };
});

/** 色点轨道起点（贴合色盘边缘） */
const dotTrackStart = computed(() => {
  const rad = (safeAngle.value * Math.PI) / 180;
  return {
    x: 50 - Math.sin(rad) * DOT_TRACK_R,
    y: 50 + Math.cos(rad) * DOT_TRACK_R,
  };
});

/** 色点轨道终点（贴合色盘对侧边缘） */
const dotTrackEnd = computed(() => {
  const rad = (safeAngle.value * Math.PI) / 180;
  return {
    x: 50 + Math.sin(rad) * DOT_TRACK_R,
    y: 50 - Math.cos(rad) * DOT_TRACK_R,
  };
});

// ════════════════════════════════════════════════════════════════
//  色标圆点位置 — 用户 position% → SVG 百分比坐标
// ════════════════════════════════════════════════════════════════
// 线性插值: 从轨道起点到终点, 以 position/100 为参数 t。
// t=0 → 起点 (色盘边缘, 渐变 0%)
// t=0.5 → 圆心 (渐变 50%)
// t=1 → 终点 (色盘对侧边缘, 渐变 100%)

interface DotPos {
  x: number;
  y: number;
  color: string;
  position: number;
}

const dotPositions = computed<DotPos[]>(() => {
  const s = dotTrackStart.value;
  const e = dotTrackEnd.value;
  return [...stops.value]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((stop) => {
      const p = (stop.position ?? 0) / 100;
      return {
        x: s.x + (e.x - s.x) * p,
        y: s.y + (e.y - s.y) * p,
        color: stop.color,
        position: stop.position ?? 0,
      };
    });
});

// ════════════════════════════════════════════════════════════════
//  色标拖拽 — 鼠标位置 → 轨道上的 position%
// ════════════════════════════════════════════════════════════════
// 核心思路: 把鼠标投影到轨道线段上, t = (向量投影) / (线段长度²)
//
//   投影公式: t = dot(鼠标 - 起点, 方向向量) / dot(方向向量, 方向向量)
//   其中 方向向量 = 终点 - 起点
//
// 因为轨道是色盘直径, 所以鼠标投影到这条线上的比值 t (0~1)
// 直接对应 position% = t × 100。

const draggingStop = ref<number | null>(null);

const startStopDrag = (index: number, e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  draggingStop.value = index;
  document.addEventListener("mousemove", onStopDrag);
  document.addEventListener("mouseup", stopStopDrag);
};

const onStopDrag = (e: MouseEvent) => {
  if (draggingStop.value === null || !previewRef.value) return;
  const rect = previewRef.value.getBoundingClientRect();

  // 鼠标在 SVG 0-100 坐标系中的位置
  const mx = ((e.clientX - rect.left) / rect.width) * 100;
  const my = ((e.clientY - rect.top) / rect.height) * 100;

  const s = dotTrackStart.value;
  const e2 = dotTrackEnd.value;
  const dx = e2.x - s.x;
  const dy = e2.y - s.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 0.001) return; // 零线段, 跳过

  // 向量投影: t = dot(鼠标-起点, 方向) / |方向|²
  // 原理: 从起点到鼠标的向量, 在方向向量上的投影比例
  let t = ((mx - s.x) * dx + (my - s.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t)); // 限制在 0-1 之间
  stops.value[draggingStop.value].position = Math.round(t * 100);
};

const stopStopDrag = () => {
  draggingStop.value = null;
  document.removeEventListener("mousemove", onStopDrag);
  document.removeEventListener("mouseup", stopStopDrag);
};

// ════════════════════════════════════════════════════════════════
//  色标操作 — 增删改
// ════════════════════════════════════════════════════════════════

const addStop = () => {
  if (stops.value.length >= 8) {
    message.warning("最多支持 8 个色标");
    return;
  }
  // 在两个已有色标之间找最大的空隙, 插入中点
  const sorted = [...stops.value].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  let newPos = 50;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]?.position ?? 0;
    const b = sorted[i + 1]?.position ?? 0;
    if (b - a >= 2) {
      newPos = Math.round((a + b) / 2);
      break;
    }
  }
  // 新色标的颜色取相邻色标的颜色
  const mixIndex = sorted.findIndex((s) => (s.position ?? 0) >= newPos);
  const mixColor = mixIndex >= 0 ? (sorted[mixIndex]?.color ?? "#888888") : "#888888";
  stops.value.push({ color: mixColor, position: newPos });
};

const removeStop = (index: number) => {
  if (stops.value.length <= 2) {
    message.warning("至少需要 2 个色标");
    return;
  }
  stops.value.splice(index, 1);
};

const updatePosition = (index: number, pos: number) => {
  if (!stops.value[index]) return;
  stops.value[index].position = pos;
};

const updateColor = (index: number, color: string) => {
  if (!stops.value[index]) return;
  stops.value[index].color = color;
};

// ════════════════════════════════════════════════════════════════
//  收藏 / 复制 CSS / 重置
// ════════════════════════════════════════════════════════════════

const addToFavorites = () => {
  try {
    addFavorite(currentGradient.value);
    message.success("已添加到收藏");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "添加失败");
  }
};

const copyCSS = async () => {
  try {
    await navigator.clipboard.writeText(gradientCSS.value);
    message.success("已复制 CSS");
  } catch {
    message.error("复制失败");
  }
};

const reset = () => {
  angle.value = 90;
  stops.value = [
    { color: "#FF6B6B", position: 0 },
    { color: "#4ECDC4", position: 100 },
  ];
};

/** 组件卸载时清理全局事件, 防止内存泄漏 */
onUnmounted(() => {
  document.removeEventListener("mousemove", updateArrowAngle);
  document.removeEventListener("mouseup", stopArrowDrag);
  document.removeEventListener("mousemove", onStopDrag);
  document.removeEventListener("mouseup", stopStopDrag);
});
</script>

<template>
  <div class="space-y-6 select-none">
    <!-- ═══════ 圆形渐变预览 + 方向箭头 + 色点 ═══════ -->
    <div
      ref="previewRef"
      class="relative mx-auto h-[300px] w-[300px] overflow-visible rounded-full shadow-lg ring-2 ring-gray-300"
      :style="{
        background: `linear-gradient(${directionCSS}, ${previewStops})`,
      }"
      @mousedown="startArrowDrag"
    >
      <!-- ──── 方向箭头 (SVG 覆盖层) ──── -->
      <!--
        SVG viewBox="0 0 100 100": 逻辑坐标 0-100, 映射到 300×300px。
        preserveAspectRatio="none": 让坐标系拉伸填满——因为容器是正方形,
        所以不影响宽高比。 overflow: visible 让超出 viewBox 的箭头也能渲染。
      -->
      <svg
        class="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style="overflow: visible"
      >
        <!-- 箭头杆: 从起点到终点, 但末端缩回三角形底部以免泄漏 -->
        <!--
          缩回距离 = ARROW_HEAD_LEN × 0.57:
            三角形底边半宽 / 边长 = sin(ARROW_HEAD_ANGLE) ≈ 0.47
            但需要留出 stroke-linecap 的圆头余量, 取略大值 0.57。
            这样线头刚好被三角形盖住, 不露出尖端。
        -->
        <line
          :x1="arrowStart.x"
          :y1="arrowStart.y"
          :x2="arrowEnd.x - Math.sin((safeAngle * Math.PI) / 180) * ARROW_HEAD_LEN * 0.57"
          :y2="arrowEnd.y + Math.cos((safeAngle * Math.PI) / 180) * ARROW_HEAD_LEN * 0.57"
          stroke="#333"
          :stroke-width="ARROW_STROKE"
          stroke-linecap="round"
        />
        <!-- 箭头三角形: 以终点为顶点, 向两侧张开 ARROW_HEAD_ANGLE 度 -->
        <!--
          三角形三个顶点:
            V1 = 箭头终点 (箭头顶端)
            V2 = 终点 - 方向旋转(-ANGLE) × 边长
            V3 = 终点 - 方向旋转(+ANGLE) × 边长
          stroke-linejoin="round" 使三角尖角变圆润
        -->
        <polygon
          :points="`${arrowEnd.x},${arrowEnd.y} ${
            arrowEnd.x - Math.sin(((safeAngle - ARROW_HEAD_ANGLE) * Math.PI) / 180) * ARROW_HEAD_LEN
          },${arrowEnd.y + Math.cos(((safeAngle - ARROW_HEAD_ANGLE) * Math.PI) / 180) * ARROW_HEAD_LEN} ${
            arrowEnd.x - Math.sin(((safeAngle + ARROW_HEAD_ANGLE) * Math.PI) / 180) * ARROW_HEAD_LEN
          },${arrowEnd.y + Math.cos(((safeAngle + ARROW_HEAD_ANGLE) * Math.PI) / 180) * ARROW_HEAD_LEN}`"
          fill="#333"
          stroke="#333"
          :stroke-width="ARROW_HEAD_STROKE"
          stroke-linejoin="round"
        />
      </svg>

      <!-- ──── 色标圆点 ──── -->
      <!--
        双层 div 设计原因: Transform 冲突规避
        外层 div:
          - position: absolute 定位到 dotPositions 的计算坐标
          - transform: translate(-50%, -50%) 居中 (以圆点中心为锚点)
        内层 div:
          - hover:scale-150 缩放动效
          - outline 替代 border, 避免 border 增大 box-sizing 导致定位偏移
          （border 会占据尺寸, 使 translate(-50%) 的数学锚点偏离实际中心）
      -->
      <div
        v-for="(dot, i) in dotPositions"
        :key="i"
        class="absolute"
        :style="{
          left: `${dot.x}%`,
          top: `${dot.y}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: draggingStop === i ? 10 : 1,
        }"
        @mousedown.stop="startStopDrag(i, $event)"
      >
        <div
          class="cursor-grab rounded-full shadow-md transition-transform duration-150 hover:scale-150 active:scale-125 active:cursor-grabbing"
          :style="{
            width: DOT_SIZE + 'px',
            height: DOT_SIZE + 'px',
            backgroundColor: dot.color,
            outline: '2px solid white',
            outlineOffset: '2px',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.15)',
          }"
        />
      </div>
    </div>

    <!-- ═══════ 方向预设按钮 (8 方向) ═══════ -->
    <div class="grid grid-cols-4 gap-2 sm:grid-cols-8">
      <button
        v-for="p in presets"
        :key="p.angle"
        @click="setAngle(p.angle)"
        :class="[
          'flex h-10 items-center justify-center rounded-lg text-lg font-bold transition-all',
          angle === p.angle
            ? 'bg-blue-500 text-white shadow-md'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        ]"
        :title="`${p.title} (${p.angle}°)`"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- ═══════ 横列颜色条 + 色标详情 ═══════ -->
    <div class="rounded-xl bg-white p-5 shadow-md">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-500">色标</h3>
        <button
          @click="addStop"
          class="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" d="M12 5v14M5 12h14" />
          </svg>
          添加
        </button>
      </div>

      <!-- 横列颜色块: 每个色标一块, hover 显示 Hex 值 -->
      <div class="mb-4 flex gap-2">
        <div
          v-for="(stop, index) in stops"
          :key="index"
          class="group flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-white shadow-sm transition-all hover:scale-105 hover:shadow-md"
          :style="{ backgroundColor: stop.color }"
        >
          <span
            class="font-mono text-[10px] font-bold text-white opacity-0 drop-shadow-md transition-opacity group-hover:opacity-100"
          >
            {{ stop.color }}
          </span>
        </div>
        <!-- 末尾的 "+" 添加按钮 -->
        <div
          v-if="stops.length < 8"
          class="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
          @click="addStop"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </div>

      <!-- 色标详情列表: color picker + Hex输入 + 位置滑块 + 删除 -->
      <div class="space-y-2">
        <div
          v-for="(stop, index) in stops"
          :key="index"
          class="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5"
        >
          <input
            type="color"
            :value="stop.color"
            @input="updateColor(index, ($event.target as HTMLInputElement).value)"
            class="h-8 w-8 cursor-pointer rounded-lg border-0 p-0"
          />
          <input
            :value="stop.color"
            @input="updateColor(index, ($event.target as HTMLInputElement).value)"
            class="w-20 rounded-lg border border-gray-200 px-2 py-1 font-mono text-xs uppercase focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
            maxlength="7"
            spellcheck="false"
          />
          <div class="flex flex-1 items-center gap-2">
            <input
              type="range"
              :value="stop.position ?? 0"
              @input="updatePosition(index, Number(($event.target as HTMLInputElement).value))"
              min="0"
              max="100"
              class="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-500"
            />
            <span class="w-10 text-right text-xs text-gray-500">{{ stop.position ?? 0 }}%</span>
          </div>
          <button
            @click="removeStop(index)"
            :disabled="stops.length <= 2"
            :class="[
              'flex h-6 w-6 items-center justify-center rounded-lg transition-colors',
              stops.length <= 2
                ? 'cursor-not-allowed text-gray-300'
                : 'text-gray-400 hover:bg-red-50 hover:text-red-500',
            ]"
            title="删除色标"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ CSS 输出 + 操作按钮 ═══════ -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="rounded-xl bg-white p-5 shadow-md">
        <h3 class="mb-3 text-sm font-semibold text-gray-500">CSS</h3>
        <div
          class="cursor-pointer rounded-lg bg-gray-50 p-4 font-mono text-sm text-gray-700 transition-colors hover:bg-gray-100"
          @click="copyCSS"
          title="点击复制"
        >
          {{ gradientCSS }}
        </div>
        <p class="mt-2 text-xs text-gray-400">点击复制 CSS 代码</p>
      </div>

      <div class="rounded-xl bg-white p-5 shadow-md">
        <h3 class="mb-3 text-sm font-semibold text-gray-500">操作</h3>
        <div class="space-y-3">
          <button
            @click="addToFavorites"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 px-4 py-3 text-white shadow-md transition-all hover:from-pink-600 hover:to-red-600 hover:shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span class="font-medium">收藏渐变</span>
          </button>
          <button
            @click="copyCSS"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <span class="text-sm">复制 CSS</span>
          </button>
          <button
            @click="reset"
            class="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span class="text-sm">重置</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
