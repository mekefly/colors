<script setup lang="ts">
import { colord } from "colord";
import { computed } from "vue";
import Slider from "@/components/Slider.vue";

interface Props {
  modelValue: string;
}

const props = defineProps<Props>();
const emit = defineEmits(["update:modelValue"]);

const currentColor = computed(() => colord(props.modelValue));

// 计算明度值 (0-100)
const value = computed({
  get: () => {
    const hsv = currentColor.value.toHsv();
    return hsv.v;
  },
  set: (val: number) => {
    const hsv = currentColor.value.toHsv();
    const newColor = colord({ h: hsv.h, s: hsv.s, v: val });
    emit("update:modelValue", newColor.toHex());
  },
});

// 计算渐变背景
const gradient = computed(() => {
  const hsv = currentColor.value.toHsv();
  const start = colord({ ...hsv, v: 0 }).toHslString();
  const end = colord({ ...hsv, v: 100 }).toHslString();
  return `linear-gradient(to right, ${start}, ${end})`;
});
</script>

<template>
  <Slider v-model="value" :min="0" :max="100" :step="1" :background="gradient" />
</template>
