<script setup lang="ts">
withDefaults(
  defineProps<{
    skin: string;
    size?: `${number}` | number;
  }>(),
  { size: 1 },
);
</script>

<template>
  <div class="player-head" :style="{ '--size': `${size}` }">
    <div class="base" :style="{ backgroundImage: `url(${skin})` }"></div>
    <div class="outer" :style="{ backgroundImage: `url(${skin})` }"></div>
  </div>
</template>

<style scoped>
.player-head {
  position: relative;
  height: calc(1rem * var(--size));
  aspect-ratio: 1;
  box-shadow: 0 2px 8px var(--color-shadow-strong);

  .base,
  .outer {
    position: absolute;
    inset: 0;
    background-size: calc(8rem * var(--size));
    image-rendering: pixelated;
  }

  .base {
    background-position: calc(-1rem * var(--size)) calc(-1rem * var(--size));
  }

  .outer {
    background-position: calc(-5rem * var(--size)) calc(-1rem * var(--size));
  }
}
</style>
