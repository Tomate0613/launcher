<script setup lang="ts">
import {
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  useTemplateRef,
  watch,
} from 'vue';
import { SkinViewer, type SkinViewerOptions } from 'skinview3d';

const props = defineProps<{
  options: SkinViewerOptions;
  cameraPos?: [number, number, number];
  adjustCameraDistance?: boolean;
}>();

const canvasRef = useTemplateRef('canvas-ref');
let skinViewer: SkinViewer;

onMounted(() => {
  skinViewer = new SkinViewer({
    canvas: canvasRef.value!,
    ...props.options,
  });

  if (props.cameraPos) {
    skinViewer.camera.position.set(
      props.cameraPos?.[0] ?? 0,
      props.cameraPos?.[1] ?? 0,
      props.cameraPos?.[2] ?? 1,
    );
  }

  if (props.adjustCameraDistance) {
    skinViewer.adjustCameraDistance();
  }
});

watch(props, () => {
  if (props.options.skin) {
    skinViewer.loadSkin(props.options.skin);
  }
  if (props.options.cape) {
    skinViewer.loadCape(props.options.cape);
  } else {
    skinViewer.resetCape();
  }
});

onBeforeUnmount(() => {
  console.log('before unmount');
  skinViewer.dispose();
});

onUnmounted(() => {
  if (!skinViewer.disposed) {
    skinViewer.dispose();
  }
});
</script>

<template>
  <canvas ref="canvas-ref" class="skin-viewer"></canvas>
</template>

<style scoped>
.skin-viewer {
  display: block;
}
</style>
