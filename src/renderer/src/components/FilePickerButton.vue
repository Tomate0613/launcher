<script setup lang="ts">
import { useTemplateRef } from 'vue';

const fileInput = useTemplateRef('fileInput');

defineExpose({
  fileInput,
});

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <label tabindex="0" @click.stop>
    <div class="fake-btn icon-btn">
      <slot />
    </div>
    <input ref="fileInput" type="file" v-bind="$attrs" />
  </label>
</template>

<style scoped>
input[type='file'] {
  display: none;
}
</style>
