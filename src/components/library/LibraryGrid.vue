<template>
  <div :class="['items-container', viewMode]">
    <div 
      v-for="item in items" 
      :key="item.id"
      :class="['library-item', viewMode]"
      @click="$emit('open-detail', item)"
    >
      <!-- 이미지/비디오 썸네일 -->
      <div class="item-media">
        <img 
          v-if="item.type === 'image' && item.storage_image_url" 
          :src="item.storage_image_url" 
          :alt="item.prompt"
          @error="handleImageError"
        >
        <video 
          v-else-if="item.type === 'video' && item.video_url"
          :src="item.video_url"
          muted
          loop
          @mouseenter="$event.target.play()"
          @mouseleave="$event.target.pause()"
        />
        <div v-else class="placeholder-media">
          <component :is="getPlaceholderIcon(item.type)" :size="32" />
        </div>
        
        <!-- 타입 배지 -->
        <div class="type-badge">
          <component :is="getTypeIcon(item.type)" :size="14" />
          {{ item.type === 'image' ? '이미지' : '비디오' }}
        </div>

        <!-- 그리드 뷰 오버레이 정보 (호버 시 표시) -->
        <div v-if="viewMode === 'grid'" class="item-overlay">
          <div class="overlay-content">
            <h3 class="overlay-title">{{ getTruncatedPrompt(item.prompt) }}</h3>
            <div class="overlay-meta">
              <span class="overlay-date">{{ formatDate(item.created_at) }}</span>
              <span v-if="item.model" class="overlay-model">{{ item.model }}</span>
            </div>
            <!-- 태그 -->
            <div class="overlay-tags" v-if="item.tags && item.tags.length > 0">
              <span 
                v-for="tag in item.tags.slice(0, 2)" 
                :key="tag" 
                class="overlay-tag"
              >{{ tag }}</span>
              <span v-if="item.tags.length > 2" class="overlay-more-tags">
                +{{ item.tags.length - 2 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 리스트 뷰 아이템 정보 -->
      <div v-if="viewMode === 'list'" class="item-info">
        <h3 class="item-title">{{ getTruncatedPrompt(item.prompt) }}</h3>
        <div class="item-meta">
          <span class="item-date">{{ formatDate(item.created_at) }}</span>
          <span v-if="item.model" class="item-model">{{ item.model }}</span>
          <span v-if="item.style" class="item-style">{{ item.style }}</span>
        </div>
        
        <!-- 태그 -->
        <div class="item-tags" v-if="item.tags && item.tags.length > 0">
          <span 
            v-for="tag in item.tags.slice(0, 3)" 
            :key="tag" 
            class="tag"
          >{{ tag }}</span>
          <span v-if="item.tags.length > 3" class="more-tags">
            +{{ item.tags.length - 3 }}
          </span>
        </div>
      </div>

      <!-- 액션 버튼 -->
      <div class="item-actions">
        <button 
          @click.stop="$emit('copy-item', item)" 
          class="action-btn copy-btn" 
          title="프로젝트에 복사"
        >
          <Copy :size="16" />
        </button>
        <button 
          @click.stop="$emit('delete-item', item)" 
          class="action-btn delete-btn" 
          title="삭제"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Image, Video, Copy, Trash2 } from 'lucide-vue-next';

defineProps({
  items: Array,
  viewMode: String,
  activeTab: String
});

defineEmits(['open-detail', 'copy-item', 'delete-item']);

const getPlaceholderIcon = (type) => {
  return type === 'video' ? Video : Image;
};

const getTypeIcon = (type) => {
  return type === 'video' ? Video : Image;
};

const getTruncatedPrompt = (prompt) => {
  if (!prompt) return '제목 없음';
  return prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
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

const handleImageError = (event) => {
  console.error('Image load error:', event);
};
</script>

<style scoped>
/* 컨테이너 */
.items-container {
  display: grid;
  gap: 20px;
}

.items-container.grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.items-container.list {
  grid-template-columns: 1fr;
}

/* 아이템 공통 */
.library-item {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.library-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

/* 그리드 뷰 */
.library-item.grid {
  aspect-ratio: 1;
}

.library-item.grid .item-media {
  width: 100%;
  height: 100%;
  position: relative;
}

.library-item.grid .item-media img,
.library-item.grid .item-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 리스트 뷰 */
.library-item.list {
  display: flex;
  gap: 15px;
  padding: 15px;
  align-items: center;
}

.library-item.list .item-media {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.library-item.list .item-media img,
.library-item.list .item-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-item.list .item-info {
  flex: 1;
  min-width: 0;
}

/* 미디어 플레이스홀더 */
.placeholder-media {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

/* 타입 배지 */
.type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(10px);
}

/* 오버레이 (그리드 뷰) */
.item-overlay {
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

.library-item:hover .item-overlay {
  opacity: 1;
}

.overlay-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.3;
}

.overlay-meta {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  opacity: 0.8;
  margin-bottom: 8px;
}

.overlay-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.overlay-tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.75rem;
}

/* 아이템 정보 (리스트 뷰) */
.item-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  gap: 15px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.item-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

/* 액션 버튼 */
.item-actions {
  display: flex;
  gap: 8px;
  position: absolute;
  top: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.3s;
}

.library-item.list .item-actions {
  position: static;
  opacity: 1;
  margin-left: auto;
}

.library-item:hover .item-actions {
  opacity: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  transform: scale(1.1);
}

.copy-btn:hover {
  background: var(--primary-color);
  color: white;
}

.delete-btn:hover {
  background: var(--danger-color);
  color: white;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .items-container.grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .library-item.list {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .library-item.list .item-media {
    width: 100%;
    height: 200px;
  }
}
</style>