<template>
  <div ref="elementRef" class="lazy-image-wrapper">
    <div v-if="!hasLoaded" class="lazy-image-placeholder">
      <div class="loading-skeleton"></div>
    </div>
    <img 
      v-else
      :src="src"
      :alt="alt"
      @load="onImageLoad"
      @error="onImageError"
      class="lazy-image"
      :class="{ 'loaded': imageLoaded, 'error': imageError }"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLazyLoad } from '@/composables/useLazyLoad'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  rootMargin: {
    type: String,
    default: '100px'
  }
})

const imageLoaded = ref(false)
const imageError = ref(false)

const { elementRef, hasLoaded } = useLazyLoad(null, {
  rootMargin: props.rootMargin
})

const onImageLoad = () => {
  imageLoaded.value = true
}

const onImageError = () => {
  imageError.value = true
}
</script>

<style scoped>
.lazy-image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.lazy-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.loading-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    rgba(255, 255, 255, 0.1) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.lazy-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lazy-image.loaded {
  opacity: 1;
}

.lazy-image.error {
  opacity: 0.5;
}
</style>