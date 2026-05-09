<script setup lang="ts">
import { useCurrentColor } from "@/utils/current-color";
const currentColorStore = useCurrentColor();
</script>
<template>
  <div
    class="flex h-full w-full flex-1 flex-col items-center justify-center rounded-2xl p-6 shadow-lg"
    :style="{
      backgroundColor: currentColorStore.currentColor.toHex(),
      color: currentColorStore.currentColor.isDark() ? '#FFFFFF' : '#000000',
    }"
  >
    <div class="w-full transition-colors duration-500 ease-in-out">
      <slot></slot>
    </div>
  </div>
</template>
