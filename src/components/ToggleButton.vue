<script lang="ts" setup>
import { computed } from "vue";

interface Props {
  modelValue: boolean;
  backgroundColor?: string;
}

import { useCurrentColor } from "@/utils/current-color";

const currentColorStore = useCurrentColor();

const props = withDefaults(defineProps<Props>(), {
  backgroundColor: "currentColor",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const toggle = () => {
  emit("update:modelValue", !props.modelValue);
};

const bgColorStyle = computed(() => {
  // 如果是颜色值（以 # 开头或包含 rgb/hsl），直接使用
  if (props.backgroundColor.startsWith("#") || props.backgroundColor.includes("(")) {
    return { backgroundColor: props.backgroundColor };
  }
  // 否则作为 CSS 变量或关键字使用
  return {};
});

const bgColorClass = computed(() => {
  if (props.backgroundColor.startsWith("#") || props.backgroundColor.includes("(")) {
    return "";
  }
  return `bg-[color:${props.backgroundColor}]`;
});
</script>

<template>
  <button
    type="button"
    :class="['relative h-6 w-11 rounded-full p-0 outline outline-[color:currentColor]']"
    :style="{ backgroundColor: currentColorStore.currentColor.toHex() }"
    @click="toggle"
  >
    <span
      :class="[
        'absolute top-0.5 left-0.5 h-5 w-5 translate-y-[0.5px] rounded-full bg-[color:currentColor] transition-transform',
        modelValue ? 'translate-x-5' : 'translate-x-0',
      ]"
    />
  </button>
</template>
