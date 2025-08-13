<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container" @click.stop>
        <!-- 헤더 -->
        <div class="modal-header">
          <div class="header-info">
            <h3>이미지 상세보기</h3>
            <span v-if="image.element_name" class="image-name">{{ image.element_name }}</span>
          </div>
          <button @click="$emit('close')" class="close-btn">✕</button>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="modal-content">
          <!-- 이미지 영역 -->
          <div class="image-section">
            <img 
              :src="image.storage_image_url || image.result_image_url || image.thumbnail_url" 
              :alt="image.prompt_used || 'AI Generated Image'"
              class="detail-image"
              @click="toggleZoom"
              :class="{ 'zoomed': isZoomed }"
            />
            
            <!-- 줌 인디케이터 -->
            <div v-if="!isZoomed" class="zoom-hint">
              🔍 클릭하여 확대
            </div>
          </div>

          <!-- 정보 영역 -->
          <div class="info-section">
            <!-- 기본 정보 -->
            <div class="info-group">
              <h4>기본 정보</h4>
              <div class="info-item">
                <span class="label">카테고리:</span>
                <span class="value">{{ getCategoryLabel(image.image_type) }}</span>
              </div>
              <div v-if="image.element_name" class="info-item">
                <span class="label">이름:</span>
                <span class="value">{{ image.element_name }}</span>
              </div>
              <div class="info-item">
                <span class="label">모델:</span>
                <span class="value">{{ image.generation_model || 'Unknown' }}</span>
              </div>
              <div v-if="image.metadata?.image_size" class="info-item">
                <span class="label">크기:</span>
                <span class="value">{{ image.metadata.image_size }}</span>
              </div>
              <div class="info-item">
                <span class="label">생성일:</span>
                <span class="value">{{ formatDate(image.created_at) }}</span>
              </div>
              <div class="info-item">
                <span class="label">즐겨찾기:</span>
                <button 
                  @click="toggleFavorite"
                  class="favorite-btn"
                  :class="{ active: image.is_favorite }"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" :fill="image.is_favorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 프롬프트 -->
            <div class="info-group">
              <div class="group-header">
                <h4>프롬프트</h4>
                <button 
                  @click="copyPrompt" 
                  class="copy-btn"
                  title="프롬프트 복사"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              <div class="prompt-text">
                {{ image.prompt_used || '프롬프트 정보 없음' }}
              </div>
            </div>

            <!-- 태그 -->
            <div v-if="image.tags && image.tags.length > 0" class="info-group">
              <h4>태그</h4>
              <div class="tags-container">
                <span 
                  v-for="(tag, index) in image.tags" 
                  :key="index"
                  class="tag-chip"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- 액션 버튼들 -->
            <div class="action-buttons">
              <button @click="downloadImage" class="icon-btn" title="다운로드">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              <button @click="$emit('edit-tags', image)" class="icon-btn" title="태그 편집">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              </button>
              <button @click="$emit('connect-scene', image)" class="icon-btn" title="씬에 연결">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
              <button @click="handleImageEdit" class="icon-btn btn-secondary" title="이미지 수정">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button @click="handleVideoGeneration" class="icon-btn btn-primary" title="영상 생성">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  image: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'update', 'edit-tags', 'connect-scene', 'edit-image'])

// State
const isZoomed = ref(false)

// Methods
const handleOverlayClick = () => {
  if (!isZoomed.value) {
    emit('close')
  } else {
    isZoomed.value = false
  }
}

const toggleZoom = () => {
  isZoomed.value = !isZoomed.value
}

const getCategoryLabel = (type) => {
  const labels = {
    character: '캐릭터',
    background: '배경',
    scene: '씬',
    object: '오브젝트'
  }
  return labels[type] || type
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toggleFavorite = async () => {
  try {
    const newValue = !props.image.is_favorite
    const { error } = await supabase
      .from('gen_images')
      .update({ is_favorite: newValue })
      .eq('id', props.image.id)
    
    if (error) throw error
    
    // 부모 컴포넌트에 업데이트 알림
    emit('update', { ...props.image, is_favorite: newValue })
  } catch (error) {
    console.error('즐겨찾기 토글 실패:', error)
    alert('즐겨찾기 변경에 실패했습니다.')
  }
}

const downloadImage = async () => {
  const imageUrl = props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url
  
  // 프로젝트 이름 가져오기
  let projectName = 'project'
  if (props.image.project_id) {
    try {
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', props.image.project_id)
        .single()
      if (data && data.name) {
        projectName = data.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')
      }
    } catch (error) {
      console.error('프로젝트 이름 가져오기 실패:', error)
    }
  }
  
  // 씬 번호 가져오기  
  let sceneNumber = ''
  if (props.image.production_sheet_id) {
    try {
      const { data } = await supabase
        .from('production_sheets')
        .select('scene_number')
        .eq('id', props.image.production_sheet_id)
        .single()
      if (data && data.scene_number) {
        sceneNumber = `_${data.scene_number}`
      }
    } catch (error) {
      console.error('씬 번호 가져오기 실패:', error)
    }
  }
  
  const link = document.createElement('a')
  link.href = imageUrl
  link.download = `image_${projectName}${sceneNumber}.png`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(props.image.prompt_used || '')
    // 간단한 피드백 (alert 대신 더 부드러운 피드백 고려)
    const btn = document.querySelector('.copy-btn')
    if (btn) {
      const originalText = btn.textContent
      btn.textContent = '✅'
      setTimeout(() => {
        btn.textContent = originalText
      }, 1000)
    }
  } catch (error) {
    console.error('복사 실패:', error)
    alert('프롬프트 복사에 실패했습니다.')
  }
}

const handleImageEdit = () => {
  // 이미지 수정을 위한 데이터 전달
  const editData = {
    model: props.image.generation_model || 'gpt-4o',
    size: props.image.metadata?.image_size || '1024x1024',
    category: props.image.image_type || 'scene',
    name: props.image.element_name || '',
    prompt: props.image.prompt_used || '',
    referenceImage: props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url
  }
  
  emit('edit-image', editData)
  emit('close')
}

const handleVideoGeneration = () => {
  // TODO: 영상 생성 기능 구현
  console.log('영상 생성 기능 - 추후 구현 예정')
  alert('영상 생성 기능은 준비 중입니다.')
}
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
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 1400px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.image-name {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  transform: scale(1.1);
}

.modal-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 이미지 섹션 */
.image-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--bg-secondary);
  overflow: auto;
  padding: 20px;
}

.detail-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: zoom-in;
  transition: all 0.3s;
  border-radius: 8px;
}

.detail-image.zoomed {
  max-width: none;
  max-height: none;
  cursor: zoom-out;
  transform-origin: center;
}

.zoom-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 20px;
  font-size: 0.85rem;
  pointer-events: none;
}

/* 정보 섹션 */
.info-section {
  width: 400px;
  padding: 24px;
  overflow-y: auto;
  border-left: 1px solid var(--border-color);
}

.info-group {
  margin-bottom: 24px;
}

.info-group h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.group-header h4 {
  margin: 0;
}

.copy-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover {
  background: var(--bg-secondary);
  transform: scale(1.1);
}

.copy-btn svg {
  width: 16px;
  height: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.info-item .label {
  width: 80px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info-item .value {
  color: var(--text-primary);
  flex: 1;
}

.favorite-btn {
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-btn:hover {
  transform: scale(1.2);
}

.favorite-btn.active {
  color: #fbbf24;
}

.favorite-btn svg {
  width: 20px;
  height: 20px;
}

.prompt-text {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-primary);
  max-height: 150px;
  overflow-y: auto;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  padding: 4px 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-start;
}

.icon-btn {
  width: 40px;
  height: 40px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--bg-tertiary);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.icon-btn.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.icon-btn.btn-primary:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
  box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
}

.icon-btn.btn-secondary {
  background: #8b5cf6;
  color: white;
  border-color: #8b5cf6;
}

.icon-btn.btn-secondary:hover {
  background: #7c3aed;
  border-color: #7c3aed;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

/* 반응형 */
@media (max-width: 768px) {
  .modal-content {
    flex-direction: column;
  }

  .info-section {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border-color);
  }

  .image-section {
    min-height: 300px;
  }
}
</style>