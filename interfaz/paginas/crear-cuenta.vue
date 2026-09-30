<template><CrearCuenta /></template>

<script setup lang="ts">
import CrearCuenta from '../vistas/CrearCuenta.vue';
definePageMeta({
  requiresAuth: true,
  roles: ['SUPERADMIN']
});
</script>
