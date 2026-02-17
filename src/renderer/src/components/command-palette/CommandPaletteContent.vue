<script setup lang="ts">
import { useEventListener } from '@vueuse/core';
import {
  computed,
  nextTick,
  onMounted,
  ref,
  useId,
  useTemplateRef,
  watch,
} from 'vue';
import { log } from '../../../../common/logging/log';
import Icon from '../Icon.vue';
import {
  mdiArrowUpBoldOutline,
  mdiChevronUp,
  mdiHelpCircleOutline,
  mdiMagnify,
} from '@mdi/js';
import ImageIcon from '../ImageIcon.vue';
import type { Option } from './types';

const logger = log('command-palette');

const input = useTemplateRef('input');
const actionsInput = useTemplateRef('actions-input');
const optionRefs = useTemplateRef('option');
const actionsPopover = useTemplateRef('actions-popover');

const { closeCommandPalette, options } = defineProps<{
  closeCommandPalette(): void;
  options: Option[];
  placeholder: string;
}>();

const searchQuery = ref('');
const actionsSearchQuery = ref('');
const selectedIdx = ref(0);
const selectedActionIdx = ref(0);

const filteredOptions = computed(() =>
  options.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  ),
);

const filteredActions = computed(() =>
  selectedOption.value?.actions.filter((action) =>
    action.name.toLowerCase().includes(actionsSearchQuery.value.toLowerCase()),
  ),
);

const selectedOption = computed<Option | undefined>(
  () => filteredOptions.value[selectedIdx.value],
);
const primaryAction = computed(
  () =>
    selectedOption.value &&
    selectedOption.value.actions.length &&
    selectedOption.value.actions[0],
);

function moveDown(count: number = 1) {
  if (!actionsPopover.value?.matches(':popover-open')) {
    if (!filteredOptions.value.length) return;
    selectedIdx.value =
      (selectedIdx.value + count) % filteredOptions.value.length;
  } else {
    const length = filteredActions.value?.length || 1;
    selectedActionIdx.value = (selectedActionIdx.value + count) % length;
  }
}

function moveUp(count: number = 1) {
  if (!filteredOptions.value.length) return;

  if (!actionsPopover.value?.matches(':popover-open')) {
    selectedIdx.value =
      (selectedIdx.value - count + filteredOptions.value.length) %
      filteredOptions.value.length;
  } else {
    const length = filteredActions.value?.length || 1;
    selectedActionIdx.value =
      (selectedActionIdx.value - count + length) % length;
  }
}

function execute(idx: number, actionIdx: number) {
  const selected = filteredOptions.value[idx];
  if (selected) {
    const action =
      actionIdx < (filteredActions.value?.length ?? 0)
        ? filteredActions.value?.[actionIdx]
        : null;

    logger.verbose('Selected', selected.name, action?.name);

    if (action && !action.disabled) {
      actionsPopover.value?.hidePopover();
      actionsSearchQuery.value = '';
      searchQuery.value = '';

      const keepAliveRet = action.execute();
      if (!action.keepAlive && !keepAliveRet) {
        closeCommandPalette();
      }
    }
  }
}

useEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        moveUp();
      } else {
        moveDown();
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveDown();
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveUp();
    }

    if (e.ctrlKey && (e.key === 'j' || e.key === 'n')) {
      e.preventDefault();
      moveDown();
    }

    if (e.ctrlKey && (e.key === 'k' || e.key === 'p')) {
      e.preventDefault();
      moveUp();
    }

    if (!actionsPopover.value?.matches(':popover-open')) {
      if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault();
        if (e.shiftKey) {
          execute(selectedIdx.value, 1);
        } else {
          execute(selectedIdx.value, 0);
        }
      }

      if (
        e.ctrlKey &&
        e.key === 'b' &&
        selectedOption.value &&
        selectedOption.value.actions.length >= 2
      ) {
        e.preventDefault();
        actionsSearchQuery.value = '';
        actionsPopover.value?.showPopover();
        actionsInput.value?.focus();
      }
    } else {
      if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault();
        if (e.shiftKey) {
          execute(selectedIdx.value, 1);
        } else {
          execute(selectedIdx.value, selectedActionIdx.value);
        }
      }
    }
  },
  { passive: false },
);

watch(searchQuery, () => {
  selectedIdx.value = 0;
});

watch(actionsSearchQuery, () => {
  selectedActionIdx.value = 0;
});

watch(selectedIdx, async () => {
  await nextTick();
  optionRefs.value?.[selectedIdx.value]?.scrollIntoView({
    block: 'nearest',
  });
});

onMounted(() => {
  input.value?.focus();
});

const actionsPopupId = useId();
</script>

<template>
  <label class="input-line" for="command-palette-input">
    <Icon :path="mdiMagnify" />
    <input
      id="command-palette-input"
      ref="input"
      type="text"
      autofocus="true"
      :placeholder="placeholder"
      v-model="searchQuery"
    />
  </label>
  <div class="options">
    <button
      v-for="(option, idx) in filteredOptions"
      class="btn-other"
      :class="{ selected: idx == selectedIdx }"
      ref="option"
      @click="selectedIdx = idx"
      @dblclick="execute(idx, 0)"
    >
      <ImageIcon
        class="option-image"
        v-if="option.image"
        :src="option.image === true ? undefined : option.image"
      />
      <Icon v-else :path="option.icon ?? mdiHelpCircleOutline" />

      {{ option.name }}
    </button>
  </div>
  <div
    class="actions-popover"
    ref="actions-popover"
    :id="actionsPopupId"
    @toggle="selectedActionIdx = 0"
    popover
  >
    <div class="actions">
      <button
        v-if="filteredActions && filteredActions.length"
        v-for="(action, idx) in filteredActions"
        class="btn-other"
        :class="{ selected: idx == selectedActionIdx }"
        @click="execute(selectedIdx, idx)"
        :disabled="action.disabled"
      >
        {{ action.name }}
        <code v-if="idx === 0">↵</code>
        <div class="keycombo" v-if="idx === 1">
          <code><Icon :path="mdiArrowUpBoldOutline" :size="16" /></code>
          <code>↵</code>
        </div>
      </button>
      <div v-else class="no-results">No Results</div>
    </div>
    <input
      id="command-palette-actions-input"
      ref="actions-input"
      placeholder="Filter actions"
      type="text"
      v-model="actionsSearchQuery"
    />
  </div>
  <div class="footer">
    Command Palette
    <div class="actions" v-if="selectedOption">
      <button
        class="primary-action btn-other"
        v-if="primaryAction"
        :disabled="primaryAction?.disabled"
        @click="execute(selectedIdx, 0)"
      >
        {{ primaryAction.name }} <code>↵</code>
      </button>
      <button
        class="other-actions-hint btn-other"
        v-if="selectedOption.actions.length > 1"
        :popovertarget="actionsPopupId"
      >
        Actions
        <div class="keycombo">
          <code><Icon :path="mdiChevronUp" :size="16" /></code>
          <code>B</code>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.input-line {
  display: flex;
  gap: 0.75rem;
  align-items: center;

  border: none;
  border-bottom: 1px solid var(--color-ui-layer);

  padding: 1.25rem;
}

input#command-palette-input,
input#command-palette-actions-input {
  all: unset;
  position: relative;
  width: 100%;
}

input#command-palette-actions-input {
  padding: 0.75rem;
  border: none;
  border-top: 1px solid var(--color-ui-layer);
}

.options {
  display: flex;
  flex-direction: column;
  height: 25vh;
  overflow: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable both-edges;
  width: 100%;

  padding-top: 0.75rem;

  & button {
    all: unset;

    display: flex;
    gap: 0.5rem;
    align-items: center;
    border-radius: calc(var(--border-radius) * 2);

    cursor: pointer;
    padding: 0.75rem 0.5rem;

    &:hover,
    &:focus {
      background: var(--color-ui-layer-dim);
    }

    &.selected {
      background: var(--color-ui-layer);
    }

    & .option-image {
      height: 24px;
      border-radius: calc(var(--border-radius));
    }
  }
}

.footer {
  padding: 0.75rem;
  background: var(--color-background);
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 3rem;

  & .actions {
    display: flex;
    align-items: center;
    gap: 1rem;

    & .primary-action {
      all: unset;

      cursor: pointer;

      gap: 0.5rem;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    & .other-actions-hint {
      all: unset;

      anchor-name: --other-actions-hint;

      cursor: pointer;

      display: flex;
      align-items: center;
      gap: 0.5rem;
      user-select: none;
    }
  }
}

.actions-popover {
  position: fixed;

  inset: unset;

  margin: 0;

  /* padding: 0.75rem; */
  border-radius: var(--border-radius);
  border: 1px solid var(--color-ui-layer);

  /* bottom: anchor(--other-actions-hint bottom) */
  inset-block-end: calc(anchor(--other-actions-hint top) + 1rem);
  inset-inline-end: anchor(--other-actions-hint right);

  flex-direction: column;

  &:popover-open {
    display: flex;
  }

  & .actions {
    display: flex;
    flex-direction: column;

    padding-bottom: 0.25rem;

    & button,
    & .no-results {
      all: unset;

      padding: 0.5rem 0.75rem;

      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;

      border-radius: var(--border-radius);
    }

    & button {
      cursor: pointer;

      &:hover,
      &:focus {
        background: var(--color-ui-layer-dim);
      }

      &.selected {
        background: var(--color-ui-layer);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    & .no-results {
      justify-content: center;
      color: var(--color-text-secondary);
    }
  }
}

code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  font-size: 0.85rem;
  line-height: 1;
  border: 1px solid var(--color-ui-layer);
  width: 1.25rem;
  height: 1.5rem;
  border-radius: var(--border-radius);
}

.keycombo {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
