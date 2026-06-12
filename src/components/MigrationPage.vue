<script setup lang="ts">
/**
 * 数据库迁移页
 * 调用 initDatabases() 获取 pending 列表
 * 用户确认 → migrate → build → goto ready
 * 失败 → 留在当前页，显示错误，可重试
 */
import { onMounted, ref } from "vue";
import { initDatabases } from "@/utils/databases";
import type { DatabaseManager } from "@/utils/databases";

const emit = defineEmits<{
  goto: [phase: "ready"];
}>();

const manager = ref<DatabaseManager | null>(null);
const migrating = ref(false);
const error = ref<string | null>(null);

onMounted(() => {
  manager.value = initDatabases();
});

function statusLabel(status: string): string {
  switch (status) {
    case "interrupted":
      return "上次迁移中断，需要回滚";
    case "needs_migration":
      return "需要迁移";
    case "corrupted":
      return "数据损坏，需要手动处理";
    default:
      return "";
  }
}

async function handleConfirm() {
  if (!manager.value) return;
  migrating.value = true;
  error.value = null;
  try {
    await manager.value.migrate();
    manager.value.build();
    emit("goto", "ready");
  } catch (e) {
    migrating.value = false;
    error.value = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 p-5 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"
  >
    <div class="mb-6 text-5xl">🔄</div>
    <h1 class="mb-2 text-2xl font-bold text-slate-800">数据库需要更新</h1>
    <p class="mb-8 text-slate-500">检测到以下数据库需要处理，请确认后继续</p>

    <div class="mb-8 w-full max-w-md space-y-3">
      <div
        v-for="entry in manager?.pending"
        :key="entry.name"
        class="rounded-lg border px-4 py-3"
        :class="
          entry.status.status === 'corrupted'
            ? 'border-red-200 bg-red-50'
            : 'border-amber-200 bg-amber-50'
        "
      >
        <div class="flex items-center justify-between">
          <span class="font-medium text-slate-700">{{ entry.name }}</span>
          <span class="text-sm text-slate-500">
            v{{ entry.currentVersion }} → v{{ entry.targetVersion }}
          </span>
        </div>
        <div class="text-sm text-slate-500">
          {{ statusLabel(entry.status.status) }}
        </div>
      </div>
    </div>

    <div
      v-if="error"
      class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700"
    >
      处理失败: {{ error }}
    </div>

    <button
      :disabled="migrating || !!error"
      class="rounded-lg bg-indigo-600 px-8 py-3 text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      @click="handleConfirm"
    >
      <span v-if="migrating" class="flex items-center gap-2">
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
        ></div>
        处理中...
      </span>
      <span v-else>确认处理</span>
    </button>
  </div>
</template>
