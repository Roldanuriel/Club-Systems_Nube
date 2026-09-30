<template><PanelMonitor /></template>

<script setup lang="ts">
import PanelMonitor from '../vistas/Monitor.vue';
definePageMeta({
  requiresAuth: true,
  roles: ['MONITOR']
});
</script>
