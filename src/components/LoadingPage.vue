<script setup lang="ts">
/**
 * 加载页
 * MigrationApi.checkAll() 检查状态：
 *   - 有迁移 → goto migration
 *   - 无迁移 → buildAndRegister + goto ready
 */
import { onMounted } from "vue";
import { Effect } from "effect";
import { MigrationApi } from "@/effect";
import { useDatabaseManager } from "@/utils/databases";

const emit = defineEmits<{
  goto: [phase: "migration" | "ready"];
}>();

const manager = useDatabaseManager();

onMounted(async () => {
  try {
    const summary = await Effect.runPromise(MigrationApi.checkAll());
    if (summary.hasPending) {
      emit("goto", "migration");
    } else {
      manager.buildAndRegister();
      emit("goto", "ready");
    }
  } catch (error) {
    console.error("[loading] 数据库初始化失败:", error);
    throw error;
  }
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"
  >
    <div class="mb-6">
      <div
        class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"
      ></div>
    </div>
    <p class="text-lg text-slate-600">正在初始化...</p>
  </div>
</template>
