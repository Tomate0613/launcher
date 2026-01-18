<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import Popup from '../Popup.vue';

const popup = useTemplateRef('popup');

const message = ref('');
const name = ref('');

onMounted(() => {
  addEventListener('message', onMessage);
});

onBeforeUnmount(() => {
  removeEventListener('message', onMessage);
});

function onMessage(event: MessageEvent<any>) {
  if (event.data?.type === 'frontend-error') {
    message.value = event.data.message;
    name.value = event.data.name ?? 'Error';

    popup.value?.openMenu();
  }
}
</script>

<template>
  <Popup ref="popup">
    <h2>{{ name }}</h2>

    {{ message }}
  </Popup>
</template>
