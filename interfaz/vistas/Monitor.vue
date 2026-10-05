<template>
  <div class="monitor-page-container">
    <MonitorPanel />
  </div>
</template>

<script setup>
import MonitorPanel from "../componentes/Monitor.vue";
</script>

<style scoped>
.monitor-page-container {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background-color: var(--brand);
}
</style>
