<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="header-left">
          <h2>{{ item.prompt || '제목 없음' }}</h2>
          <div class="creator-info" v-if="item.user_name">
            <User :size="16" />
            <span>{{ item.user_name }}</span>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">
          <X :size="24" />
        </button>
      </div>
      
      <div class="modal-body">
        <!-- 미디어 섹션 -->
        <div class="media-section">
          <img 
            v-if="item.type === 'image' && item.storage_image_url" 
            :src="item.storage_image_url" 
            :alt="item.prompt"
            class="detail-media"
          >
          <video 
            v-else-if="item.type === 'video' && item.video_url"
            :src="item.video_url"
            controls
            autoplay
            loop
            class="detail-media"
          />
          <div v-else class="placeholder-media">
            <component :is="getTypeIcon(item.type)" :size="64" />
          </div>
        </div>
        
        <!-- 정보 섹션 -->
        <div class="info-section">
          <!-- 액션 버튼 -->
          <div class="action-buttons">
            <button @click="$emit('like', item)" :class="['action-btn', { active: item.liked }]">
              <Heart :size="20" :fill="item.liked ? 'currentColor' : 'none'" />
              <span>{{ item.likes || 0 }} 좋아요</span>
            </button>
            <button @click="$emit('save', item)" :class="['action-btn', { active: item.saved }]">
              <Bookmark :size="20" :fill="item.saved ? 'currentColor' : 'none'" />
              <span>저장</span>
            </button>
            <button @click="handleDownload" class="action-btn">
              <Download :size="20" />
              <span>다운로드</span>
            </button>
          </div>
          
          <!-- 상세 정보 -->
          <div class="detail-info">
            <div class="info-group">
              <h4>정보</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">생성일</span>
                  <span class="info-value">{{ formatDate(item.created_at) }}</span>
                </div>
                <div v-if="item.model" class="info-item">
                  <span class="info-label">모델</span>
                  <span class="info-value">{{ item.model }}</span>
                </div>
                <div v-if="item.style" class="info-item">
                  <span class="info-label">스타일</span>
                  <span class="info-value">{{ item.style }}</span>
                </div>
                <div v-if="item.views" class="info-item">
                  <span class="info-label">조회수</span>
                  <span class="info-value">{{ item.views.toLocaleString() }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="item.prompt" class="info-group">
              <h4>프롬프트</h4>
              <p class="prompt-text">{{ item.prompt }}</p>
            </div>
            
            <div v-if="item.tags && item.tags.length > 0" class="info-group">
              <h4>태그</h4>
              <div class="tags-list">
                <span v-for="tag in item.tags" :key="tag" class="tag">
                  #{{ tag }}
                </span>
              </div>
            </div>
            
            <div v-if="item.parameters" class="info-group">
              <h4>파라미터</h4>
              <div class="params-grid">
                <div v-for="(value, key) in item.parameters" :key="key" class="param-item">
                  <span class="param-label">{{ formatParamLabel(key) }}</span>
                  <span class="param-value">{{ value }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X, User, Heart, Bookmark, Download, Image, Video } from 'lucide-vue-next';

const props = defineProps({
  item: Object
});

const emit = defineEmits(['close', 'like', 'save']);

const getTypeIcon = (type) => {
  return type === 'video' ? Video : Image;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatParamLabel = (key) => {
  const labels = {
    aspect_ratio: '화면 비율',
    num_steps: '스텝 수',
    guidance_scale: '가이던스',
    seed: '시드',
    width: '너비',
    height: '높이',
    fps: 'FPS',
    duration: '길이'
  };
  return labels[key] || key;
};

const handleDownload = async () => {
  const url = props.item.type === 'image' 
    ? props.item.storage_image_url 
    : props.item.video_url;
    
  if (!url) return;
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${props.item.type}_${props.item.id}.${props.item.type === 'image' ? 'png' : 'mp4'}`;
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 헤더 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  flex: 1;
  min-width: 0;
}

.modal-header h2 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 바디 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  gap: 30px;
  padding: 20px;
}

/* 미디어 섹션 */
.media-section {
  flex: 0 0 60%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-media {
  width: 100%;
  height: auto;
  max-height: 600px;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: var(--shadow-md);
}

.placeholder-media {
  width: 100%;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 8px;
  color: var(--text-secondary);
}

/* 정보 섹션 */
.info-section {
  flex: 1;
  min-width: 0;
}

/* 액션 버튼 */
.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 25px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: var(--bg-primary);
  border-color: var(--primary-color);
}

.action-btn.active {
  background: rgba(74, 222, 128, 0.1);
  color: var(--primary-color);
  border-color: var(--primary-color);
}

/* 상세 정보 */
.detail-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-group h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.info-value {
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 500;
}

/* 프롬프트 */
.prompt-text {
  color: var(--text-primary);
  line-height: 1.6;
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 6px;
  font-size: 0.95rem;
}

/* 태그 */
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
}

/* 파라미터 */
.params-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 6px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.param-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.param-value {
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 500;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .modal-body {
    flex-direction: column;
  }
  
  .media-section {
    flex: none;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .info-grid,
  .params-grid {
    grid-template-columns: 1fr;
  }
}
</style>