<template><div class="monitor-page-container"><PanelMonitor /></div></template>

<script setup lang="ts">
import PanelMonitor from '../componentes/Monitor.vue';
definePageMeta({
  requiresAuth: true,
  roles: ['MONITOR']
});
</script>

<style scoped>
.monitor-page-container { margin: 0; padding: 0; min-height: 100vh; background-color: var(--brand); }
</style>
