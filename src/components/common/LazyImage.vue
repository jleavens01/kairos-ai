<template>
  <div ref="elementRef" class="lazy-image-wrapper">
    <div v-if="!hasLoaded" class="lazy-image-placeholder">
      <div class="loading-skeleton"></div>
    </div>
    <div v-else-if="imageError" class="error-placeholder">
      <div class="error-icon">❌</div>
      <div class="error-text">이미지 로딩 실패</div>
    </div>
    <img 
      v-else
      :src="currentSrc || src"
      :alt="alt"
      @load="onImageLoad"
      @error="onImageError"
      class="lazy-image"
      :class="{ 'loaded': imageLoaded }"
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
  fallbackSrc: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  rootMargin: {
    type: String,
    default: '50px'
  }
})

const imageLoaded = ref(false)
const imageError = ref(false)
const currentSrc = ref('')

const { elementRef, hasLoaded } = useLazyLoad(() => {
  setImageSrc()
}, {
  rootMargin: props.rootMargin
})

const onImageLoad = () => {
  imageLoaded.value = true
  imageError.value = false
}

const onImageError = () => {
  const imageSrc = currentSrc.value || props.src
  // base64 데이터 URL인 경우 길이만 표시
  if (imageSrc.startsWith('data:')) {
    console.error('❌ 이미지 로딩 실패: [Base64 Data URL, length:', imageSrc.length, ']')
  } else {
    console.error('❌ 이미지 로딩 실패:', imageSrc)
  }
  
  // fallback 이미지가 있고 아직 시도하지 않았다면 시도
  if (props.fallbackSrc && currentSrc.value !== props.fallbackSrc) {
    if (props.fallbackSrc.startsWith('data:')) {
      console.log('🔄 Fallback 이미지 시도: [Base64 Data URL, length:', props.fallbackSrc.length, ']')
    } else {
      console.log('🔄 Fallback 이미지 시도:', props.fallbackSrc)
    }
    currentSrc.value = props.fallbackSrc
    return
  }
  
  // 최종 에러 상태로 설정
  console.log('💀 최종 이미지 로딩 실패')
  imageError.value = true
  imageLoaded.value = false
}

// 이미지 소스 설정
const setImageSrc = () => {
  currentSrc.value = props.src
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

.error-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--text-muted);
}

.error-icon {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.7;
}

.error-text {
  font-size: 12px;
  opacity: 0.8;
}
</style>