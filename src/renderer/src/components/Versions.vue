<script setup lang="ts">
const versions = window.api.versions;
</script>

<template>
  <div class="versions">
    <div>Electron v{{ versions.electron }}</div>
    <div>Chromium v{{ versions.chrome }}</div>
    <div>Node v{{ versions.node }}</div>
    <div>V8 v{{ versions.v8 }}</div>
  </div>
</template>

<style scoped>
.versions {
  font-size: 0.75rem;
  font-family: var(--font-monospace);
  color: var(--color-text-secondary);
  user-select: text;
}
</style>
