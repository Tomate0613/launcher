<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import pack from '../assets/pack.png';

const props = defineProps<{
  src?: string;
  fallback?: string;
}>();

const pixelated = ref(false);
const errored = ref(false);
const imgSrc = computed(() => {
  if (errored.value) return pack;
  return props.src ?? props.fallback ?? pack;
});

watch(
  () => props.src,
  () => {
    errored.value = false;
  },
);

function handleImgLoad(event: Event) {
  const img = event.target as HTMLImageElement;
  if (img.naturalWidth <= 64 && img.naturalHeight <= 64) {
    pixelated.value = true;
  } else {
    pixelated.value = false;
  }
}
</script>

<template>
  <img
    :src="imgSrc"
    @error="() => (errored = true)"
    @load="handleImgLoad"
    :class="{ pixelated }"
    draggable="false"
  />
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
</style>
