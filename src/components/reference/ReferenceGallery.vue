<template>
  <div class="reference-gallery">
    <!-- 컬럼 컨트롤 -->
    <div v-if="materials.length > 0 && showColumnControl" class="gallery-controls">
      <ColumnControl 
        v-model="columnCount"
        :min-columns="2"
        :max-columns="8"
        @change="updateColumnCount"
      />
    </div>
    
    <div v-if="materials.length === 0" class="empty-gallery">
      <FileText :size="48" class="empty-icon" />
      <p>표시할 자료가 없습니다.</p>
    </div>
    
    <div v-else class="gallery-masonry" :style="{ columnCount: columnCount }">
      <div 
        v-for="material in materials" 
        :key="material.id || material.title"
        class="gallery-item"
        @click="$emit('view', material)"
      >
        <!-- 이미지/비디오 영역 -->
        <div class="item-image">
          <!-- 비디오인 경우 -->
          <template v-if="material.type === 'video'">
            <!-- Pexels 비디오는 이미지 썸네일 사용 -->
            <img 
              v-if="material.source === 'pexels' && material.thumbnail && material.thumbnail.includes('.jpg')"
              :src="material.thumbnail"
              :alt="material.title || 'Video thumbnail'"
              class="video-thumbnail"
              loading="lazy"
              @error="handleImageError"
            />
            <!-- 다른 비디오는 video 태그로 미리보기 -->
            <video 
              v-else-if="material.thumbnail || material.preview_url"
              :src="material.preview_url || material.thumbnail"
              class="video-preview"
              muted
              loop
              preload="metadata"
              @mouseenter="handleVideoHover"
              @mouseleave="handleVideoLeave"
              @error="handleImageError"
            />
          </template>
          <!-- 이미지인 경우 img 태그 -->
          <img 
            v-else-if="material.image || material.thumbnail || material.storage_url"
            :src="material.thumbnail || material.image || material.storage_url"
            :alt="material.title"
            loading="lazy"
            @error="handleImageError"
          />
          <div v-else class="placeholder-image">
            <FileText :size="32" />
          </div>
          
          <!-- 비디오 인디케이터 -->
          <div v-if="material.type === 'video'" class="video-indicator">
            <Play :size="32" />
            <span v-if="material.duration" class="video-duration">
              {{ formatDuration(material.duration) }}
            </span>
          </div>
          
          <!-- 호버 오버레이 -->
          <div class="image-overlay">
            <div class="overlay-actions">
              <button 
                v-if="showSaveButton && !material.isSaved"
                @click.stop="$emit('save', material)"
                class="action-btn save-btn"
                title="저장"
              >
                <Download :size="16" />
              </button>
              
              <div v-if="showSaveButton && material.isSaved" class="saved-indicator" title="저장됨">
                <Check :size="16" />
              </div>
              
              <button 
                v-if="!showSaveButton"
                @click.stop="$emit('favorite', material.id)"
                :class="['action-btn', 'favorite-btn', { active: material.is_favorite }]"
                title="즐겨찾기"
              >
                <Star :size="16" :fill="material.is_favorite ? 'currentColor' : 'none'" />
              </button>
              
              <button 
                @click.stop="$emit('view', material)"
                class="action-btn view-btn"
                title="상세보기"
              >
                <Eye :size="16" />
              </button>
              
              <button 
                v-if="!showSaveButton"
                @click.stop="handleDelete(material)"
                class="action-btn delete-btn"
                title="삭제"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
          
          <!-- 하단 정보 오버레이 -->
          <div class="info-overlay">
            <div class="info-overlay-content">
              <h4 class="overlay-title">{{ truncateText(material.title, 40) }}</h4>
              <div class="overlay-metadata">
                <span v-if="material.sourceLabel || getSourceLabel(material.source || material.source_type)" class="source-badge">
                  {{ material.sourceLabel || getSourceLabel(material.source || material.source_type) }}
                </span>
                <span v-if="getLicense(material) && material.source_type === 'wikipedia'" class="overlay-badge">
                  {{ getLicense(material) }}
                </span>
                <span v-if="getImageDimensions(material)" class="overlay-resolution">
                  {{ getImageDimensions(material) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { FileText, Download, Star, Eye, Trash2, Check, Play } from 'lucide-vue-next'
import ColumnControl from '@/components/common/ColumnControl.vue'

const emit = defineEmits(['save', 'favorite', 'delete', 'view'])
const props = defineProps({
  materials: {
    type: Array,
    required: true
  },
  showSaveButton: {
    type: Boolean,
    default: false
  },
  showColumnControl: {
    type: Boolean,
    default: true
  }
})

// 컬럼 수 상태 (localStorage에 저장)
const savedColumns = localStorage.getItem('referenceGalleryColumns')
const columnCount = ref(savedColumns ? parseInt(savedColumns) : 4)

const updateColumnCount = (count) => {
  columnCount.value = count
  localStorage.setItem('referenceGalleryColumns', count.toString())
}

// 메서드
const handleImageError = (event) => {
  // 이미지 로드 실패 시 플레이스홀더 표시
  const imgElement = event.target
  const parentDiv = imgElement.parentElement
  
  // 이미지 숨기기
  imgElement.style.display = 'none'
  
  // 플레이스홀더 추가 (아직 없는 경우)
  if (!parentDiv.querySelector('.placeholder-image')) {
    const placeholder = document.createElement('div')
    placeholder.className = 'placeholder-image image-error'
    placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>'
    parentDiv.appendChild(placeholder)
  }
}

const handleDelete = (material) => {
  if (confirm(`'${material.title}' 자료를 삭제하시겠습니까?`)) {
    emit('delete', material.id)
  }
}

const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const getSourceLabel = (source) => {
  const labels = {
    'wikipedia': 'Wikipedia',
    'external_image': '이미지',
    'google': 'Google',
    'pixabay': 'Pixabay',
    'unsplash': 'Unsplash',
    'pexels': 'Pexels',
    'flickr': 'Flickr',
    'commons': 'Commons',
    'wikimedia_commons': 'Commons',
    'met': 'Met Museum',
    'europeana': 'Europeana',
    'dpla': 'DPLA',
    'user_upload': '업로드'
  }
  return labels[source] || '기타'
}

const getCategoryLabel = (category) => {
  const labels = {
    'character': '인물',
    'location': '장소',
    'object': '소품',
    'general': '일반'
  }
  return labels[category] || category
}

// 라이선스 정보 추출 (검색 결과와 저장된 자료 모두 처리)
const getLicense = (material) => {
  // 검색 결과의 경우
  if (material.license) {
    return typeof material.license === 'object' ? material.license.name : material.license
  }
  // 저장된 자료의 경우 (metadata에서 추출)
  if (material.metadata?.license) {
    return typeof material.metadata.license === 'object' ? material.metadata.license.name : material.metadata.license
  }
  return null
}

// 이미지 크기 정보 추출
const getImageDimensions = (material) => {
  // 검색 결과의 경우
  if (material.imageMetadata?.width && material.imageMetadata?.height) {
    return `${material.imageMetadata.width}×${material.imageMetadata.height}`
  }
  // 저장된 자료의 경우 (metadata에서 추출)
  if (material.metadata?.imageMetadata?.width && material.metadata?.imageMetadata?.height) {
    return `${material.metadata.imageMetadata.width}×${material.metadata.imageMetadata.height}`
  }
  return null
}

// 비디오 시간 포맷팅
const formatDuration = (seconds) => {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 비디오 호버 핸들러 - 안전한 재생
const handleVideoHover = (event) => {
  const video = event.target
  if (video && video.paused) {
    video.play().catch(err => {
      // 재생 실패 시 조용히 무시
      console.log('Video play failed:', err.message)
    })
  }
}

// 비디오 마우스 떠남 핸들러 - 안전한 일시정지
const handleVideoLeave = (event) => {
  const video = event.target
  if (video && !video.paused) {
    video.pause()
  }
}
</script>

<style scoped>
.reference-gallery {
  width: 100%;
}

.empty-gallery {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-secondary);
  text-align: center;
}

.empty-icon {
  margin-bottom: 1rem;
  color: var(--text-tertiary);
}

/* Gallery controls */
.gallery-controls {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
}

/* Masonry layout using CSS columns */
.gallery-masonry {
  column-gap: 1rem;
  padding: 0.5rem 0;
  transition: column-count 0.3s ease;
}

/* 반응형 미디어 쿼리는 컬럼 컨트롤이 없을 때만 적용 */
@media (max-width: 1400px) {
  .gallery-masonry:not([style*="column-count"]) {
    column-count: 3;
  }
}

@media (max-width: 900px) {
  .gallery-masonry:not([style*="column-count"]) {
    column-count: 2;
  }
}

@media (max-width: 600px) {
  .gallery-masonry {
    column-count: 1 !important; /* 모바일에서는 항상 1열 */
  }
}

.gallery-item {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  cursor: pointer;
  break-inside: avoid;
  margin-bottom: 1rem;
  display: inline-block;
  width: 100%;
}

.dark .gallery-item {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

.gallery-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.item-image {
  position: relative;
  width: 100%;
  max-height: 400px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.item-image img,
.item-image .video-preview,
.item-image .video-thumbnail {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
  object-fit: cover;
  object-position: center;
}

.video-preview {
  background: black;
}

.video-thumbnail {
  background: var(--bg-secondary);
}

.gallery-item:hover .item-image img,
.gallery-item:hover .item-image .video-preview,
.gallery-item:hover .item-image .video-thumbnail {
  transform: scale(1.05);
}

.placeholder-image {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.placeholder-image.image-error {
  background: var(--bg-tertiary);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.gallery-item:hover .image-overlay {
  opacity: 1;
  pointer-events: auto;
}

/* 하단 정보 오버레이 */
.info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.6));
  padding: 0.75rem;
  color: white;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.gallery-item:hover .info-overlay {
  transform: translateY(0);
}

.info-overlay-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.overlay-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
}

.overlay-metadata {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.75rem;
  opacity: 0.9;
}

.source-badge {
  padding: 0.15rem 0.4rem;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.overlay-badge {
  padding: 0.15rem 0.4rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-weight: 500;
}

.overlay-resolution {
  font-family: monospace;
}

.overlay-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: white;
  transform: scale(1.1);
}

.save-btn:hover {
  background: var(--primary-color);
  color: white;
}

.saved-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  pointer-events: none;
}

.favorite-btn:hover {
  background: #fbbf24;
  color: white;
}

.favorite-btn.active {
  background: #fbbf24;
  color: white;
}

.view-btn:hover {
  background: var(--info-color);
  color: white;
}

.delete-btn:hover {
  background: var(--danger-color);
  color: white;
}

/* Remove all item-content related styles since we don't need them anymore */

/* 모바일 반응형 */
@media (max-width: 768px) {
  .item-image {
    max-height: 300px;
  }
}

@media (max-width: 480px) {
  .overlay-actions {
    gap: 0.25rem;
  }
  
  .action-btn {
    width: 32px;
    height: 32px;
  }
  
  .item-image {
    max-height: 250px;
  }
}

/* 비디오 인디케이터 */
.video-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: white;
  pointer-events: none;
}

.video-indicator svg {
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  padding: 8px;
  width: 48px;
  height: 48px;
}

.video-duration {
  background: rgba(0, 0, 0, 0.7);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}
</style>