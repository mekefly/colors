<script setup lang="ts">
/**
 * 关于页
 */
import DatabaseIO from "@/components/DatabaseIO.vue";
import { databaseNames } from "@/utils/databases";

const dbNames = databaseNames();
</script>

<template>
  <div class="space-y-6">
    <!-- 关于 -->
    <div class="rounded-xl bg-white p-6 shadow-md">
      <h2 class="mb-2 text-xl font-bold text-gray-800">颜色助手</h2>
      <p class="text-sm text-gray-500">
        颜色工具集 — 取色器 · 渐变编辑 · 收藏管理
      </p>
    </div>

    <!-- 数据库导入导出 -->
    <div class="rounded-xl bg-white p-6 shadow-md">
      <h3 class="mb-4 text-lg font-semibold text-gray-800">数据库</h3>
      <DatabaseIO :db-names="dbNames" />
    </div>
  </div>
</template>
