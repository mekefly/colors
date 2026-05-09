<script lang="ts" setup>
import { useConfigStore } from "@/utils/config";
import { useCurrentColor } from "@/utils/current-color";

const currentColorStore = useCurrentColor();
const config = useConfigStore();
</script>
<template>
  <div class="flex flex-col space-y-4">
    <label class="flex cursor-pointer items-center space-x-2">
      <input
        :value="config.removeHash"
        @input="($event: any) => config.$patch({ removeHash: $event.target.checked })"
        type="checkbox"
        class="rounded text-blue-600"
      />
      <span class="text-sm">色值去 "#"</span>
    </label>

    <div class="flex items-center space-x-3">
      <label for="colorFormat" class="text-sm font-medium">复制格式:</label>
      <select
        id="colorFormat"
        v-model="config.format"
        class="cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm duration-0 hover:shadow-md focus:ring-2 focus:outline-none"
        :style="{ background: currentColorStore.currentColor.toHex() }"
      >
        <option value="hex">HEX (#RRGGBB)</option>
        <option value="rgb">RGB (rgb(r, g, b))</option>
        <option value="hsv/hsb">HSV/HSB</option>
        <option value="hsl">HSL (hsl(h, s%, l%))</option>
        <option value="hwb">HWB</option>
        <option value="cmyk">CMYK</option>
        <option value="lab">LAB</option>
        <option value="lch">LCH</option>
        <option value="xyz">XYZ</option>
      </select>
    </div>
  </div>
</template>
