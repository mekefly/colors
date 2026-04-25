<script setup lang="ts">
import { colord } from "colord";
import { computed } from "vue";
import { copyColor } from "@/utils/copy";
import { showError, showSuccess } from "@/utils/notification";
import ColorFormat from "./ColorFormat.vue";

let color = defineModel<string>();
let col = computed({
  get: () => colord(color.value),
  set: (v) => {
    color.value = v.toHex();
  },
});

const formats = ["hex", "rgb", "hsv/hsb", "hsl"] as const;
</script>

<template>
  <div class="space-y-3">
    <!-- HEX -->
    <ColorFormat v-for="format in formats" :key="format" :flag="format" v-model="col"></ColorFormat>
  </div>
</template>
