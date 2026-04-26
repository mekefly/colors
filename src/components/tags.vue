<script setup lang="ts">
interface Props {
  tags: string[];
}

let props = defineProps<Props>();
</script>
<template>
  <div class="flex min-h-[28px] flex-wrap gap-1.5">
    <span
      v-for="tag in tags"
      :key="tag"
      class="inline-flex items-center rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-1 text-xs font-medium text-blue-700 shadow-sm transition-all hover:from-blue-100 hover:to-indigo-100 hover:shadow-md"
    >
      {{ tag }}
    </span>
  </div>
</template>
