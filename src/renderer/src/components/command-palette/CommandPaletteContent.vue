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
import { useAppState } from '../../composables/appState';
import Icon from '../Icon.vue';
import {
  mdiArrowUpBoldOutline,
  mdiChevronUp,
  mdiMagnify,
  mdiPackageVariantClosed,
} from '@mdi/js';

const logger = log('command-palette');

const input = useTemplateRef('input');
const optionRefs = useTemplateRef('option');
const actionsPopover = useTemplateRef('actions-popover');

const { closeCommandPalette } = defineProps<{
  closeCommandPalette(): void;
}>();

// const options = defineModel<Option[]>();

const searchQuery = ref('');
const selectedIdx = ref(0);
const selectedActionIdx = ref(0);

const appState = await useAppState();

type Action = {
  name: string;
  execute(): void;
  disabled?: boolean;
  keepAlive?: boolean;
};

type Option = {
  name: string;
  icon: string;
  actions: Action[];
};

const options = computed<Option[]>(() => {
  return Array.from(appState.modpacks.values())
    .filter((m) => !m.isDeleted)
    .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
    .map((modpack) => ({
      name: modpack.name,
      icon: mdiPackageVariantClosed,
      actions: [
        {
          name: 'Launch',
          execute() {
            return window.api.invoke(
              'launchModpack',
              modpack.id,
              appState.accountId!,
            );
          },
          disabled: !appState.accountId,
        },
        {
          name: 'Open Folder',
          execute() {
            return window.api.invoke('openModpackFolder', modpack.id);
          },
        },
      ],
    }));
});

const filteredOptions = computed(() =>
  options.value.filter((option) =>
    option.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
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
    const length = selectedOption.value?.actions.length || 1;
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
    const length = selectedOption.value?.actions.length || 1;
    selectedActionIdx.value =
      (selectedActionIdx.value - count + length) % length;
  }
}

function execute(idx: number, actionIdx: number) {
  const selected = filteredOptions.value[idx];
  if (selected) {
    logger.log('Selected', selected.name);

    const action =
      actionIdx < selected.actions.length ? selected.actions[actionIdx] : null;

    if (action && !action.disabled) {
      action.execute();
      if (!action.keepAlive) {
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

      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        actionsPopover.value?.showPopover();
      }
    } else {
      if (e.key !== 'Escape') {
        e.preventDefault();
      }

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

watch(selectedIdx, async () => {
  await nextTick();
  optionRefs.value?.[selectedIdx.value]?.scrollIntoView({
    block: 'nearest',
  });
});

onMounted(() => {
  logger.log(input.value);
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
      placeholder="Type a command or search"
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
      <Icon :path="option.icon" />
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
    <button
      v-for="(action, idx) in selectedOption?.actions"
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

input#command-palette-input {
  all: unset;
  position: relative;
  width: 100%;
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

    &.selected {
      background: var(--color-ui-layer);
    }

    &:hover,
    &:focus {
      background: var(--color-ui-layer-dim);
    }
  }
}

.footer {
  padding: 0.75rem;
  background: var(--color-background);
  display: flex;
  justify-content: space-between;
  align-items: center;

  & .actions {
    display: flex;
    align-items: center;
    gap: 1rem;

    & .primary-action {
      all: unset;

      cursor: pointer;

      gap: 0.5rem;
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

  & button {
    all: unset;

    cursor: pointer;
    padding: 0.5rem 0.75rem;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    border-radius: var(--border-radius);

    &.selected {
      background: var(--color-ui-layer);
    }

    &:hover,
    &:focus {
      background: var(--color-ui-layer-dim);
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
