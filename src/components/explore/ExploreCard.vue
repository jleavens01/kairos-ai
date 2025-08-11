<template>
  <div :class="['explore-card', viewMode]" @click="$emit('click', item)">
    <!-- 미디어 -->
    <div class="card-media">
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
        <component :is="getTypeIcon(item.type)" :size="32" />
      </div>
      
      <!-- 호버 오버레이 -->
      <div class="card-overlay">
        <div class="overlay-actions">
          <button @click.stop="$emit('like', item)" class="overlay-btn">
            <Heart :size="20" :fill="item.liked ? 'currentColor' : 'none'" />
          </button>
          <button @click.stop="$emit('save', item)" class="overlay-btn">
            <Bookmark :size="20" :fill="item.saved ? 'currentColor' : 'none'" />
          </button>
        </div>
      </div>
      
      <!-- 타입 배지 -->
      <div class="type-badge">
        <component :is="getTypeIcon(item.type)" :size="14" />
      </div>
    </div>
    
    <!-- 카드 정보 -->
    <div class="card-info">
      <h3 class="card-title">{{ getTruncatedPrompt(item.prompt) }}</h3>
      
      <div class="card-meta">
        <div class="meta-left">
          <span v-if="item.user_name" class="meta-user">
            <User :size="14" />
            {{ item.user_name }}
          </span>
          <span v-if="item.style" class="meta-style">{{ item.style }}</span>
        </div>
        
        <div class="meta-right">
          <span v-if="item.likes" class="meta-likes">
            <Heart :size="14" />
            {{ formatNumber(item.likes) }}
          </span>
          <span v-if="item.views" class="meta-views">
            <Eye :size="14" />
            {{ formatNumber(item.views) }}
          </span>
        </div>
      </div>
      
      <!-- 태그 (리스트 뷰) -->
      <div v-if="viewMode === 'list' && item.tags" class="card-tags">
        <span v-for="tag in item.tags.slice(0, 3)" :key="tag" class="tag">
          #{{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Heart, Bookmark, User, Eye, Image, Video } from 'lucide-vue-next';

defineProps({
  item: Object,
  viewMode: String
});

defineEmits(['click', 'like', 'save']);

const getTypeIcon = (type) => {
  return type === 'video' ? Video : Image;
};

const getTruncatedPrompt = (prompt) => {
  if (!prompt) return '제목 없음';
  const maxLength = 50;
  return prompt.length > maxLength ? prompt.substring(0, maxLength) + '...' : prompt;
};

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const handleImageError = (event) => {
  console.error('Image load error:', event);
};
</script>

<style scoped>
.explore-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.explore-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-color);
}

/* 그리드 뷰 */
.explore-card.grid {
  display: flex;
  flex-direction: column;
}

.explore-card.grid .card-media {
  width: 100%;
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
}

/* 리스트 뷰 */
.explore-card.list {
  display: flex;
  gap: 15px;
  padding: 15px;
}

.explore-card.list .card-media {
  width: 150px;
  height: 150px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.explore-card.list .card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* 미디어 */
.card-media img,
.card-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-media {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

/* 오버레이 */
.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.7));
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 10px;
}

.explore-card:hover .card-overlay {
  opacity: 1;
}

.overlay-actions {
  display: flex;
  gap: 8px;
}

.overlay-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.overlay-btn:hover {
  transform: scale(1.1);
  background: white;
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
  backdrop-filter: blur(10px);
}

/* 카드 정보 */
.card-info {
  padding: 12px;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.meta-left,
.meta-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-user,
.meta-likes,
.meta-views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-style {
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

/* 태그 */
.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.tag {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .explore-card.list {
    flex-direction: column;
  }
  
  .explore-card.list .card-media {
    width: 100%;
    height: 200px;
  }
}
</style>