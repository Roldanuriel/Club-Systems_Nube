<template>
  <ClientOnly>
    <PanelOficina />
    <template #fallback>
      <span aria-hidden="true"></span>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
import PanelOficina from '../vistas/Oficina.vue';
definePageMeta({
  requiresAuth: true,
  roles: ['SUPERADMIN', 'ADMIN', 'OFICINA']
});
</script>
