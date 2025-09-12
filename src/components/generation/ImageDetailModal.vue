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
            <!-- 편집 모드 -->
            <div v-if="isEditMode" class="edit-container">
              <!-- 편집 툴바 -->
              <div class="edit-toolbar">
                <div class="toolbar-group">
                  <button 
                    @click="setEditMode('crop')" 
                    class="toolbar-btn"
                    :class="{ active: currentEditMode === 'crop' }"
                    title="크롭"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 2v14a2 2 0 0 0 2 2h14"/>
                      <path d="M2 6h14a2 2 0 0 1 2 2v14"/>
                    </svg>
                  </button>
                  <button 
                    @click="setEditMode('layers')" 
                    class="toolbar-btn"
                    :class="{ active: currentEditMode === 'layers' }"
                    title="레이어"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                      <polyline points="2 17 12 22 22 17"/>
                      <polyline points="2 12 12 17 22 12"/>
                    </svg>
                  </button>
                </div>
                
                <!-- 크롭 비율 선택 -->
                <div v-if="currentEditMode === 'crop'" class="toolbar-group">
                  <select v-model="selectedCropRatio" @change="onCropRatioChange" class="ratio-select">
                    <option v-for="(ratio, key) in cropRatios" :key="key" :value="key">
                      {{ ratio.label }}
                    </option>
                  </select>
                </div>
                
                <!-- 레이어 컨트롤 -->
                <div v-if="currentEditMode === 'layers'" class="toolbar-group">
                  <button @click="showLayerSelector = true" class="toolbar-btn" title="레이어 추가">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>
                
                <div class="toolbar-group">
                  <button @click="applyEdit" class="btn-apply" :disabled="isProcessing">
                    {{ isProcessing ? '처리 중...' : '적용' }}
                  </button>
                  <button @click="cancelEdit" class="btn-cancel">취소</button>
                </div>
              </div>
              
              <!-- 캔버스 -->
              <canvas 
                ref="editorCanvas"
                class="editor-canvas"
                @mousedown="onCanvasMouseDown"
                @mousemove="onCanvasMouseMove"
                @mouseup="onCanvasMouseUp"
                @mouseleave="onCanvasMouseUp"
              ></canvas>
              
              <!-- 레이어 패널 -->
              <div v-if="currentEditMode === 'layers' && editor?.layers.length > 0" class="layers-panel">
                <h4>레이어</h4>
                <div 
                  v-for="(layer, index) in editor.layers" 
                  :key="layer.id"
                  class="layer-item"
                  :class="{ active: index === activeLayerIndex }"
                  @click="setActiveLayer(index)"
                >
                  <input 
                    type="checkbox" 
                    v-model="layer.visible"
                    @change="editor.drawImage()"
                  />
                  <span>{{ layer.name }}</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    v-model.number="layer.opacity"
                    @input="editor.drawImage()"
                    title="투명도"
                  />
                  <button @click="removeLayer(index)" class="btn-remove-layer">×</button>
                </div>
              </div>
            </div>
            
            <!-- 일반 보기 모드 -->
            <div v-else class="image-viewer">
              <!-- 이미지 미리보기 선택 -->
              <div v-if="processedImages.length > 0" class="image-preview-selector">
                <button 
                  v-for="preview in imagePreviewOptions" 
                  :key="preview.type"
                  @click="setSelectedPreview(preview.type)"
                  class="preview-btn"
                  :class="{ active: selectedPreview === preview.type }"
                  :title="preview.title"
                >
                  {{ preview.label }}
                </button>
              </div>
              
              <!-- 선택된 이미지 표시 -->
              <img 
                :src="computedSelectedImageUrl" 
                :alt="image.prompt_used || 'AI Generated Image'"
                class="detail-image"
                @click="toggleZoom"
                :class="{ 'zoomed': isZoomed }"
              />
            </div>
            
            <!-- 줌 인디케이터 -->
            <div v-if="!isZoomed && !isEditMode" class="zoom-hint">
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
                <div v-if="!isEditingCategory" class="category-container">
                  <span class="value">{{ getCategoryLabel(image.image_type) }}</span>
                  <button @click="startEditCategory" class="edit-category-btn" title="카테고리 편집">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
                <div v-else class="category-edit-container">
                  <select 
                    v-model="editingCategoryValue"
                    @change="saveEditCategory"
                    class="category-select"
                  >
                    <option value="scene">씬</option>
                    <option value="character">캐릭터</option>
                    <option value="background">배경</option>
                    <option value="object">오브젝트</option>
                  </select>
                  <button @click="cancelEditCategory" class="cancel-btn" title="취소">✕</button>
                </div>
              </div>
              <div v-if="image.element_name" class="info-item">
                <span class="label">이름:</span>
                <div v-if="!isEditingName" class="name-container">
                  <span class="value">{{ image.element_name }}</span>
                  <button @click="startEditName" class="edit-name-btn" title="이름 편집">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
                <div v-else class="name-edit-container">
                  <input 
                    v-model="editingNameValue"
                    @keyup.enter="saveEditName"
                    @keyup.escape="cancelEditName"
                    class="name-input"
                    placeholder="이름 입력"
                    maxlength="100"
                  />
                  <button @click="saveEditName" class="save-btn" title="저장">✓</button>
                  <button @click="cancelEditName" class="cancel-btn" title="취소">✕</button>
                </div>
              </div>
              <div class="info-item">
                <span class="label">모델:</span>
                <span class="value">{{ image.generation_model || 'Unknown' }}</span>
              </div>
              <div v-if="image.metadata?.image_size" class="info-item">
                <span class="label">크기:</span>
                <span class="value">{{ image.metadata.image_size }}</span>
              </div>
              <div v-if="image.file_size" class="info-item">
                <span class="label">파일 크기:</span>
                <span class="value" :class="getFileSizeColorClass(image.file_size)">
                  {{ formatFileSize(image.file_size) }}
                </span>
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
              <!-- 기본 액션 버튼들 -->
              <div class="button-group primary-actions">
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
              </div>

              <div class="button-divider"></div>

              <!-- 편집 액션 버튼들 -->  
              <div class="button-group edit-actions">
                <button @click="handleImageEdit" class="icon-btn btn-edit" title="이미지 편집">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button @click="handleImageRegenerate" class="icon-btn btn-secondary" title="이미지 재생성">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                </button>
                <button @click="handleVideoGeneration" class="icon-btn btn-primary" title="영상 생성">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </button>
              </div>
              
              <!-- Recraft 편집 옵션들 -->
              <div class="button-divider"></div>
              
              <button @click="openVectorizeModal" class="icon-btn btn-recraft" title="벡터 변환 (SVG)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                  <circle cx="12" cy="13" r="3"/>
                  <path d="m9 16 2 2 4-4"/>
                </svg>
              </button>
              
              <button @click="openUpscaleModal" class="icon-btn btn-recraft" title="이미지 업스케일">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
                  <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
                </svg>
              </button>
              
              <button @click="openRemoveBackgroundModal" class="icon-btn btn-recraft" title="배경 제거">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
                  <path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
                  <path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
                  <path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"/>
                  <path d="M19.071 19.071c.391.391 1.024.391 1.414 0s.391-1.024 0-1.414-1.024-.391-1.414 0-.391 1.024 0 1.414z"/>
                  <path d="M4.929 4.929c.391.391 1.024.391 1.414 0s.391-1.024 0-1.414-1.024-.391-1.414 0-.391 1.024 0 1.414z"/>
                  <path d="M19.071 4.929c.391-.391.391-1.024 0-1.414s-1.024-.391-1.414 0-.391 1.024 0 1.414 1.024.391 1.414 0z"/>
                  <path d="M4.929 19.071c.391-.391.391-1.024 0-1.414s-1.024-.391-1.414 0-.391 1.024 0 1.414 1.024.391 1.414 0z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- DrawCanvas 모달 -->
    <div v-if="showDrawCanvas" class="draw-canvas-modal">
      <DrawCanvas
        :imageUrl="image.storage_image_url || image.result_image_url || image.thumbnail_url"
        @save="handleDrawCanvasSave"
        @close="closeDrawCanvas"
      />
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { createImageEditor, CROP_RATIOS, EDIT_MODES } from '@/utils/imageEditor'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import DrawCanvas from './DrawCanvas.vue'
import { formatFileSize, getFileSizeColorClass } from '@/utils/fileSize'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  image: {
    type: Object,
    required: true
  },
  projectId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'update', 'edit-tags', 'connect-scene', 'edit-image', 'generate-video', 'vectorize', 'upscale', 'remove-background'])

// Stores
const authStore = useAuthStore()
const projectsStore = useProjectsStore()

// State
const isZoomed = ref(false)
const isEditMode = ref(false)
const currentEditMode = ref(EDIT_MODES.NONE)
const isProcessing = ref(false)
const editor = ref(null)
const editorCanvas = ref(null)
const selectedCropRatio = ref('FREE')
const cropRatios = CROP_RATIOS
const showLayerSelector = ref(false)
const availableImages = ref([])
const activeLayerIndex = ref(-1)
const isEditingName = ref(false)
const editingNameValue = ref('')
const isEditingCategory = ref(false)
const editingCategoryValue = ref('')
const showDrawCanvas = ref(false)

// 처리된 이미지들을 위한 상태
const processedImages = ref([])
const selectedPreview = ref('original')
const selectedImageUrl = ref('')

// Computed 속성들
const imagePreviewOptions = computed(() => {
  const options = [
    {
      type: 'original',
      label: '원본',
      title: '원본 이미지',
      url: props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url
    }
  ]

  // 처리된 이미지들 추가
  processedImages.value.forEach(processed => {
    if (processed.type === 'vectorize') {
      options.push({
        type: 'vectorize',
        label: '벡터',
        title: 'SVG 벡터 이미지',
        url: processed.url
      })
    } else if (processed.type === 'upscale') {
      options.push({
        type: 'upscale',
        label: '업스케일',
        title: `업스케일된 이미지 (${processed.upscale_factor || '4'}x)`,
        url: processed.url
      })
    } else if (processed.type === 'remove_background') {
      options.push({
        type: 'background_removed',
        label: '배경없음',
        title: '배경이 제거된 이미지',
        url: processed.url
      })
    }
  })

  return options
})

// 선택된 이미지 URL 계산
const computedSelectedImageUrl = computed(() => {
  const selectedOption = imagePreviewOptions.value.find(
    option => option.type === selectedPreview.value
  )
  return selectedOption?.url || (props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url)
})

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

// 처리된 이미지들 조회
const fetchProcessedImages = async () => {
  try {
    // gen_processed_images 테이블에서 모든 처리된 이미지 조회 (벡터화, 업스케일, 배경제거)
    const { data, error } = await supabase
      .from('gen_processed_images')
      .select('*')
      .eq('original_image_id', props.image.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching processed images:', error)
      return
    }

    // process_type에 따라 타입 매핑하고 upscale_factor 추출
    const mappedData = (data || []).map(item => ({
      ...item,
      type: item.process_type,
      url: item.processed_image_url,
      upscale_factor: item.metadata?.upscale_factor || 4 // 메타데이터에서 업스케일 팩터 추출
    }))
    
    processedImages.value = mappedData
  } catch (error) {
    console.error('Failed to fetch processed images:', error)
  }
}

// 미리보기 선택
const setSelectedPreview = (type) => {
  selectedPreview.value = type
  selectedImageUrl.value = computedSelectedImageUrl.value
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
  const imageUrl = props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url || props.image.image_url
  
  if (!imageUrl) {
    alert('다운로드할 수 없는 이미지입니다.')
    return
  }
  
  try {
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
    if (props.image.production_sheet_id || props.image.linked_scene_id) {
      const sheetId = props.image.production_sheet_id || props.image.linked_scene_id
      try {
        const { data } = await supabase
          .from('production_sheets')
          .select('scene_number')
          .eq('id', sheetId)
          .single()
        if (data && data.scene_number) {
          sceneNumber = `_${data.scene_number}`
        }
      } catch (error) {
        console.error('씬 번호 가져오기 실패:', error)
      }
    } else if (props.image.linked_scene_number) {
      sceneNumber = `_${props.image.linked_scene_number}`
    }
    
    // 카테고리 정보 추가
    let category = ''
    if (props.image.is_character || props.image.image_type === 'character') {
      category = '_character'
    } else if (props.image.is_background || props.image.image_type === 'background') {
      category = '_background'
    } else if (props.image.is_object || props.image.image_type === 'object') {
      category = '_object'
    } else if (sceneNumber) {
      category = '_scene'
    }
    
    // 캐릭터 이름 추가 (있는 경우)
    let characterName = ''
    if (props.image.element_name) {
      characterName = `_${props.image.element_name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`
    }
    
    // 타임스탬프 추가
    const timestamp = new Date().getTime()
    const fileName = `image_${projectName}${category}${characterName}${sceneNumber}_${timestamp}.png`
    
    // 이미지 다운로드 (CORS 문제 회피를 위해 fetch 사용)
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 메모리 정리
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('이미지 다운로드 오류:', error)
    // CORS 오류 시 기본 다운로드 시도
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `image_${new Date().getTime()}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
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

// 이름 편집 관련 함수
const startEditName = () => {
  isEditingName.value = true
  editingNameValue.value = props.image.element_name || ''
}

const cancelEditName = () => {
  isEditingName.value = false
  editingNameValue.value = ''
}

const saveEditName = async () => {
  if (!editingNameValue.value.trim()) {
    alert('이름을 입력해주세요.')
    return
  }
  
  try {
    const { error } = await supabase
      .from('gen_images')
      .update({ element_name: editingNameValue.value.trim() })
      .eq('id', props.image.id)
    
    if (error) throw error
    
    // 부모 컴포넌트에 업데이트 알림
    emit('update', { ...props.image, element_name: editingNameValue.value.trim() })
    
    isEditingName.value = false
    editingNameValue.value = ''
  } catch (error) {
    console.error('이름 변경 실패:', error)
    alert('이름 변경에 실패했습니다.')
  }
}

// 카테고리 편집 관련 함수
const startEditCategory = () => {
  isEditingCategory.value = true
  editingCategoryValue.value = props.image.image_type || 'scene'
}

const cancelEditCategory = () => {
  isEditingCategory.value = false
  editingCategoryValue.value = ''
}

const saveEditCategory = async () => {
  if (!editingCategoryValue.value) {
    alert('카테고리를 선택해주세요.')
    return
  }
  
  try {
    const { error } = await supabase
      .from('gen_images')
      .update({ image_type: editingCategoryValue.value })
      .eq('id', props.image.id)
    
    if (error) throw error
    
    // 부모 컴포넌트에 업데이트 알림
    emit('update', { ...props.image, image_type: editingCategoryValue.value })
    
    isEditingCategory.value = false
    editingCategoryValue.value = ''
  } catch (error) {
    console.error('카테고리 변경 실패:', error)
    alert('카테고리 변경에 실패했습니다.')
  }
}

// DrawCanvas 관련 메서드
const openDrawCanvas = () => {
  showDrawCanvas.value = true
}

const closeDrawCanvas = () => {
  showDrawCanvas.value = false
}

const handleDrawCanvasSave = async (data) => {
  try {
    // 그리기가 추가된 이미지를 저장
    const fileName = `drawn_${Date.now()}.png`
    const projectId = props.projectId || props.image.project_id || projectsStore.currentProject?.id
    
    if (!projectId) {
      console.error('프로젝트 ID를 찾을 수 없습니다.')
      alert('프로젝트 ID를 찾을 수 없습니다. 프로젝트를 선택해주세요.')
      return
    }
    const userId = authStore.user?.id
    
    if (!userId) {
      throw new Error('로그인이 필요합니다.')
    }
    
    // ref-images 버킷에 저장 (user_id/edited/projectId/fileName 형식)
    const filePath = `${userId}/edited/${projectId}/${fileName}`
    
    
    const { error: uploadError } = await supabase.storage
      .from('ref-images')
      .upload(filePath, data.file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }
    
    // Storage URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('ref-images')
      .getPublicUrl(filePath)
    
    // 데이터베이스에 새 이미지 레코드 생성
    const { data: newImage, error: dbError } = await supabase
      .from('gen_images')
      .insert({
        project_id: projectId,
        production_sheet_id: props.image.production_sheet_id || null,
        element_name: `${props.image.element_name || 'Edited'}_drawn`,
        image_type: props.image.image_type || 'scene',
        generation_model: 'edited',
        prompt_used: `Drawn on: ${props.image.element_name || 'image'}`,
        custom_prompt: `Drawing annotations added`,
        generation_status: 'completed',
        storage_image_url: publicUrl,
        result_image_url: publicUrl,
        reference_image_url: props.image.storage_image_url || props.image.result_image_url,
        style_id: props.image.style_id || null,
        style_name: props.image.style_name || null,
        metadata: {
          original_image_id: props.image.id,
          edit_type: 'drawing',
          annotations: data.annotations || [],
          created_by: 'draw_canvas',
          aspect_ratio: props.image.metadata?.aspect_ratio || '1:1'
        },
        tags: []
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('Database error:', dbError)
      throw dbError
    }
    
    // 부모 컴포넌트에 알림
    emit('update', newImage)
    
    // DrawCanvas 닫기
    closeDrawCanvas()
    
    alert('그리기가 저장되었습니다.')
  } catch (error) {
    console.error('그리기 저장 실패:', error)
    alert('그리기 저장에 실패했습니다: ' + error.message)
  }
}

const handleImageRegenerate = () => {
  // 이미지 재생성을 위한 데이터 전달 - Gemini 2.5 Flash를 기본 모델로 설정
  const editData = {
    model: 'gemini-2.5-flash-edit',
    size: props.image.metadata?.image_size || '1024x1024',
    category: props.image.image_type || 'scene',
    name: props.image.element_name || '',
    prompt: props.image.prompt_used || '',
    referenceImage: props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url,
    projectId: props.image.project_id // projectId 추가!
  }
  
  emit('edit-image', editData)
  emit('close')
}

const handleImageEdit = async () => {
  isEditMode.value = true
  currentEditMode.value = EDIT_MODES.CROP
  
  // 편집기 초기화
  await nextTick()
  if (editorCanvas.value) {
    const imageUrl = props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url
    editor.value = createImageEditor(imageUrl)
    await editor.value.initCanvas(editorCanvas.value)
    editor.value.setEditMode(EDIT_MODES.CROP)
  }
  
  // 프로젝트의 다른 이미지들 로드 (레이어용)
  if (props.projectId || props.image.project_id) {
    loadAvailableImages()
  }
}

// 편집 모드 설정
const setEditMode = (mode) => {
  currentEditMode.value = mode
  if (editor.value) {
    editor.value.setEditMode(mode)
  }
}

// 크롭 비율 변경
const onCropRatioChange = () => {
  if (editor.value) {
    const ratio = CROP_RATIOS[selectedCropRatio.value]
    editor.value.setCropRatio(ratio?.value || null)
  }
}

// 캔버스 마우스 이벤트
const onCanvasMouseDown = (e) => {
  if (editor.value) {
    editor.value.handleMouseDown(e)
  }
}

const onCanvasMouseMove = (e) => {
  if (editor.value) {
    editor.value.handleMouseMove(e)
  }
}

const onCanvasMouseUp = () => {
  if (editor.value) {
    editor.value.handleMouseUp()
  }
}

// 활성 레이어 설정
const setActiveLayer = (index) => {
  activeLayerIndex.value = index
  if (editor.value) {
    editor.value.activeLayerIndex = index
  }
}

// 레이어 제거
const removeLayer = (index) => {
  if (editor.value) {
    editor.value.removeLayer(index)
    activeLayerIndex.value = editor.value.activeLayerIndex
  }
}

// 사용 가능한 이미지 로드
const loadAvailableImages = async () => {
  try {
    const projectId = props.projectId || props.image.project_id || projectsStore.currentProject?.id
    
    if (!projectId) {
      console.error('프로젝트 ID를 찾을 수 없습니다.')
      alert('프로젝트 ID를 찾을 수 없습니다. 프로젝트를 선택해주세요.')
      return
    }
    const { data, error } = await supabase
      .from('gen_images')
      .select('id, element_name, result_image_url, thumbnail_url, image_type')
      .eq('project_id', projectId)
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) throw error
    
    availableImages.value = data.filter(img => 
      img.id !== props.image.id && 
      (img.storage_image_url || img.result_image_url || img.thumbnail_url)
    )
  } catch (error) {
    console.error('이미지 로드 실패:', error)
  }
}

// 편집 적용
const applyEdit = async () => {
  if (!editor.value) return
  
  isProcessing.value = true
  
  try {
    if (currentEditMode.value === EDIT_MODES.CROP) {
      // 크롭 적용
      const result = await editor.value.applyCrop()
      
      // 새 이미지로 저장 (Supabase Storage에 업로드)
      const fileName = `edited_${Date.now()}.png`
      const projectId = props.projectId || props.image.project_id || projectsStore.currentProject?.id
      
      if (!projectId) {
        console.error('프로젝트 ID를 찾을 수 없습니다.')
        alert('프로젝트 ID를 찾을 수 없습니다. 프로젝트를 선택해주세요.')
        return
      } || projectsStore.currentProject?.id
    
    if (!projectId) {
      console.error('프로젝트 ID를 찾을 수 없습니다.')
      alert('프로젝트 ID를 찾을 수 없습니다. 프로젝트를 선택해주세요.')
      return
    }
      const userId = authStore.user?.id
      
      // 카테고리 결정 (image_type 기반)
      let category = 'scene' // 기본값
      
      // image_type 확인 및 매핑
      if (props.image.image_type === 'character' || props.image.is_character) {
        category = 'character'
      } else if (props.image.image_type === 'background' || props.image.is_background) {
        category = 'background'
      } else if (props.image.image_type === 'object' || props.image.is_object) {
        category = 'object'
      } else if (props.image.image_type === 'scene') {
        category = 'scene'
      } else if (props.image.image_type === 'generated') {
        // 'generated'는 유효한 카테고리가 아니므로 scene으로 매핑
        category = 'scene'
      }
      
      // RLS 정책에 맞는 경로 설정
      // 시도 1: user_id가 첫 번째 경로여야 할 수 있음
      let filePath = ''
      if (userId) {
        // user_id/projectId/category 형식 시도
        filePath = `${userId}/${projectId}/${category}/${fileName}`
      } else {
        // 또는 projectId/category 형식
        filePath = `${projectId}/${category}/${fileName}`
      }
      
      // 디버깅 정보 출력
      console.log('Storage upload attempt:', {
        bucket: 'gen-images',
        filePath,
        pathComponents: {
          userId,
          projectId,
          category,
          fileName
        },
        imageInfo: {
          imageType: props.image.image_type,
          isCharacter: props.image.is_character,
          isBackground: props.image.is_background,
          isObject: props.image.is_object,
        },
        fileInfo: {
          size: result.blob.size,
          type: result.blob.type
        },
        auth: {
          userId: authStore.user?.id,
          email: authStore.user?.email,
          hasSession: !!authStore.user
        }
      })
      
      // 다양한 경로 형식 시도를 위한 로그
      console.log('Possible path formats:', [
        `${userId}/${projectId}/${category}/${fileName}`,
        `${projectId}/${category}/${fileName}`,
        `${userId}/${category}/${fileName}`,
        `${category}/${fileName}`
      ])
      
      // 현재 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        throw new Error('인증 세션이 없습니다. 다시 로그인해주세요.')
      }
      
      console.log('Current session:', {
        user: session.user?.id,
        email: session.user?.email,
        accessToken: session.access_token ? 'present' : 'missing'
      })
      
      // ref-images 버킷 사용 (gen-images 버킷의 RLS 정책 문제 회피)
      const refImagePath = `${userId}/edited/${projectId}/${fileName}`
      
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ref-images')
        .upload(refImagePath, result.blob, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error('Storage upload error details:', {
          error: uploadError,
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          bucket: 'ref-images',
          path: refImagePath,
          hint: uploadError.hint,
          details: uploadError.details,
          error_description: uploadError.error_description
        })
        
        // 더 자세한 에러 메시지
        let errorMsg = '이미지 저장 실패: '
        if (uploadError.message?.includes('row-level security')) {
          errorMsg += 'RLS 정책 위반. 경로 형식을 확인하세요.'
          console.error('RLS 정책 위반. 예상 경로 형식: {project_id}/{category}/{filename}')
          console.error('시도한 경로:', filePath)
        } else if (uploadError.message?.includes('Bucket not found')) {
          errorMsg += '버킷을 찾을 수 없습니다.'
        } else if (uploadError.statusCode === 401) {
          errorMsg += '인증 오류. 다시 로그인하세요.'
        } else {
          errorMsg += uploadError.message || '알 수 없는 오류'
        }
        
        alert(errorMsg)
        throw uploadError
      }
      
      // Storage URL 가져오기 (ref-images 버킷 사용)
      const { data: { publicUrl } } = supabase.storage
        .from('ref-images')
        .getPublicUrl(refImagePath)
      
      // 데이터베이스에 새 이미지 레코드 생성
      const { data: newImage, error: dbError } = await supabase
        .from('gen_images')
        .insert({
          project_id: projectId,
          production_sheet_id: props.image.production_sheet_id || null,
          element_name: `${props.image.element_name || 'Edited'}_cropped`,
          image_type: props.image.image_type || 'scene',
          generation_model: 'edited',
          prompt_used: `Cropped from: ${props.image.element_name || 'image'}`,
          custom_prompt: `Cropped version`,
          generation_status: 'completed',
          storage_image_url: publicUrl,
          result_image_url: publicUrl,
          reference_image_url: props.image.storage_image_url || props.image.result_image_url,
          style_id: props.image.style_id || null,
          style_name: props.image.style_name || null,
          metadata: {
            original_image_id: props.image.id,
            edit_type: 'crop',
            dimensions: `${result.width}x${result.height}`,
            created_by: 'image_editor',
            aspect_ratio: props.image.metadata?.aspect_ratio || '1:1'
          },
          tags: []
        })
        .select()
        .single()
      
      if (dbError) throw dbError
      
      // 부모 컴포넌트에 알림
      emit('update', newImage)
      
      // 편집 모드 종료
      cancelEdit()
      
      alert('크롭된 이미지가 저장되었습니다.')
    } else if (currentEditMode.value === EDIT_MODES.LAYERS) {
      // 레이어 합성 적용
      const result = await editor.value.exportImage()
      
      // 새 이미지로 저장 (Supabase Storage에 업로드)
      const fileName = `layered_${Date.now()}.png`
      const projectId = props.projectId || props.image.project_id || projectsStore.currentProject?.id
      
      if (!projectId) {
        console.error('프로젝트 ID를 찾을 수 없습니다.')
        alert('프로젝트 ID를 찾을 수 없습니다. 프로젝트를 선택해주세요.')
        return
      } || projectsStore.currentProject?.id
    
    if (!projectId) {
      console.error('프로젝트 ID를 찾을 수 없습니다.')
      alert('프로젝트 ID를 찾을 수 없습니다. 프로젝트를 선택해주세요.')
      return
    }
      const userId = authStore.user?.id
      
      // 카테고리 결정 (image_type 기반)
      let category = 'scene' // 기본값
      
      // image_type 확인 및 매핑
      if (props.image.image_type === 'character' || props.image.is_character) {
        category = 'character'
      } else if (props.image.image_type === 'background' || props.image.is_background) {
        category = 'background'
      } else if (props.image.image_type === 'object' || props.image.is_object) {
        category = 'object'
      } else if (props.image.image_type === 'scene') {
        category = 'scene'
      } else if (props.image.image_type === 'generated') {
        // 'generated'는 유효한 카테고리가 아니므로 scene으로 매핑
        category = 'scene'
      }
      
      // RLS 정책에 맞는 경로 설정
      // 시도 1: user_id가 첫 번째 경로여야 할 수 있음
      let filePath = ''
      if (userId) {
        // user_id/projectId/category 형식 시도
        filePath = `${userId}/${projectId}/${category}/${fileName}`
      } else {
        // 또는 projectId/category 형식
        filePath = `${projectId}/${category}/${fileName}`
      }
      
      console.log('Layers storage upload:', {
        bucket: 'gen-images',
        filePath,
        projectId,
        category,
        fileSize: result.blob.size
      })
      
      // ref-images 버킷 사용 (gen-images 버킷의 RLS 정책 문제 회피)
      const refImagePath = `${userId}/edited/${projectId}/${fileName}`
      
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ref-images')
        .upload(refImagePath, result.blob, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error('Layers upload error:', uploadError)
        alert('레이어 이미지 저장 실패: ' + (uploadError.message || '알 수 없는 오류'))
        throw uploadError
      }
      
      // Storage URL 가져오기 (ref-images 버킷 사용)
      const { data: { publicUrl } } = supabase.storage
        .from('ref-images')
        .getPublicUrl(refImagePath)
      
      // 데이터베이스에 새 이미지 레코드 생성
      const { data: newImage, error: dbError } = await supabase
        .from('gen_images')
        .insert({
          project_id: projectId,
          production_sheet_id: props.image.production_sheet_id || null,
          element_name: `${props.image.element_name || 'Edited'}_layered`,
          image_type: props.image.image_type || 'scene',
          generation_model: 'edited',
          prompt_used: `Layered from: ${props.image.element_name || 'image'}`,
          custom_prompt: `Layered with ${editor.value.layers.length} layers`,
          generation_status: 'completed',
          storage_image_url: publicUrl,
          result_image_url: publicUrl,
          reference_image_url: props.image.storage_image_url || props.image.result_image_url,
          style_id: props.image.style_id || null,
          style_name: props.image.style_name || null,
          metadata: {
            original_image_id: props.image.id,
            edit_type: 'layers',
            layer_count: editor.value.layers.length,
            created_by: 'image_editor',
            aspect_ratio: props.image.metadata?.aspect_ratio || '1:1'
          },
          tags: []
        })
        .select()
        .single()
      
      if (dbError) throw dbError
      
      // 부모 컴포넌트에 알림
      emit('update', newImage)
      
      // 편집 모드 종료
      cancelEdit()
      
      alert('레이어 합성 이미지가 저장되었습니다.')
    }
  } catch (error) {
    console.error('편집 적용 실패:', error)
    alert('이미지 저장에 실패했습니다.')
  } finally {
    isProcessing.value = false
  }
}

// 편집 취소
const cancelEdit = () => {
  if (editor.value) {
    editor.value.dispose()
    editor.value = null
  }
  isEditMode.value = false
  currentEditMode.value = EDIT_MODES.NONE
  showLayerSelector.value = false
}

const handleVideoGeneration = () => {
  // 영상 생성을 위한 데이터 전달
  const videoData = {
    imageUrl: props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url,
    imageId: props.image.id,
    prompt: props.image.prompt_used || '',
    elementName: props.image.element_name || '',
    category: props.image.image_type || 'scene',
    projectId: props.image.project_id,
    productionSheetId: props.image.production_sheet_id
  }
  
  // 부모 컴포넌트에 이벤트 발생
  emit('generate-video', videoData)
  emit('close')
}

// Recraft 편집 메서드들
const openVectorizeModal = () => {
  const imageData = {
    imageUrl: props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url,
    imageId: props.image.id,
    elementName: props.image.element_name || '',
    projectId: props.image.project_id
  }
  
  emit('vectorize', imageData)
  emit('close')
}

const openUpscaleModal = () => {
  const imageData = {
    imageUrl: props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url,
    imageId: props.image.id,
    elementName: props.image.element_name || '',
    projectId: props.image.project_id
  }
  
  emit('upscale', imageData)
  emit('close')
}

const openRemoveBackgroundModal = () => {
  const imageData = {
    imageUrl: props.image.storage_image_url || props.image.result_image_url || props.image.thumbnail_url,
    imageId: props.image.id,
    elementName: props.image.element_name || '',
    projectId: props.image.project_id
  }
  
  emit('remove-background', imageData)
  emit('close')
}

// Watch for image changes
watch(() => props.image?.id, (newImageId) => {
  if (newImageId) {
    selectedPreview.value = 'original'
    fetchProcessedImages()
  }
}, { immediate: true })

// Initialize on mount
onMounted(() => {
  selectedPreview.value = 'original'
  if (props.image?.id) {
    fetchProcessedImages()
  }
})
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
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-start;
  flex-wrap: wrap;
  max-width: 100%;
  /* 버튼들이 헤더를 침범하지 않도록 상단 여백 확보 */
  padding-bottom: 8px;
}

.button-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.button-group.edit-actions {
  /* 편집 관련 버튼들을 더 잘 보이게 */
  background: var(--bg-tertiary);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.highlight-btn {
  /* 그리기 편집 버튼을 더 눈에 띄게 */
  background: var(--color-primary) !important;
  color: white !important;
  border-color: var(--color-primary) !important;
}

.highlight-btn:hover {
  background: var(--color-primary-hover) !important;
  transform: scale(1.05);
}

.button-divider {
  width: 1px;
  height: 30px;
  background: var(--border-color);
  margin: 0 4px;
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

.icon-btn.btn-edit {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.icon-btn.btn-edit:hover {
  background: #d97706;
  border-color: #d97706;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.icon-btn.btn-draw {
  background: #06b6d4;
  color: white;
  border-color: #06b6d4;
}

.icon-btn.btn-draw:hover {
  background: #0891b2;
  border-color: #0891b2;
  box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
}

.icon-btn.btn-recraft {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

.icon-btn.btn-recraft:hover {
  background: #4f46e5;
  border-color: #4f46e5;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

/* 편집 모드 스타일 */
.edit-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  overflow: auto;
}

.edit-toolbar {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: 8px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.toolbar-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toolbar-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.ratio-select {
  padding: 6px 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
}

.btn-apply, .btn-cancel {
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-apply {
  background: var(--primary-color);
  color: white;
  border: none;
}

.btn-apply:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background: var(--bg-hover);
}

.editor-canvas {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  max-height: 600px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: #f0f0f0;
  cursor: crosshair;
  width: auto;
  height: auto;
}

.layers-panel {
  position: absolute;
  right: 10px;
  top: 60px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
  width: 250px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 10;
}

.layers-panel h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 5px;
  transition: background 0.2s;
}

.layer-item:hover {
  background: var(--bg-hover);
}

.layer-item.active {
  background: var(--bg-secondary);
  border: 1px solid var(--primary-color);
}

.layer-item span {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-item input[type="range"] {
  width: 60px;
}

.btn-remove-layer {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: color 0.2s;
}

.btn-remove-layer:hover {
  color: #ef4444;
}

/* 이름 편집 스타일 */
.name-container,
.category-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-name-btn,
.edit-category-btn {
  padding: 4px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
}

.edit-name-btn:hover,
.edit-category-btn:hover {
  background: var(--bg-hover);
  color: var(--primary-color);
}

.name-edit-container,
.category-edit-container {
  display: flex;
  align-items: center;
  gap: 5px;
}

.name-input {
  flex: 1;
  padding: 4px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 14px;
}

.name-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.category-select {
  flex: 1;
  padding: 4px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}

.category-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.category-select option {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.save-btn, .cancel-btn {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.save-btn {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.save-btn:hover {
  background: var(--primary-color);
  color: white;
}

.cancel-btn {
  color: var(--text-secondary);
}

.cancel-btn:hover {
  background: var(--bg-hover);
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
  
  .layers-panel {
    position: relative;
    right: auto;
    top: auto;
    width: 100%;
    margin-top: 10px;
  }
}

/* DrawCanvas 모달 스타일 */
.draw-canvas-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.draw-canvas-modal > div {
  width: 100%;
  max-width: 1200px;
  max-height: 90vh;
  background: var(--bg-primary);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .draw-canvas-modal {
    padding: 10px;
  }
  
  .draw-canvas-modal > div {
    max-width: 100%;
    max-height: 100%;
    border-radius: 8px;
  }
}

/* 이미지 미리보기 선택 */
.image-viewer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
}

.image-preview-selector {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
}

.preview-btn {
  padding: 8px 16px;
  border: 2px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.preview-btn:hover {
  border-color: var(--primary-color);
  color: var(--text-primary);
  background: var(--bg-hover);
}

.preview-btn.active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
}

.preview-btn.active:hover {
  background: var(--primary-hover);
}
</style>