<script setup lang="ts">
withDefaults(
  defineProps<{
    path: string;
    size?: string | number;
    viewBox?: string;
    color?: string;
    spin?: boolean;
  }>(),
  {
    size: 24,
    viewBox: '0 0 24 24',
    color: 'currentColor',
  },
);
</script>

<template>
  <svg class="icon" :class="{ spin }" :width="size" :height="size" :viewBox>
    <path :d="path" :fill="color" />
  </svg>
</template>

<style>
.icon {
  display: block;
}

.spin {
  animation: spin 1s linear 0ms infinite;
}

@keyframes spin {
  0% {
    rotate: 0deg;
  }
  100% {
    rotate: 360deg;
  }
}
</style>
