<template>
  <div class="explore-card" @click="$emit('click', item)">
    <!-- 미디어 -->
    <div class="card-media">
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
        <component :is="getTypeIcon(item.type)" :size="32" />
      </div>
      
      <!-- 스타일 배지 -->
      <div v-if="item.style" class="style-badge">
        {{ item.style }}
      </div>

      <!-- 호버 오버레이 -->
      <div class="hover-overlay">
        <div class="overlay-info">
          <span v-if="item.model" class="model-name">{{ formatModelName(item.model) }}</span>
          <span class="date">{{ formatDate(item.created_at) }}</span>
        </div>
        <div class="overlay-stats">
          <span class="stat-item">
            <Eye :size="14" />
            {{ item.views || 0 }}
          </span>
          <span class="stat-item">
            <Heart :size="14" />
            {{ item.likes || 0 }}
          </span>
        </div>
      </div>
      
      <!-- 좋아요 버튼 -->
      <button 
        @click.stop="$emit('like', item)" 
        class="like-btn"
        :class="{ liked: item.is_liked }"
      >
        <Heart :size="16" :fill="item.is_liked ? 'currentColor' : 'none'" />
      </button>
      
      <!-- 저장 버튼 -->
      <button 
        @click.stop="$emit('save', item)" 
        class="save-btn"
        :class="{ saved: item.is_saved }"
        title="라이브러리에 저장"
      >
        <Bookmark :size="16" :fill="item.is_saved ? 'currentColor' : 'none'" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { Heart, Bookmark, Eye, Image, Video } from 'lucide-vue-next';

defineProps({
  item: Object
});

defineEmits(['click', 'like', 'save']);

const getTypeIcon = (type) => type === 'video' ? Video : Image;

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
</script>

<style scoped>
.explore-card {
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

.explore-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

/* 미디어 */
.card-media {
  position: relative;
  width: 100%;
}

.card-media img,
.card-media video {
  width: 100%;
  height: auto;
  display: block;
}

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

.explore-card:hover .hover-overlay {
  opacity: 1;
}

.overlay-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.85rem;
}

.model-name {
  font-weight: 600;
  color: #4ade80;
}

.overlay-stats {
  display: flex;
  gap: 15px;
  font-size: 0.85rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 액션 버튼 */
.like-btn,
.save-btn {
  position: absolute;
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

.like-btn {
  top: 10px;
  right: 10px;
}

.save-btn {
  top: 10px;
  right: 50px;
}

.like-btn:hover,
.save-btn:hover {
  transform: scale(1.1);
  background: white;
}

.like-btn.liked {
  color: #ef4444;
  background: white;
}

.save-btn.saved {
  color: #3b82f6;
  background: white;
}
</style>