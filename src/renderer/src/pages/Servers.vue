<script setup lang="ts">
import Server from '../components/Server.vue';

const servers = await window.api.invoke('getServers');
</script>

<template>
  <div class="page-header"></div>

  <div class="page-content">
    <div class="page-scrollable servers" v-if="servers">
      <Server v-for="server in servers" v-bind="server" />
    </div>
  </div>
</template>

<style scoped>
.servers {
  padding-top: 0;
  gap: 0.5rem;

  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  grid-auto-rows: min-content;
}
</style>
