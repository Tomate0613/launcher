<template>
  <div class="content-item-card shimmer">
    <div class="rounded shimmer fake-icon"></div>
    <div class="content-item-info">
      <div class="name-line">
        <div class="name ellipsis shimmer-text">NAME</div>
        <slot />
      </div>
      <div class="description shimmer-text">description</div>
    </div>
  </div>
</template>

<style scoped>
.content-item-card {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;

  position: relative;
  border-radius: 0.25rem;
}

.rounded {
  border-radius: 0.25rem;
}

.fake-icon {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
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
}

.name-line {
  display: inline-flex;

  width: 100%;
  align-items: center;
  justify-content: space-between;
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

progress {
  position: absolute;

  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;

  border: none;
}

progress::-webkit-progress-value {
  background: var(--color-green);
}

progress::-webkit-progress-bar {
  background: transparent;
}
</style>
