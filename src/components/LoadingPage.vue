<script setup lang="ts">
/**
 * 加载页
 * 调用 initDatabases() 检查状态：
 *   - 需要处理 → goto migration
 *   - 不需要 → build + goto ready
 */
import { onMounted } from "vue";
import { initDatabases } from "@/utils/databases";

const emit = defineEmits<{
  goto: [phase: "migration" | "ready"];
}>();

onMounted(() => {
  try {
    const dbs = initDatabases();

    if (dbs.needsAction) {
      emit("goto", "migration");
    } else {
      dbs.build();
      emit("goto", "ready");
    }
  } catch (error) {
    console.error("[loading] 数据库初始化失败:", error);
    throw error;
  }
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
    <div class="mb-6">
      <div class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
    </div>
    <p class="text-lg text-slate-600">正在初始化...</p>
  </div>
</template>
