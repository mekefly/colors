<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ColorFormats from "./components/ColorFormats.vue";
import ColorSlider from "./components/ColorSlider.vue";
import ColorWheel from "./components/ColorWheel.vue";
import HarmonyColors from "./components/HarmonyColors.vue";
import ProvideMessage from "./components/ProvideMessage.vue";
import { useCounterStore } from "./utils/config";
import { copyColor } from "./utils/copy";
import zToolsApi from "./utils/ztoolsapi";

const config = useCounterStore();
const thereIsNoZToolsApiAvailable = !zToolsApi;
const currentColor = ref("#FFFFFF");

const currentColorNotHash = computed(() =>
  currentColor.value.startsWith("#") ? currentColor.value.substring(1) : currentColor.value,
);
let isColorRemovalHash = ref(false);
let clickCopyColor = () => {
  if (isColorRemovalHash.value) {
    copyColor(currentColorNotHash.value);
  } else {
    copyColor(currentColor.value);
  }
};
</script>

<template>
  <div v-if="thereIsNoZToolsApiAvailable">
    <div class="flex h-screen flex-col items-center justify-center">
      <p class="text-2xl font-semibold text-gray-800">颜色助手</p>
      <p class="text-gray-600">请使用 ZTools 打开此页面</p>
      <a class="text-blue-600 hover:underline" href="https://ztoolscenter.github.io/ZTools-doc/"
        >您可以查看开发者文档了解更多内容</a
      >
    </div>
  </div>
  <div v-else class="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
    <!-- 主要内容区域 -->
    <div class="mx-auto grid max-w-7xl grid-cols-12 gap-6 p-6">
      <!-- 左侧：色轮和滑块 -->
      <div class="col-span-6 space-y-6">
        <div class="rounded-2xl bg-white p-6 shadow-lg">
          <div class="mb-6 flex justify-center">
            <ColorWheel v-model="currentColor" />
          </div>
          <div class="space-y-4">
            <ColorSlider v-model="currentColor" type="saturation" />
            <ColorSlider v-model="currentColor" type="value" />
          </div>
        </div>
      </div>

      <!-- 右侧：和谐色 -->
      <div class="col-span-6">
        <div class="rounded-2xl bg-white p-6 shadow-lg">
          <HarmonyColors :color="currentColor" />
        </div>
      </div>
      <!-- 中间：颜色格式显示 -->
      <div class="col-span-6">
        <div class="rounded-2xl bg-white p-6 shadow-lg">
          <ColorFormats v-model="currentColor" />
        </div>
      </div>
      <!-- 底部操作栏 -->
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

    <!-- 消息通知组件 -->
    <ProvideMessage />
  </div>
</template>

<style scoped></style>
