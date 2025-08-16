<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <!-- 헤더 -->
      <div class="modal-header">
        <div class="header-info">
          <h2 class="modal-title">{{ material?.title || '자료 상세보기' }}</h2>
          <div class="header-badges">
            <span class="source-badge" :class="material?.source_type || material?.source">
              {{ getSourceLabel(material?.source_type || material?.source) }}
            </span>
            <span 
              v-if="material?.category && material?.category !== 'general'"
              class="category-badge"
            >
              {{ getCategoryLabel(material?.category) }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button 
            v-if="!isSearchResult"
            @click="toggleFavorite"
            :class="['action-btn', 'favorite-btn', { active: material?.is_favorite }]"
            title="즐겨찾기"
          >
            <Star :size="20" :fill="material?.is_favorite ? 'currentColor' : 'none'" />
          </button>
          <button @click="$emit('close')" class="action-btn close-btn" title="닫기">
            <X :size="20" />
          </button>
        </div>
      </div>

      <!-- 콘텐츠 -->
      <div class="modal-body">
        <!-- 이미지 섹션 (오버레이 정보 포함) -->
        <div v-if="material?.image || material?.thumbnail || material?.storage_url" class="image-section">
          <img 
            :src="material.image || material.thumbnail || material.storage_url"
            :alt="material.title"
            class="detail-image"
            @error="handleImageError"
          />
          
          <!-- 하단 정보 오버레이 -->
          <div class="info-overlay">
            <div class="overlay-content">
              <!-- 라이선스 정보 -->
              <div class="overlay-item" v-if="getLicense()">
                <span class="overlay-label">라이선스</span>
                <span class="overlay-value">
                  {{ getLicense() }}
                </span>
              </div>
              
              <!-- 출처 -->
              <div class="overlay-item" v-if="material?.source_type || material?.source">
                <span class="overlay-label">출처</span>
                <span class="overlay-value">{{ material.sourceLabel || getSourceLabel(material.source_type || material.source) }}</span>
              </div>
              
              <!-- 해상도 -->
              <div class="overlay-item" v-if="getImageDimensions()">
                <span class="overlay-label">해상도</span>
                <span class="overlay-value">
                  {{ getImageDimensions() }}px
                </span>
              </div>
              
              <!-- 원본 링크 -->
              <a 
                v-if="material?.url || material?.source_url"
                :href="material.url || material.source_url" 
                target="_blank" 
                rel="noopener noreferrer"
                class="overlay-link"
              >
                원본 보기 <ExternalLink :size="14" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 하단 액션 버튼 -->
      <div class="modal-footer">
        <div class="footer-left">
          <button 
            v-if="!isSearchResult"
            @click="handleDelete"
            class="action-btn delete-btn"
          >
            <Trash2 :size="16" />
            삭제
          </button>
        </div>
        <div class="footer-right">
          <button 
            v-if="isSearchResult"
            @click="handleSave"
            class="action-btn save-btn"
          >
            <Download :size="16" />
            저장
          </button>
          <button @click="$emit('close')" class="action-btn secondary-btn">
            닫기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Star, X, Save, ExternalLink, Trash2, Download } from 'lucide-vue-next'

const emit = defineEmits(['close', 'favorite', 'delete', 'save'])
const props = defineProps({
  material: {
    type: Object,
    required: true
  }
})

// 반응형 데이터
const userNotes = ref('')

// 컴퓨티드
const isSearchResult = computed(() => 
  !props.material?.id || typeof props.material.id === 'string' && !props.material.created_at
)

// 메서드
const handleOverlayClick = (event) => {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}

const toggleFavorite = () => {
  if (props.material?.id) {
    emit('favorite', props.material.id)
  }
}

const saveNotes = () => {
  if (props.material?.id) {
    emit('save', props.material.id, { notes: userNotes.value })
  }
}

const handleDelete = () => {
  if (props.material?.id) {
    emit('delete', props.material.id)
  }
}

const handleSave = () => {
  // 검색 결과를 저장하는 경우 (material 객체 전달)
  if (!props.material?.id) {
    emit('save', props.material)
  }
}

const handleImageError = (event) => {
  event.target.style.display = 'none'
}

const getSourceLabel = (source) => {
  const labels = {
    'wikipedia': 'Wikipedia',
    'external_image': '외부 이미지',
    'pixabay': 'Pixabay',
    'unsplash': 'Unsplash',
    'pexels': 'Pexels',
    'flickr': 'Flickr',
    'commons': 'Wikimedia Commons',
    'wikimedia_commons': 'Wikimedia Commons',
    'met': 'Metropolitan Museum',
    'europeana': 'Europeana',
    'dpla': 'DPLA',
    'user_upload': '사용자 업로드'
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

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 라이선스 정보 추출 (검색 결과와 저장된 자료 모두 처리)
const getLicense = () => {
  if (!props.material) return null
  
  // 검색 결과의 경우
  if (props.material.license) {
    return typeof props.material.license === 'object' ? props.material.license.name : props.material.license
  }
  // 저장된 자료의 경우 (metadata에서 추출)
  if (props.material.metadata?.license) {
    return typeof props.material.metadata.license === 'object' ? props.material.metadata.license.name : props.material.metadata.license
  }
  return null
}

// 이미지 크기 정보 추출
const getImageDimensions = () => {
  if (!props.material) return null
  
  // 검색 결과의 경우
  if (props.material.imageMetadata?.width && props.material.imageMetadata?.height) {
    return `${props.material.imageMetadata.width} × ${props.material.imageMetadata.height}`
  }
  // 저장된 자료의 경우 (metadata에서 추출)
  if (props.material.metadata?.imageMetadata?.width && props.material.metadata?.imageMetadata?.height) {
    return `${props.material.metadata.imageMetadata.width} × ${props.material.metadata.imageMetadata.height}`
  }
  return null
}

// 워처
watch(() => props.material?.notes, (newNotes) => {
  userNotes.value = newNotes || ''
}, { immediate: true })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  gap: 1rem;
}

.header-info {
  flex: 1;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.header-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.source-badge,
.category-badge {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 12px;
  white-space: nowrap;
}

.source-badge {
  background: var(--primary-color);
  color: white;
}

.source-badge.wikipedia {
  background: #0066cc;
}

.source-badge.external_image {
  background: #10b981;
}

.source-badge.pixabay {
  background: #16a34a;
}

.source-badge.unsplash {
  background: #111111;
}

.source-badge.pexels {
  background: #05a081;
}

.source-badge.flickr {
  background: #ff0084;
}

.source-badge.commons,
.source-badge.wikimedia_commons {
  background: #006699;
}

.source-badge.met {
  background: #e4002b;
}

.source-badge.europeana {
  background: #2a85d3;
}

.source-badge.dpla {
  background: #4a7c59;
}

.category-badge {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.favorite-btn {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.favorite-btn:hover {
  background: #fbbf24;
  color: white;
  border-color: #fbbf24;
}

.favorite-btn.active {
  background: #fbbf24;
  color: white;
  border-color: #fbbf24;
}

.close-btn {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.image-section {
  position: relative;
  width: 100%;
  background: var(--bg-secondary);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  max-height: 80vh;
  overflow: hidden;
}

.detail-image {
  width: 100%;
  height: auto;
  max-height: 80vh;
  object-fit: contain;
  display: block;
}

/* 하단 정보 오버레이 */
.info-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.7));
  padding: 1rem 1.5rem;
  backdrop-filter: blur(10px);
}

.overlay-content {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  color: white;
}

.overlay-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.overlay-label {
  font-size: 0.75rem;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.overlay-value {
  font-size: 0.9rem;
  font-weight: 500;
}

.overlay-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: white;
  text-decoration: none;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 0.85rem;
  transition: all 0.2s;
  margin-left: auto;
}

.overlay-link:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.info-content {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.extract-content {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.notes-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  min-height: 80px;
}

.notes-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.notes-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.save-notes-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.save-notes-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.save-notes-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.source-info,
.datetime-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.source-info p,
.datetime-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--primary-color);
  text-decoration: none;
  margin-left: 0.5rem;
}

.source-link:hover {
  text-decoration: underline;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  gap: 1rem;
}

.footer-left,
.footer-right {
  display: flex;
  gap: 0.5rem;
}

.delete-btn {
  background: transparent;
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
  padding: 0.5rem 1rem;
}

.delete-btn:hover {
  background: var(--danger-color);
  color: white;
}

.save-btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
}

.save-btn:hover {
  background: var(--primary-dark);
}

.secondary-btn {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
}

.secondary-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
  }
  
  .modal-content {
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 1rem;
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .header-actions {
    align-self: flex-end;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .detail-image {
    max-height: 300px;
  }
  
  .modal-footer {
    padding: 1rem;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .footer-left,
  .footer-right {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .modal-title {
    font-size: 1.1rem;
  }
  
  .action-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }
  
  .detail-image {
    max-height: 250px;
  }
}
</style>