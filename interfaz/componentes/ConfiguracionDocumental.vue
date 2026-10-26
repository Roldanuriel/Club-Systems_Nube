<template><ConfiguracionFormatos :manage="manage" configuration-only /></template>
<script>
import ConfiguracionFormatos from './ConfiguracionFormatos.vue';
export default { components: { ConfiguracionFormatos }, props: { manage: Boolean } };
</script>
