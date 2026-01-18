<script lang="ts" setup>
import { ContentState } from '../../../main/data/content/content';
import ImageIcon from './ImageIcon.vue';

defineProps<{
  name: string;
  description: string;
  icon?: string;
  state?: ContentState | 'SEARCH';
  disabled?: boolean;
  provider?: string;
  stateProgress?: number;
  url?: string;
}>();
</script>

<template>
  <div
    class="content-item-card"
    :class="{ 'state-removed': state === 'REMOVED' || disabled }"
  >
    <ImageIcon :src="icon" width="64" height="64" class="rounded" />
    <div class="content-item-info">
      <div class="name-line ellipsis">
        <a :href="url" target="_blank" class="name ellipsis">
          {{ name }}
        </a>
        <div class="slot-container">
          <slot />
        </div>
      </div>
      <div class="description">{{ description }}</div>
      <progress
        class="card-progress"
        :value="stateProgress"
        v-if="stateProgress"
      />
    </div>
  </div>
</template>

<style scoped>
.content-item-card {
  background: var(--color-ui-layer-dim);

  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;

  position: relative;
  border-radius: 0.25rem;
}

.rounded {
  border-radius: 0.25rem;
}

.content-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
}

.content-item-text {
  display: flex;
  flex-direction: column;
}

.state-removed {
  background: var(--color-ui-layer-dim-2);
  color: grey;

  & img {
    opacity: .5;
  }
}

.name-line {
  display: inline-flex;

  width: 100%;
  align-items: center;
  justify-content: space-between;

  & .slot-container {
    display: inline-flex;
    gap: .5rem;
  }
}

.name {
  color: unset;
  text-decoration: unset;
  user-select: text;

  &[href]:hover {
    text-decoration: underline;
  }
}

.description {
  /* display: block; */
  font-size: 0.875rem;
  user-select: text;
  opacity: 0.75;

  white-space: wrap;
  text-overflow: ellipsis;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

progress::-webkit-progress-bar {
  background: transparent;
}
</style>
