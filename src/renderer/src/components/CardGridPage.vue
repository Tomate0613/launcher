<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useNavigationInput } from '../composables/navigationInput';

const grid = useTemplateRef('grid');

let firstInput = true;

function getColumnCount() {
  if (!grid.value) return 1;

  const style = getComputedStyle(grid.value);

  return style.gridTemplateColumns.split(' ').length;
}

const movementActions = ['right', 'left', 'down', 'up'];

useNavigationInput((action) => {
  const target = document.activeElement as HTMLElement;

  if (!target.matches('.card')) {
    if (firstInput && movementActions.includes(action)) {
      // TODO Remove as never when ts types are up to date
      document
        .querySelector<HTMLElement>('.card')
        ?.focus({ focusVisible: true } as never);
      firstInput = false;
      return true;
    }

    firstInput = false;
    return;
  }

  firstInput = false;

  const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'));

  const index = cards.indexOf(target);
  const columns = getColumnCount();

  let next = index;

  switch (action) {
    case 'right':
      // if (next % columns !== columns - 1) {
      next = index + 1;
      // }
      break;

    case 'left':
      // if (next % columns !== 0) {
      next = index - 1;
      // }
      break;

    case 'down':
      next = index + columns;
      break;

    case 'up':
      next = index - columns;
      break;

    case 'primary':
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
        }),
      );
      return true;

    default:
      return;
  }

  if (cards[next]) {
    // TODO Remove as never when ts types are up to date
    cards[next].focus({ focusVisible: true } as never);
    return true;
  }

  return false;
});
</script>

<template>
  <div class="page-scrollable card-grid" ref="grid">
    <slot />
  </div>
</template>

<style scoped>
.card-grid {
  gap: 0.5rem;

  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  grid-auto-rows: min-content;
}
</style>
