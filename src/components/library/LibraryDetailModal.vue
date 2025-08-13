<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <button class="modal-close-button" @click="$emit('close')">
        <X :size="24" />
      </button>
      
      <div class="modal-body">
        <div class="detail-media">
          <img 
            v-if="item.type === 'image' && item.storage_image_url" 
            :src="item.storage_image_url" 
            :alt="item.prompt"
          >
          <video 
            v-else-if="item.type === 'video' && item.video_url"
            :src="item.video_url"
            controls
            autoplay
            loop
          />
          <div v-else class="placeholder-media">
            <component :is="getTypeIcon(item.type)" :size="64" />
          </div>
        </div>
        
        <div class="detail-info">
          <div class="detail-section">
            <h4>기본 정보</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">생성일</span>
                <span class="info-value">{{ formatFullDate(item.created_at) }}</span>
              </div>
              <div class="info-item" v-if="item.model">
                <span class="info-label">모델</span>
                <span class="info-value">{{ item.model }}</span>
              </div>
              <div class="info-item" v-if="item.style">
                <span class="info-label">스타일</span>
                <span class="info-value">{{ item.style }}</span>
              </div>
              <div class="info-item" v-if="item.type === 'video' && item.duration">
                <span class="info-label">길이</span>
                <span class="info-value">{{ item.duration }}초</span>
              </div>
              <div class="info-item" v-if="item.project_id">
                <span class="info-label">프로젝트</span>
                <span class="info-value">{{ item.project_name || '연결됨' }}</span>
              </div>
            </div>
          </div>
          
          <div v-if="item.tags && item.tags.length > 0" class="detail-section">
            <h4>태그</h4>
            <div class="tags-list">
              <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
          
          <div v-if="item.prompt" class="detail-section">
            <h4>생성 프롬프트</h4>
            <p class="prompt-text">{{ item.prompt }}</p>
          </div>
          
          <div v-if="item.parameters" class="detail-section">
            <h4>생성 파라미터</h4>
            <div class="parameters-grid">
              <div v-for="(value, key) in item.parameters" :key="key" class="param-item">
                <span class="param-label">{{ formatParamLabel(key) }}</span>
                <span class="param-value">{{ value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button @click="copyPrompt" class="icon-button" title="프롬프트 복사">
          <Clipboard :size="20" />
        </button>
        <button @click="$emit('download', item)" class="icon-button" title="다운로드">
          <Download :size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { X, Clipboard, Download, Image, Video } from 'lucide-vue-next';

const props = defineProps({
  item: Object
});

const emit = defineEmits(['close', 'copy', 'download']);

const getTypeIcon = (type) => {
  return type === 'video' ? Video : Image;
};

const formatFullDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatParamLabel = (key) => {
  const labels = {
    aspect_ratio: '화면 비율',
    num_steps: '스텝 수',
    guidance_scale: '가이던스 스케일',
    seed: '시드',
    width: '너비',
    height: '높이',
    fps: 'FPS',
    duration: '길이'
  };
  return labels[key] || key;
};

const copyPrompt = () => {
  if (props.item?.prompt) {
    navigator.clipboard.writeText(props.item.prompt);
    // 알림 토스트 표시하려면 여기에 추가
    alert('프롬프트가 클립보드에 복사되었습니다.');
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
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}


.modal-close-button {
  position: absolute;
  top: 20px;
  right: 20px;
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
  z-index: 10;
}

.modal-close-button:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 모달 바디 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  gap: 30px;
}

.detail-media {
  flex: 0 0 400px;
  max-width: 400px;
}

.detail-media img,
.detail-media video {
  width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: var(--shadow-md);
}

.placeholder-media {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 8px;
  color: var(--text-secondary);
}

.detail-info {
  flex: 1;
  min-width: 0;
}

/* 상세 섹션 */
.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
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

/* 프롬프트 */
.prompt-text {
  color: var(--text-primary);
  line-height: 1.6;
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: 6px;
  font-size: 0.95rem;
}

/* 파라미터 */
.parameters-grid {
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

/* 모달 액션 */
.modal-actions {
  position: absolute;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
}

.icon-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.icon-button:hover {
  transform: scale(1.1);
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .modal-body {
    flex-direction: column;
  }
  
  .detail-media {
    flex: none;
    max-width: 100%;
  }
  
  .info-grid,
  .parameters-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .action-button {
    width: 100%;
    justify-content: center;
  }
}
</style>