<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Help from "./components/Help.vue";
import Layerout from "./components/Layerout.vue";
import LoadingPage from "./components/LoadingPage.vue";
import MigrationPage from "./components/MigrationPage.vue";
import NavBar from "./components/NavBar.vue";
import ProvideMessage from "./components/ProvideMessage.vue";
import { useCurrentColor } from "./utils/current-color";
import zToolsApi from "./utils/ztoolsapi";

const router = useRouter();
const route = useRoute();
const currentColorStore = useCurrentColor();

const phase = ref<"loading" | "migration" | "ready">("loading");

zToolsApi.onPluginEnter((parm) => {
  switch (parm.code) {
    case "预览颜色":
      router.push({ path: "/" });
      currentColorStore.setCurrentColor(parm.payload);
      break;
  }
});
</script>

<template>
  <LoadingPage v-if="phase === 'loading'" @goto="phase = $event" />
  <MigrationPage v-else-if="phase === 'migration'" @goto="phase = $event" />
  <Help v-else>
    <Layerout>
      <template #header>
        <NavBar />
      </template>
      <RouterView />
    </Layerout>
    <ProvideMessage />
  </Help>
</template>
