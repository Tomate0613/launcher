<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAppState } from '../composables/appState';
import { useEventListener } from '@vueuse/core';
import {
  mdiAccount,
  mdiCog,
  mdiConsoleLine,
  mdiDownload,
  mdiEarthBox,
  mdiImage,
  mdiMinecraft,
  mdiNewspaper,
  mdiServer,
} from '@mdi/js';
import steve from '../assets/steve.png';
import Icon from './Icon.vue';
import PlayerHead from './PlayerHead.vue';
import microsoftLogo from '../assets/microsoft.svg';
import type { AccountType } from '../../../main/data/account';
import { log } from '../../../common/logging/log';

const logger = log('sidebar');

const appState = await useAppState();
const disabledTabs = computed(() => appState.settings.disabledTabs);
const profileLoaded = computed(
  () => appState.account?.profile || appState.account?.type !== 'msa',
);
const skin = computed(
  () =>
    appState.account?.profile?.skins?.find((skin) => skin.state === 'ACTIVE')
      ?.url ?? steve,
);

function addMsaAccount() {
  return window.api.invoke('addMsaAccount');
}

useEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === 'k')
    (document.querySelector('.sidebar .sidebar-item') as HTMLElement).focus();
});

let accountSwitcherOpen = ref(false);

function toggleAccountSwitcher() {
  accountSwitcherOpen.value = !accountSwitcherOpen.value;
}

function useAccount(id: string) {
  appState.accountId = id;
  toggleAccountSwitcher();
}

function accountTypeString(accountType: AccountType) {
  if (accountType === 'msa') {
    return 'Microsoft';
  }
  if (accountType === 'demo') {
    return 'Demo';
  }
  if (accountType === 'offline') {
    return 'Offline';
  }

  return 'Unknown';
}

useEventListener('controller-input' as never, (event) => {
  const action = (event as any).detail as string;

  const sidebarItems = Array.from(
    document.querySelectorAll<HTMLElement>('.sidebar-item'),
  );
  const activeItem = document.querySelector<HTMLElement>(
    '.sidebar-item.router-link-exact-active',
  );

  let index = 0;

  if (activeItem) {
    index = sidebarItems.indexOf(activeItem);

    if (action === 'tab-next') {
      index++;
    } else if (action === 'tab-previous') {
      index--;
    } else {
      return;
    }
  }

  logger.log(action);

  if (sidebarItems[index]) {
    // TODO Remove as never when ts types are up to date
    sidebarItems[index].click();
  }
});
</script>

<template>
  <div class="sidebar">
    <RouterLink
      class="sidebar-item"
      to="/"
      draggable="false"
      v-if="!disabledTabs.includes('instances')"
    >
      <Icon :path="mdiMinecraft" />
      Play
    </RouterLink>
    <RouterLink
      class="sidebar-item"
      to="/worlds"
      draggable="false"
      v-if="!disabledTabs.includes('worlds')"
    >
      <Icon :path="mdiEarthBox" />
      Worlds
    </RouterLink>
    <RouterLink
      class="sidebar-item"
      to="/screenshots"
      draggable="false"
      v-if="!disabledTabs.includes('screenshots')"
    >
      <Icon :path="mdiImage" />
      Screenshots
    </RouterLink>
    <RouterLink
      class="sidebar-item"
      to="/servers"
      draggable="false"
      v-if="!disabledTabs.includes('servers')"
    >
      <Icon :path="mdiServer" />
      Servers
    </RouterLink>
    <RouterLink
      class="sidebar-item"
      to="/news"
      draggable="false"
      v-if="!disabledTabs.includes('news')"
    >
      <Icon :path="mdiNewspaper" />
      News
    </RouterLink>
    <RouterLink
      class="sidebar-item"
      to="/install"
      draggable="false"
      v-if="!disabledTabs.includes('explore')"
    >
      <Icon :path="mdiDownload" />
      Explore
    </RouterLink>
    <RouterLink
      class="sidebar-item"
      to="/accounts"
      draggable="false"
      v-if="!disabledTabs.includes('accounts')"
    >
      <Icon :path="mdiAccount" />
      Accounts
    </RouterLink>
    <RouterLink
      class="sidebar-item"
      to="/console"
      draggable="false"
      v-if="!disabledTabs.includes('console')"
    >
      <Icon :path="mdiConsoleLine" />
      Console
    </RouterLink>
    <div class="flex-spacer"></div>
    <div class="profiles">
      <div class="profile-options" v-if="accountSwitcherOpen">
        <button
          class="profile-option"
          v-for="account of Array.from(appState.accounts.values()).filter(
            (account) => account.id != appState.account?.id,
          )"
          @click="useAccount(account.id)"
        >
          <PlayerHead
            :skin="
              account?.profile?.skins?.find((skin) => skin.state === 'ACTIVE')
                ?.url ?? steve
            "
            size="1.5"
          />
          <div>
            <div class="profile-name ellipsis">
              {{ account.profile?.name ?? account.name ?? 'Player' }}
            </div>
            <div class="profile-desc ellipsis">
              {{ accountTypeString(account.type) }}
            </div>
          </div>
        </button>
      </div>
      <button
        v-if="profileLoaded && appState.account"
        class="profile"
        @click="toggleAccountSwitcher"
      >
        <PlayerHead :skin size="1.5" />
        <div>
          <div class="profile-name ellipsis">
            {{
              appState.account.profile?.name ??
              appState.account.name ??
              'Player'
            }}
          </div>
          <div class="profile-desc ellipsis">
            {{ appState.account.id === 'demo' ? 'Demo' : 'Active' }}
          </div>
        </div>
      </button>
      <button v-if="!appState.account" class="profile" @click="addMsaAccount">
        <img class="microsoft-logo" :src="microsoftLogo" width="5" />
        <div>
          <div class="profile-name ellipsis">Login</div>
          <div class="profile-desc ellipsis">Required for launching</div>
        </div>
      </button>
    </div>
    <RouterLink
      class="sidebar-item settings-item"
      to="/settings"
      draggable="false"
    >
      <Icon :path="mdiCog" />
      Settings
    </RouterLink>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  padding: 1rem;
  gap: 0.5rem;
  font-family: var(--font-display);
}

.sidebar-item {
  display: flex;
  position: relative;
  padding: 0.5rem 1rem;
  gap: 1rem;
  align-items: center;
  font-size: 0.875rem;
  font-weight: bold;
  text-decoration: none;
  text-transform: uppercase;
  color: var(--color-text);
  border-radius: var(--border-radius);
  transition: scale 200ms;

  &::before {
    content: '';
    visibility: hidden;
    position: absolute;
    inset: 0;
    background-color: var(--color-accent);
    border-radius: inherit;
    clip-path: inset(0 100% 0 0);
    transition: clip-path 200ms;
  }

  &.router-link-exact-active,
  &:hover,
  &:focus-visible {
    background-color: var(--color-ui-layer);
  }

  &.router-link-exact-active::before {
    visibility: visible;
    clip-path: inset(0 calc(100% - 0.25rem) 0 0);
  }

  &:active {
    scale: 0.95;
  }
}

.settings-item:hover .icon,
.settings-item:focus-visible .icon {
  rotate: 60deg;
  transition: 200ms;
}

.profiles,
.profile-options {
  display: flex;
  flex-direction: column;
}

.profile,
.profile-option {
  all: unset;
  display: flex;
  margin-top: 0.5rem;
  padding-inline: 1rem;
  gap: 1rem;
  align-items: center;
  flex-grow: 1;
  border-radius: var(--border-radius);

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 0;
  }

  .profile-name {
    font-weight: bold;
    line-height: 1rem;
  }

  .profile-desc {
    font-size: 0.75rem;
    opacity: 0.75;
  }
}

.microsoft-logo {
  width: 1.5rem;
}
</style>
