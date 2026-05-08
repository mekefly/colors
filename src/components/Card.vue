<script setup lang="ts">
import { useCurrentColor } from "@/utils/current-color";
const currentColorStore = useCurrentColor();
</script>
<template>
  <div class="col-span-6 space-y-6">
    <div
      class="rounded-2xl bg-white p-6 shadow-lg transition-colors duration-500 ease-in-out"
      :style="{
        backgroundColor: currentColorStore.currentColor.toHex(),
        color: currentColorStore.currentColor.isDark() ? '#FFFFFF' : '#000000',
      }"
    >
      <slot></slot>
    </div>
  </div>
</template>
