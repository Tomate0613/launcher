<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  shallowRef,
  triggerRef,
  useTemplateRef,
} from 'vue';
import { useAppState } from '../composables/appState';
import { usePageFocus } from '../composables/pageFocus';
import { useIntervalFn } from '@vueuse/core';
import {
  logs as rawLogs,
  clearLogs as clearRawLogs,
  FrontendLogData,
} from '../../../common/logging/transports/frontendLoggerTransport';
import { mdiChevronDown, mdiCloseCircleOutline } from '@mdi/js';
import Icon from '../components/Icon.vue';
import Toggle from '../components/Toggle.vue';

const consoleRef = useTemplateRef('console-ref');
const appState = await useAppState();
const logs = shallowRef<FrontendLogData[]>([]);
let count = 0;
const state = reactive({
  atBottom: true,
  atLeft: true,
});

const displayedLogs = computed(() =>
  logs.value.filter(
    (entry) =>
      appState.consoleLogLevels.has(entry.level) &&
      (appState.consoleLogLevels.has('launcher') ||
        entry.thread.startsWith('Minecraft/')),
  ),
);

onMounted(() => {
  updateLogs();
});

usePageFocus();
useIntervalFn(updateLogs, 1000, { immediate: true });

async function updateLogs() {
  if (rawLogs.length !== count) {
    logs.value = rawLogs;
    count = rawLogs.length;
    triggerRef(logs);

    if (state.atBottom) {
      await nextTick();

      consoleRef.value?.scrollTo({
        top: consoleRef.value.scrollHeight,
        behavior: 'instant',
      });
    }
  }
}

function clearLogs() {
  clearRawLogs();
  updateLogs();
}

function toggleLogLevel(level: string) {
  if (appState.consoleLogLevels.has(level))
    appState.consoleLogLevels.delete(level);
  else appState.consoleLogLevels.add(level);
}

function onScroll() {
  if (!consoleRef.value) {
    return;
  }

  const { scrollHeight, scrollTop, scrollLeft, clientHeight } =
    consoleRef.value;

  state.atBottom = scrollHeight - scrollTop === clientHeight;
  state.atLeft = scrollLeft === 0;
}

function scrollToBottom() {
  if (!consoleRef.value) {
    return;
  }

  const { scrollHeight } = consoleRef.value;

  consoleRef.value.scrollTo({
    top: scrollHeight,
    left: 0,
    behavior: 'smooth',
  });
}
</script>

<template>
  <div class="page-header">
    <div class="action-row">
      <button class="icon-btn" @click="clearLogs">
        <Icon :path="mdiCloseCircleOutline" />
        Clear
      </button>
      <label>
        Verbose
        <Toggle
          :model-value="appState.consoleLogLevels.has('verbose')"
          @change="toggleLogLevel('verbose')"
        />
      </label>
      <label>
        Info
        <Toggle
          :model-value="appState.consoleLogLevels.has('info')"
          @change="toggleLogLevel('info')"
        />
      </label>
      <label>
        Warn
        <Toggle
          :model-value="appState.consoleLogLevels.has('warn')"
          @change="toggleLogLevel('warn')"
        />
      </label>
      <label>
        Error
        <Toggle
          :model-value="appState.consoleLogLevels.has('error')"
          @change="toggleLogLevel('error')"
        />
      </label>
      <label>
        Launcher
        <Toggle
          :model-value="appState.consoleLogLevels.has('launcher')"
          @change="toggleLogLevel('launcher')"
        />
      </label>
    </div>
  </div>
  <div class="page-content">
    <div
      ref="console-ref"
      class="page-scrollable console"
      @scrollend="onScroll"
    >
      <div v-if="!displayedLogs.length">
        <div>Nothing here yet</div>
      </div>
      <div
        v-for="entry of displayedLogs"
        class="log-entry"
        :class="`level-${entry.level}`"
      >
        <span class="time">[{{ entry.timestamp }}] </span>
        <span class="level">[{{ entry.thread }}/{{ entry.level }}] </span>
        <span class="channel">({{ entry.channel }}) </span>
        <span class="message">{{ entry.line }}</span>
      </div>
    </div>
    <button
      class="scroll-to-bottom"
      :class="{ visible: !state.atBottom || !state.atLeft }"
      :tabindex="!state.atBottom || !state.atLeft ? 0 : -1"
      @click="scrollToBottom"
    >
      <Icon :path="mdiChevronDown" />
    </button>
  </div>
</template>

<style scoped>
.page-content {
  position: relative;
}

.console {
  display: block;
  margin: 1rem;
  margin-top: 0;
  font-size: 0.75rem;
  font-family: var(--font-monospace);
  white-space: pre;
  background-color: var(--color-ui-layer-dim-2);
  border-radius: 0.5rem;
  user-select: text;
}

.scroll-to-bottom {
  display: block;
  position: absolute;
  right: 2rem;
  bottom: 2rem;
  padding: 0.25rem;
  background-color: var(--color-ui-layer);
  backdrop-filter: blur(8px);
  border: none;
  border-radius: 100%;
  box-shadow: 0 2px 8px var(--color-shadow-strong);
  scale: 0;
  transition: scale 200ms;

  &.visible {
    scale: 1;
  }
}

.log-entry {
  &.level-info .level {
    color: var(--color-green);
  }

  &.level-verbose .level {
    color: color-mix(in srgb, var(--color-text), transparent 25%);
  }

  &.level-warn .level {
    color: var(--color-yellow);
  }

  &.level-error .level,
  &.level-error .message {
    color: var(--color-red);
  }

  .level-trace .level {
    color: var(--color-blue);
  }

  .channel {
    color: var(--color-purple);
  }

  .time {
    color: var(--color-blue);
  }
}

.action-row {
  align-items: center;

  & label {
    align-items: center;
    display: flex;
    gap: 0.5rem;
  }
}
</style>
