<script lang="ts" setup>
import { onMounted, ref, useTemplateRef } from 'vue';
import ContentItemCard from '../components/ContentItemCard.vue';
import { ImplementedProvider, SearchResult } from 'tomate-mods';
import ContentItemCardShimmer from '../components/ContentItemCardShimmer.vue';
import { useDebounceFn } from '@vueuse/core';

const input = useTemplateRef('input');
const searchResult = ref<SearchResult & { shimmer?: boolean }>({
  hits: [],
  count: 0,
  shimmer: true,
});

const installing = ref<string[]>([]);

async function search() {
  const query = input.value?.value ?? '';

  searchResult.value = await window.api.invoke('searchModpack', query);
}

const searchDebounced = useDebounceFn(search, 500);

async function install(provider: ImplementedProvider, id: string) {
  installing.value.push(id);
  window.api.invoke('installModpack', provider, id);
}

onMounted(() => {
  search();
});
</script>

<template>
  <div class="page-header">
    <input
      type="text"
      @input="searchDebounced"
      ref="input"
      placeholder="Search Modpacks"
    />
  </div>

  <div class="page-content">
    <div class="page-scrollable explore">
      <ContentItemCardShimmer v-if="searchResult.shimmer" v-for="_ in 20" />
      <ContentItemCard
        v-for="mod in searchResult.hits"
        v-if="searchResult.count"
        :name="mod.name"
        :url="mod.url"
        :key="mod.id"
        :description="mod.description"
        :icon="mod.icon"
        :provider="mod.provider"
        state="SEARCH"
      >
        <button
          @click="install(mod.provider, mod.id)"
          :disabled="installing.includes(mod.id)"
        >
          {{ installing.includes(mod.id) ? 'Installing' : 'Install' }}
        </button>
      </ContentItemCard>
      <div v-else="searchResult.count">No search results</div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  flex-direction: row;
}
.explore {
  padding-top: 0;
  gap: 0.5rem;
}
input {
  display: flex;
  flex-grow: 1;
}
</style>
