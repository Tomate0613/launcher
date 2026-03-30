<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAppState } from '../composables/appState';
import Card from './Card.vue';
import Icon from './Icon.vue';
import {
  mdiLoading,
  mdiNetworkStrength1,
  mdiNetworkStrength2,
  mdiNetworkStrength3,
  mdiNetworkStrength4,
  mdiNetworkStrengthOff,
} from '@mdi/js';

const { accountId, modpacks } = await useAppState();

const props = defineProps<{
  modpack: string;
  name: string;
  icon: string;
  address: string;
}>();

type Status = {
  status: Object | null;
  latency: number | null;
};

const status = ref<Status | null>(null);

onMounted(async () => {
  try {
    status.value = await window.api.invoke('pingServer', props.address);
  } catch (e) {
    status.value = { latency: null, status: null };
  }
});

function getModpack(modpack: string) {
  return modpacks.get(modpack);
}

function launch(modpack: string, address: string) {
  if (!accountId) {
    return;
  }

  window.api.invoke('launchModpack', modpack, accountId, {
    type: 'multiplayer',
    identifier: address,
  });
}
</script>

<template>
  <Card
    :icon="icon"
    :name="name"
    :primary-action-disabled="!accountId"
    @click-primary-action="launch(modpack, address)"
  >
    <template v-slot:top-right v-if="status">
      <div class="status">
        <div
          class="players"
          v-if="status.status"
          :title="
            (status.status as any)?.players?.sample
              ?.map((s: any) => s.name)
              .join('\n')
          "
        >
          <div class="players-online">
            {{ (status.status as any)?.players?.online }}
          </div>
          <div class="players-seperator">/</div>
          <div class="players-max">
            {{ (status.status as any)?.players?.max }}
          </div>
        </div>

        <div class="latency" :title="status?.latency ? `${status?.latency} ms` : 'No connection'">
          <Icon
            :path="
              (() => {
                if (status.latency == null) {
                  return mdiNetworkStrengthOff;
                }
                if (status.latency && status.latency > 1000)
                  return mdiNetworkStrength1;
                if (status.latency && status.latency > 500)
                  return mdiNetworkStrength2;
                if (status.latency && status.latency > 100)
                  return mdiNetworkStrength3;
                return mdiNetworkStrength4;
              })()
            "
            size="16"
          />
        </div>
      </div>
    </template>
    <template v-slot:top-right v-else>
      <div class="status">
        <div class="latency" title="Pinging...">
          <Icon :path="mdiLoading" size="16" spin />
        </div>
      </div>
    </template>
    <template v-slot:description>
      <div class="modpack">
        {{ getModpack(modpack)?.name }}
      </div>
      <div class="address">
        {{ address }}
      </div>
    </template>
  </Card>
</template>

<style scoped>
.status {
  display: flex;
  align-items: center;
  gap: 0.25rem;

  & .players {
    display: flex;

    & .players-seperator {
      color: var(--color-text-secondary);
    }
  }
}
</style>
