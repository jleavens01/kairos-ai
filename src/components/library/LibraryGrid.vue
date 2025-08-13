<template>
  <div class="library-grid-container">
    <!-- Masonry 그리드 -->
    <div v-if="viewMode === 'grid'" class="masonry-grid">
      <div 
        v-for="item in displayedItems" 
        :key="item.id"
        class="masonry-item"
        @click="$emit('open-detail', item)"
      >
        <!-- 이미지/비디오 -->
        <div class="media-wrapper">
          <img 
            v-if="item.type === 'image' && item.storage_image_url" 
            :src="item.storage_image_url" 
            :alt="item.prompt"
            loading="lazy"
          >
          <video 
            v-else-if="item.type === 'video' && item.video_url"
            :src="item.video_url"
            muted
            loop
            @mouseenter="$event.target.play()"
            @mouseleave="$event.target.pause()"
          />
          <div v-else class="placeholder">
            <component :is="getPlaceholderIcon(item.type)" :size="32" />
          </div>
          
          <!-- 스타일/카테고리 배지 -->
          <div v-if="item.style" class="style-badge">
            {{ item.style }}
          </div>

          <!-- 호버 오버레이 -->
          <div class="hover-overlay">
            <div class="overlay-info">
              <span v-if="item.model" class="model-name">{{ formatModelName(item.model) }}</span>
              <span class="date">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>
          
          <!-- 좋아요 버튼 -->
          <button 
            @click.stop="toggleLike(item)" 
            class="like-btn"
            :class="{ liked: item.is_favorite }"
            title="좋아요"
          >
            <Heart :size="16" :fill="item.is_favorite ? 'currentColor' : 'none'" />
          </button>
        </div>
      </div>
      
      <!-- 무한 스크롤 트리거 -->
      <div 
        v-if="displayedItems.length < (items?.length || 0)"
        ref="loadMoreTrigger" 
        class="load-more-trigger"
      >
        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <span>더 불러오는 중...</span>
        </div>
      </div>
    </div>

    <!-- 리스트 뷰 -->
    <div v-else class="list-view">
      <div 
        v-for="item in displayedItems" 
        :key="item.id"
        class="list-item"
        @click="$emit('open-detail', item)"
      >
        <div class="list-media">
          <img 
            v-if="item.type === 'image' && item.storage_image_url" 
            :src="item.storage_image_url" 
            :alt="item.prompt"
          >
          <video 
            v-else-if="item.type === 'video' && item.video_url"
            :src="item.video_url"
            muted
          />
        </div>
        <div class="list-info">
          <h3>{{ getTruncatedPrompt(item.prompt) }}</h3>
          <div class="meta">
            <span>{{ formatDate(item.created_at) }}</span>
            <span v-if="item.model">{{ formatModelName(item.model) }}</span>
          </div>
        </div>
        <div class="list-actions">
          <button @click.stop="$emit('copy-item', item)" class="action-btn">
            <Copy :size="16" />
          </button>
          <button @click.stop="$emit('delete-item', item)" class="action-btn delete">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Image, Video, Copy, Trash2, Heart } from 'lucide-vue-next';
import { onMounted, onUnmounted, watch, ref, nextTick } from 'vue';

const props = defineProps({
  items: Array,
  viewMode: String,
  activeTab: String
});

const emit = defineEmits(['open-detail', 'copy-item', 'delete-item', 'toggle-like']);

// 무한 스크롤 상태
const displayedItems = ref([]);
const itemsPerLoad = 20;
const loadMoreTrigger = ref(null);
const isLoading = ref(false);
let observer = null;

// 초기 아이템 로드
const loadInitialItems = () => {
  if (!props.items) return;
  displayedItems.value = props.items.slice(0, itemsPerLoad);
};

// 더 많은 아이템 로드
const loadMoreItems = () => {
  if (isLoading.value || !props.items) return;
  
  const currentLength = displayedItems.value.length;
  if (currentLength >= props.items.length) return;
  
  isLoading.value = true;
  
  setTimeout(() => {
    const nextItems = props.items.slice(currentLength, currentLength + itemsPerLoad);
    displayedItems.value = [...displayedItems.value, ...nextItems];
    isLoading.value = false;
  }, 100);
};

// Intersection Observer 설정
const setupIntersectionObserver = () => {
  if (!loadMoreTrigger.value || props.viewMode !== 'grid') return;
  
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !isLoading.value) {
        loadMoreItems();
      }
    },
    { rootMargin: '100px' }
  );
  
  observer.observe(loadMoreTrigger.value);
};

// items prop 변경 감지
watch(() => props.items, (newItems) => {
  if (newItems) {
    displayedItems.value = newItems.slice(0, itemsPerLoad);
  }
}, { immediate: true });

// viewMode 변경 감지
watch(() => props.viewMode, () => {
  nextTick(() => {
    if (observer) {
      observer.disconnect();
    }
    setupIntersectionObserver();
  });
});

onMounted(() => {
  loadInitialItems();
  nextTick(() => {
    setupIntersectionObserver();
  });
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});

// 헬퍼 함수들
const getPlaceholderIcon = (type) => type === 'video' ? Video : Image;
const getTypeIcon = (type) => type === 'video' ? Video : Image;

const getTruncatedPrompt = (prompt) => {
  if (!prompt) return '제목 없음';
  return prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
};

const formatModelName = (model) => {
  if (!model) return '';
  const modelMap = {
    'gpt-image-1': 'GPT Image',
    'flux-1.1-pro': 'Flux 1.1 Pro',
    'flux-schnell': 'Flux Schnell',
    'veo2': 'Google Veo 2',
    'kling21': 'Kling 2.1 Pro',
    'hailou02': 'MiniMax Hailou',
    'runway': 'Runway Gen-3',
    'pika': 'Pika Labs',
    'stable-video': 'Stable Video'
  };
  return modelMap[model] || model;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes === 0 ? '방금 전' : `${diffMinutes}분 전`;
    }
    return `${diffHours}시간 전`;
  }
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  
  return date.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const toggleLike = (item) => {
  emit('toggle-like', item);
};
</script>

<style scoped>
.library-grid-container {
  width: 100%;
}

/* Masonry 그리드 레이아웃 */
.masonry-grid {
  column-count: 2;
  column-gap: 20px;
  padding: 0;
}

@media (min-width: 768px) {
  .masonry-grid {
    column-count: 3;
  }
}

@media (min-width: 1024px) {
  .masonry-grid {
    column-count: 4;
  }
}

@media (min-width: 1440px) {
  .masonry-grid {
    column-count: 5;
  }
}

/* Masonry 아이템 */
.masonry-item {
  break-inside: avoid;
  margin-bottom: 20px;
  display: inline-block;
  width: 100%;
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s;
}

.masonry-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

/* 미디어 래퍼 */
.media-wrapper {
  position: relative;
  width: 100%;
}

.media-wrapper img,
.media-wrapper video {
  width: 100%;
  height: auto;
  display: block;
}

/* 플레이스홀더 */
.placeholder {
  width: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

/* 스타일 배지 */
.style-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  backdrop-filter: blur(10px);
  text-transform: capitalize;
}

/* 호버 오버레이 */
.hover-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent);
  color: white;
  padding: 15px;
  opacity: 0;
  transition: opacity 0.3s;
}

.masonry-item:hover .hover-overlay {
  opacity: 1;
}

.overlay-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 0.85rem;
}

.model-name {
  font-weight: 600;
  color: #4ade80;
}

/* 좋아요 버튼 */
.like-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.like-btn:hover {
  transform: scale(1.1);
  background: white;
}

.like-btn.liked {
  color: #ef4444;
  background: white;
}

/* 리스트 뷰 */
.list-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.list-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  align-items: center;
}

.list-item:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-sm);
}

.list-media {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
}

.list-media img,
.list-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.list-info {
  flex: 1;
  min-width: 0;
}

.list-info h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-info .meta {
  display: flex;
  gap: 15px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.list-actions {
  display: flex;
  gap: 8px;
}

/* 무한 스크롤 로딩 */
.load-more-trigger {
  width: 100%;
  padding: 20px;
  text-align: center;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>