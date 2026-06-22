<script setup lang="ts">
import { colord } from "colord";
import { useFavoritesStore } from "@/use/use-favorites-store";
import { useMessage } from "../use";
import {
  ARROW_HEAD_ANGLE,
  ARROW_HEAD_LEN,
  ARROW_HEAD_STROKE,
  ARROW_STROKE,
  DOT_SIZE,
} from "../use/gradient";
import {
  useGradientAngle,
  useGradientArrow,
  useGradientCss,
  useGradientDotDrag,
  useGradientGeometry,
  useGradientPreview,
  useGradientStops,
} from "../use/gradient-ui";
import { useColorPicker } from "../use/use-color-picker";

const { addFavorite } = useFavoritesStore();
const message = useMessage();

// ── 预览容器尺寸追踪 ──
const { previewRef } = useGradientPreview();

// ── 渐变方向/角度 ──
const { angle, safeAngle, directionCSS, setAngle, presets } = useGradientAngle();

// ── 方向箭头拖拽 ──
const { onArrowDragStart } = useGradientArrow(previewRef, angle);

// ── 色标增删改 ──
const { colorStops, addStop, removeStop, updatePosition, updateColor } = useGradientStops(message);

// ── CSS 渐变字符串（含角度补偿修正） ──
const { previewStops, currentGradient, gradientCSS } = useGradientCss(colorStops, safeAngle);

// ── 箭头/轨道/圆点 SVG 坐标 ──
const { arrowStart, arrowEnd, dotTrackStart, dotTrackEnd, dotPositions } = useGradientGeometry(
  safeAngle,
  colorStops,
);

// ── 色标圆点拖拽 ──
const { draggingStopIdx, onDotDragStart } = useGradientDotDrag(
  previewRef,
  colorStops,
  dotTrackStart,
  dotTrackEnd,
);

// ── 通用取色器（点击横排色块进入取色器页面） ──
const { pickColor } = useColorPicker("gradient");

/** 点击横排颜色块 → 进入取色器页面异步选色 */
async function pickColorForIndex(index: number) {
  const current = colorStops.value[index]?.color;
  if (!current) return;
  const picked = await pickColor(colord(current));
  if (picked) updateColor(index, picked.toHex());
}

// ════════════════════════════════════════════════════════════════
//  收藏 / 复制 CSS / 重置（页面专属，不抽入 composable）
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
  colorStops.value = [
    { color: "#FF6B6B", position: 0 },
    { color: "#4ECDC4", position: 100 },
  ];
};
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
      @mousedown="onArrowDragStart"
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
          zIndex: draggingStopIdx === i ? 10 : 1,
        }"
        @mousedown.stop="onDotDragStart(i, $event)"
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
      </div>

      <!-- 横列颜色块: 每个色标一块, 点击进入取色器, hover 显示 Hex 值和删除按钮 -->
      <div class="mb-4 flex gap-2">
        <div
          v-for="(stop, index) in colorStops"
          :key="index"
          class="group relative flex h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-white shadow-sm transition-all hover:z-10 hover:scale-105 hover:shadow-md"
          :style="{ backgroundColor: stop.color }"
          @click="pickColorForIndex(index)"
        >
          <!-- Hex 值: hover 显示 -->
          <span
            class="font-mono text-[10px] font-bold text-white opacity-0 drop-shadow-md transition-opacity group-hover:opacity-100"
          >
            {{ stop.color }}
          </span>
          <!-- 删除按钮: hover 显示, 右上角, 至少 3 个色标时才可删除 -->
          <button
            v-if="colorStops.length > 2"
            class="absolute -top-4 -right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold text-gray-500 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white"
            @click.stop="removeStop(index)"
            title="删除色标"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            >
              <path stroke-linecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <!-- 末尾的 "+" 添加按钮 -->
        <div
          v-if="colorStops.length < 8"
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
