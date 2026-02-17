<script setup lang="ts">
import { usePageFocus } from '../composables/pageFocus';
import { useAppState } from '../composables/appState';
import {
  mdiAccountCheckOutline,
  mdiAccountPlus,
  mdiBrushVariant,
  mdiPlus,
  mdiLoading,
  mdiAccountClock,
  mdiAccountLockOpen,
  mdiDeleteOutline,
} from '@mdi/js';
import { IdleAnimation } from 'skinview3d';
import image from '../assets/pack.png';
import steve from '../assets/steve.png';
import Icon from '../components/Icon.vue';
import ContextMenuWrapper from '../components/ContextMenuWrapper.vue';
import SkinViewer from '../components/SkinViewer.vue';
import { computed, ref, useTemplateRef } from 'vue';
import Popup from '../components/Popup.vue';
import PlayerHead from '../components/PlayerHead.vue';

const appState = await useAppState();
const uploadSkinPopup = useTemplateRef('upload-skin-popup');
const skinFilePicker = useTemplateRef('skin-file-picker');
const confirmSkinDelete = useTemplateRef('confirm-skin-delete');
const createOfflineAccountPopup = useTemplateRef(
  'create-offline-account-popup',
);

const offlineAccountName = ref('');

const skins = ref(await window.api.invoke('getSkins'));

usePageFocus();

function addMsaAccount() {
  return window.api.invoke('addMsaAccount');
}
function addDemoAccount() {
  return window.api.invoke('addDemoAccount');
}
function addOfflineAccount() {
  return window.api.invoke('addOfflineAccount', offlineAccountName.value);
}

function useAccount(id: string) {
  appState.accountId = id;
}

async function removeAccount(id: string) {
  await window.api.invoke('removeAccount', id);
}

const activeSkin = computed(
  () =>
    appState.account?.profile?.skins?.find((skin) => skin.state === 'ACTIVE')
      ?.url ?? steve,
);

const activeCape = computed(
  () =>
    appState.account?.profile?.capes?.find((cape) => cape.state === 'ACTIVE')
      ?.url,
);

function setCape(id: string) {
  if (!appState.accountId) {
    return;
  }

  return window.api.invoke('setAccountCape', appState.accountId, id);
}

const changeSkinPreviewUrl = ref('');
const changeSkinBuffer = ref(new ArrayBuffer());
const skinSetUpForDeletion = ref('');
const currentlyUploading = ref(false);

function changeSkinFile() {
  const files = skinFilePicker.value?.files;

  if (!files || !files.length) {
    return;
  }

  const [file] = files;

  const reader = new FileReader();
  reader.onload = () => {
    changeSkinBuffer.value = reader.result as ArrayBuffer;
    changeSkinPreviewUrl.value = URL.createObjectURL(file);
  };
  reader.readAsArrayBuffer(file);
}

async function uploadSkin() {
  currentlyUploading.value = true;
  await uploadSkinFromArrayBuffer(changeSkinBuffer.value);
  await reloadSkins();
  uploadSkinPopup.value?.closeMenu();
  currentlyUploading.value = false;
}

async function reloadSkins() {
  skins.value = await window.api.invoke('getSkins');
}

function uploadSkinFromArrayBuffer(buffer: ArrayBuffer) {
  if (!appState.accountId) {
    return;
  }

  return window.api.invoke('uploadSkin', appState.accountId, buffer);
}

function openConfirmSkinDeletePopup(id: string) {
  skinSetUpForDeletion.value = id;
  confirmSkinDelete.value?.openMenu();
}

async function deleteSkin() {
  await window.api.invoke('deleteSkin', skinSetUpForDeletion.value);
  confirmSkinDelete.value?.closeMenu();
  return reloadSkins();
}
</script>

<template>
  <div class="page-content">
    <div class="page-scrollable">
      <div class="player">
        <img class="background" :src="image" alt="" />
        <div class="username">{{ appState.account?.profile?.name }}</div>
        <SkinViewer
          :options="{
            width: 680,
            height: 240,
            skin: activeSkin,
            animation: new IdleAnimation(),
            cape: activeCape,
          }"
        />
      </div>

      <h2>Accounts</h2>
      <div class="action-row">
        <button class="icon-btn" @click="addMsaAccount()">
          <Icon :path="mdiAccountPlus" size="2rem" />
          Add Account
        </button>
        <template
          v-if="
            Array.from(appState.accounts.values()).some((a) => a.type === 'msa')
          "
        >
          <button
            v-if="!appState.accounts.get('demo')"
            class="icon-btn"
            @click="addDemoAccount()"
          >
            <Icon :path="mdiAccountClock" />
            Add Demo Account
          </button>
          <button class="icon-btn" @click="createOfflineAccountPopup?.openMenu">
            <Icon :path="mdiAccountLockOpen" />
            Add Offline Account
          </button>
        </template>
      </div>

      <div v-for="account of appState.accounts.values()" :key="account.id">
        <ContextMenuWrapper>
          <template v-slot:content>
            <button class="account" @click="useAccount(account.id)">
              <PlayerHead
                :skin="
                  account?.profile?.skins?.find(
                    (skin) => skin.state === 'ACTIVE',
                  )?.url ?? steve
                "
                size="2"
              />
              {{ account.profile?.name ?? account.name ?? 'Player' }}
              {{ account.id === appState.accountId ? '(Active)' : '' }}
            </button>
          </template>
          <template v-slot:context-menu>
            <button
              class="icon-btn"
              v-if="account.id !== appState.accountId"
              @click="useAccount(account.id)"
            >
              <Icon :path="mdiAccountCheckOutline" />
              Use
            </button>
            <button class="icon-btn" @click="removeAccount(account.id)">
              <Icon :path="mdiDeleteOutline" />
              Remove
            </button>
          </template>
        </ContextMenuWrapper>
      </div>

      <h2>Skins</h2>
      <div class="skins" v-if="skins">
        <div v-for="skin of skins" :key="skin.id">
          <ContextMenuWrapper>
            <template v-slot:content>
              <SkinViewer
                :options="{
                  width: 100,
                  height: 100,
                  skin: skin.url,
                  animation: new IdleAnimation(),
                }"
              />
            </template>

            <template v-slot:context-menu>
              <button
                class="icon-btn"
                @click="uploadSkinFromArrayBuffer(skin.file)"
              >
                <Icon :path="mdiBrushVariant" />
                Use
              </button>
              <button
                class="icon-btn"
                @click="openConfirmSkinDeletePopup(skin.id)"
              >
                <Icon :path="mdiDeleteOutline" />
                Forget Skin
              </button>
            </template>
          </ContextMenuWrapper>
        </div>

        <button
          style="
            width: 100px;
            display: flex;
            justify-content: center;
            align-items: center;
          "
          @click="uploadSkinPopup?.openMenu"
        >
          <Icon :path="mdiPlus" />
        </button>
      </div>

      <h2>Capes</h2>
      <div class="capes" v-if="appState?.account?.profile?.capes">
        <div v-for="cape of appState.account.profile.capes" :key="cape.id">
          <ContextMenuWrapper>
            <template v-slot:content>
              <SkinViewer
                :options="{
                  width: 100,
                  height: 100,
                  skin: activeSkin,
                  cape: cape.url,
                  animation: new IdleAnimation(),
                }"
                :camera-pos="[0, 0, -1]"
                :adjust-camera-distance="true"
              />
            </template>
            <template v-slot:context-menu>
              <button class="icon-btn" @click="setCape(cape.id)">
                <Icon :path="mdiBrushVariant" />
                Use
              </button>
            </template>
          </ContextMenuWrapper>
        </div>
      </div>
    </div>
  </div>

  <Popup ref="upload-skin-popup">
    <h2>Upload Skin</h2>
    <input
      type="file"
      ref="skin-file-picker"
      @change="changeSkinFile"
      accept=".png,image/png"
    />

    <SkinViewer
      v-if="changeSkinPreviewUrl && !currentlyUploading"
      :options="{
        width: 100,
        height: 100,
        skin: changeSkinPreviewUrl,
        animation: new IdleAnimation(),
      }"
    />

    <div class="spinner-container" v-if="currentlyUploading">
      <Icon class="uploading-spinner" :path="mdiLoading" size="64" spin />
    </div>

    <hr />
    <div class="action-row">
      <button @click="uploadSkin" :disabled="currentlyUploading">Upload</button>
    </div>
  </Popup>

  <Popup ref="confirm-skin-delete">
    <h2>Delete Skin</h2>

    Do you really want to forget the skin?

    <hr />
    <div class="action-row">
      <button @click="deleteSkin">Yes</button>
      <button @click="confirmSkinDelete?.closeMenu">No</button>
    </div>
  </Popup>

  <Popup ref="create-offline-account-popup">
    <h2>Create Offline Account</h2>
    <input
      type="text"
      class="offline-account-name-input"
      v-model="offlineAccountName"
      maxlength="16"
      placeholder="Username"
    />
    <hr />
    <div class="action-row">
      <button
        :disabled="offlineAccountName.length === 0"
        @click="
          addOfflineAccount();
          createOfflineAccountPopup?.closeMenu();
        "
      >
        Create
      </button>
    </div>
  </Popup>
</template>

<style scoped>
.offline-account-name-input {
  width: 100%;
}
.skins,
.capes {
  display: flex;
}
.player {
  position: relative;
  overflow: clip;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px var(--color-shadow-light);
  padding: 1rem;

  .background {
    position: absolute;
    width: 100%;
    height: 100%;
    scale: 1.25;
    filter: blur(16px);
    object-fit: cover;
    z-index: -1;
  }

  .username {
    position: relative;
    left: 50%;
    width: max-content;
    margin-bottom: 1rem;
    padding-inline: 0.25rem;
    font-family: var(--font-monospace);
    font-weight: bold;
    background-color: var(--color-ui-layer-light);
    border-radius: 0.25rem;
    transform: translateX(-50%);
    user-select: text;
  }

  .skin-viewer {
    margin: auto;
  }
}

.account {
  display: inline-flex;
  gap: 1rem;
  align-items: center;
  /* background: var(--color-ui-layer); */
  /* padding: 1rem; */
  /* border-radius: var(--border-radius); */
}

.spinner-container {
  padding-top: 1rem;
  display: flex;

  align-items: center;
  justify-content: center;

  width: 100%;
}
</style>
