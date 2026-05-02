<script setup lang="ts"></script>
<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
    <!-- 顶部导航栏 -->
    <div class="border-b border-gray-200 bg-white shadow-sm">
      <slot name="header"></slot>
    </div>
    <!-- 主要内容区域 -->
    <div class="mx-auto max-w-7xl p-6">
      <slot></slot>
    </div>
  </div>
</template>
