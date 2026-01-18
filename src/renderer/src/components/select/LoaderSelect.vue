<script setup lang="ts">
import { LoaderId } from 'tomate-loaders';

const value = defineModel<LoaderId>();
</script>

<template>
  <select v-model="value">
    <option value="fabric">Fabric</option>
    <option value="quilt">Quilt</option>
    <option value="forge">Forge</option>
    <option value="neoforge">Neoforge</option>
    <option value="vanilla">Vanilla</option>
  </select>
</template>
