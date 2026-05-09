<script setup lang="ts">
import { computed } from "vue";
import { ref } from "vue";
import Card from "@/components/Card.vue";
import ColorFormats from "@/components/ColorFormats.vue";
import ColorWheel from "@/components/ColorWheel.vue";
import HarmonyColors from "@/components/HarmonyColors.vue";
import HSLSliders from "@/components/HSLSliders.vue";
import HueSlider from "@/components/HueSlider.vue";
import RGBSliders from "@/components/RGBSliders.vue";
import SaturationSlider from "@/components/SaturationSlider.vue";
import Space from "@/components/Space.vue";
import ValueSlider from "@/components/ValueSlider.vue";
import { useCounterStore } from "@/utils/config";
import { useCurrentColor } from "@/utils/current-color";

const currentColorStore = useCurrentColor();
const currentColor = computed({
  get: () => currentColorStore.currentColor,
  set: (value) => currentColorStore.setCurrentColor(value),
});
const config = useCounterStore();
</script>
<template>
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
      <Card>
        <h3 class="mb-4 text-lg font-semibold">RGB 滑块</h3>
        <RGBSliders v-model="currentColor" />
      </Card>
      <Card>
        <h3 class="mb-4 text-lg font-semibold">HSL 滑块</h3>
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
      <Card>
        <div class="flex items-center space-x-4">
          <label class="flex cursor-pointer items-center space-x-2">
            <input
              :value="config.removeHash"
              @input="($event: any) => config.$patch({ removeHash: $event.target.checked })"
              type="checkbox"
              class="rounded text-blue-600"
            />
            <span class="text-sm">色值去 "#"</span>
          </label>
        </div>
      </Card>
    </Space>
  </div>
</template>
