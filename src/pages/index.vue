<script setup lang="ts">
import { computed } from "vue";
import { ref } from "vue";
import ColorFormats from "@/components/ColorFormats.vue";
import ColorWheel from "@/components/ColorWheel.vue";
import HarmonyColors from "@/components/HarmonyColors.vue";
import SaturationSlider from "@/components/SaturationSlider.vue";
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
  <div class="grid grid-cols-12 gap-6">
    <!-- 色轮和滑块 -->
    <div class="col-span-6 space-y-6">
      <div class="rounded-2xl bg-white p-6 shadow-lg">
        <div class="mb-6 flex justify-center">
          <ColorWheel v-model="currentColor" />
        </div>
        <div class="space-y-4">
          <SaturationSlider v-model="currentColor" />
          <ValueSlider v-model="currentColor" />
        </div>
      </div>
    </div>

    <!-- 和谐色 -->
    <div class="col-span-6">
      <div class="rounded-2xl bg-white p-6 shadow-lg">
        <HarmonyColors :color="currentColor" />
      </div>
    </div>
    <!-- 颜色格式显示 -->
    <div class="col-span-6">
      <div class="rounded-2xl bg-white p-6 shadow-lg">
        <ColorFormats v-model="currentColor" />
      </div>
    </div>
    <!-- 操作栏 -->
    <div class="col-span-6">
      <div class="rounded-2xl bg-white p-6 shadow-lg">
        <div class="flex items-center space-x-4">
          <label class="flex cursor-pointer items-center space-x-2">
            <input
              :value="config.removeHash"
              @input="($event: any) => config.$patch({ removeHash: $event.target.checked })"
              type="checkbox"
              class="rounded text-blue-600"
            />
            <span class="text-sm text-gray-700">色值去 "#"</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
