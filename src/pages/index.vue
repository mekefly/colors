<script setup lang="ts">
import { computed, effect, onDeactivated, watch } from "vue";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Card from "@/components/Card.vue";
import ColorFormats from "@/components/ColorFormats.vue";
import ColorWheel from "@/components/ColorWheel.vue";
import Config from "@/components/Config.vue";
import HarmonyColors from "@/components/HarmonyColors.vue";
import HSLSliders from "@/components/HSLSliders.vue";
import HueSlider from "@/components/HueSlider.vue";
import RGBSliders from "@/components/RGBSliders.vue";
import SaturationSlider from "@/components/SaturationSlider.vue";
import Space from "@/components/Space.vue";
import ValueSlider from "@/components/ValueSlider.vue";
import { useCurrentColor } from "../use";
import { resolvePicker } from "../use/use-color-picker";

const currentColorStore = useCurrentColor();
const currentColor = computed({
  get: () => currentColorStore.currentColor,
  set: (value) => currentColorStore.setCurrentColor(value),
});

const route = useRoute();
const router = useRouter();

// ── 取色器模式 ──
// 当 URL 含 ?picker=xxx 时，当前页面作为外部取色器使用
const isPickerMode = computed(() => !!route.query.picker);
const sourceId = computed(() => (route.query.picker as string) ?? "");
const returnTo = computed(() => (route.query.returnTo as string) ?? "/");
const presetColor = computed(() => {
  const c = route.query.c as string | undefined;
  return c ? `#${c}` : undefined;
});

// 预填颜色（取色器打开时设置 initialColor）
watch(presetColor, (presetColor) => {
  if (presetColor) {
    currentColorStore.setCurrentColor(presetColor);
  }
});

/** 确认选择并返回调用页 */
function confirmAndBack() {
  resolvePicker(currentColor.value);
  router.replace(returnTo.value);
}

/** 取消选择并返回调用页 */
function cancelAndBack() {
  resolvePicker(null);
  router.replace(returnTo.value);
}

/** 用户直接导航离开（未点确认/取消）→ 视为取消 */
onDeactivated(() => {
  if (isPickerMode.value) {
    resolvePicker(null);
  }
});
</script>
<template>
  <!-- ── 取色器模式：顶部操作栏 ── -->
  <div
    v-if="isPickerMode"
    class="mb-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
  >
    <button
      @click="cancelAndBack"
      class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5m7-7l-7 7 7 7" />
      </svg>
      返回
    </button>
    <span class="text-sm text-gray-400">{{ sourceId }}</span>
    <button
      @click="confirmAndBack"
      class="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600"
    >
      确认
    </button>
  </div>

  <!-- 取色器页面 -->
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    <!-- 色轮和滑块 -->
    <Space>
      <Card>
        <div class="mb-6 flex justify-center">
          <ColorWheel v-model="currentColor" />
        </div>
        <div class="space-y-4">
          <HueSlider v-model="currentColor" />
          <SaturationSlider v-model="currentColor" />
          <ValueSlider v-model="currentColor" />
        </div>
      </Card>
    </Space>

    <!-- 和谐色 -->
    <Space>
      <Card>
        <HarmonyColors :color="currentColor" />
      </Card>
    </Space>
    <!-- RGB 滑块 -->
    <Space>
      <Card title="RGB">
        <RGBSliders v-model="currentColor" />
      </Card>
      <Card title="HSL">
        <HSLSliders v-model="currentColor" />
      </Card>
    </Space>

    <!-- 颜色格式显示 -->
    <Space>
      <Card>
        <ColorFormats v-model="currentColor" />
      </Card>
    </Space>

    <!-- 操作栏 -->
    <Space>
      <Card title="选项">
        <Config />
      </Card>
    </Space>
  </div>
</template>
