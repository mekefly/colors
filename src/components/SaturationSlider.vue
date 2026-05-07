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

// 计算饱和度值 (0-100)
const saturation = computed({
  get: () => {
    const hsv = currentColor.value.toHsv();
    return hsv.s;
  },
  set: (value: number) => {
    const hsv = currentColor.value.toHsv();
    const newColor = colord({ h: hsv.h, s: value, v: hsv.v });
    emit("update:modelValue", newColor.toHex());
  },
});

// 计算渐变背景
const gradient = computed(() => {
  const hsv = currentColor.value.toHsv();
  const start = colord({ ...hsv, s: 0 }).toHslString();
  const end = colord({ ...hsv, s: 100 }).toHslString();
  return `linear-gradient(to right, ${start}, ${end})`;
});
</script>

<template>
  <Slider v-model="saturation" :min="0" :max="100" :step="1" :background="gradient" />
</template>
