<template>
  <div class="reference-gallery">
    <div v-if="materials.length === 0" class="empty-gallery">
      <FileText :size="48" class="empty-icon" />
      <p>표시할 자료가 없습니다.</p>
    </div>
    
    <div v-else class="gallery-masonry">
      <div 
        v-for="material in materials" 
        :key="material.id || material.title"
        class="gallery-item"
        @click="$emit('view', material)"
      >
        <!-- 이미지 영역 -->
        <div class="item-image">
          <img 
            v-if="material.image || material.thumbnail || material.storage_url"
            :src="material.thumbnail || material.image || material.storage_url"
            :alt="material.title"
            loading="lazy"
            @error="handleImageError"
          />
          <div v-else class="placeholder-image">
            <FileText :size="32" />
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
import { FileText, Download, Star, Eye, Trash2, Check } from 'lucide-vue-next'

const emit = defineEmits(['save', 'favorite', 'delete', 'view'])
const props = defineProps({
  materials: {
    type: Array,
    required: true
  },
  showSaveButton: {
    type: Boolean,
    default: false
  }
})

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

/* Masonry layout using CSS columns */
.gallery-masonry {
  column-count: 4;
  column-gap: 1rem;
  padding: 0.5rem 0;
}

@media (max-width: 1400px) {
  .gallery-masonry {
    column-count: 3;
  }
}

@media (max-width: 900px) {
  .gallery-masonry {
    column-count: 2;
  }
}

@media (max-width: 600px) {
  .gallery-masonry {
    column-count: 1;
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

.item-image img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.3s ease;
  object-fit: cover;
  object-position: center;
}

.gallery-item:hover .item-image img {
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
</style>