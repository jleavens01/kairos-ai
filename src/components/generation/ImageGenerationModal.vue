<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container" :class="{ 'expanded': showSidePanel }">
      <div class="modal-main-content">
        <div class="modal-header">
          <h3>이미지 생성</h3>
          <div class="header-actions">
            <button @click="toggleSidePanel" class="btn-toggle-panel" :class="{ active: showSidePanel }" title="사이드 패널 토글">
              <PanelRightOpen v-if="!showSidePanel" :size="20" />
              <PanelRightClose v-else :size="20" />
            </button>
            <button @click="close" class="btn-close"><X :size="20" /></button>
          </div>
        </div>

        <div class="modal-body">
        <!-- AI 모델 / 이미지 크기 (한 줄) -->
        <div class="form-group inline-group">
          <div class="inline-item">
            <label class="inline-label">AI 모델</label>
            <select v-model="selectedModel" class="form-select">
              <option value="gpt-image-1">GPT Image (기본)</option>
              <option value="flux-pro">Flux Pro</option>
              <option value="flux-kontext">Flux Kontext (참조 이미지 1개)</option>
              <option value="flux-kontext-multi">Flux Kontext Multi (참조 이미지 여러개)</option>
            </select>
          </div>
          <div class="inline-item">
            <label class="inline-label">이미지 크기</label>
            <select v-model="imageSize" class="form-select">
              <!-- GPT Image 모델용 크기 -->
              <template v-if="selectedModel === 'gpt-image-1'">
                <option value="1024x1024">정사각형 (1024x1024)</option>
                <option value="1536x1024">가로형 (1536x1024)</option>
                <option value="1024x1536">세로형 (1024x1536)</option>
              </template>
              <!-- Flux 모델용 비율 -->
              <template v-else-if="selectedModel.includes('flux')">
                <option value="21:9">울트라와이드 (21:9)</option>
                <option value="16:9">와이드 (16:9)</option>
                <option value="4:3">표준 가로 (4:3)</option>
                <option value="3:2">가로형 (3:2)</option>
                <option value="1:1">정사각형 (1:1)</option>
                <option value="2:3">세로형 (2:3)</option>
                <option value="3:4">표준 세로 (3:4)</option>
                <option value="9:16">세로 와이드 (9:16)</option>
                <option value="9:21">울트라 세로 (9:21)</option>
              </template>
            </select>
          </div>
        </div>

        <!-- 스타일 선택 -->
        <div class="form-group inline-group">
          <label class="inline-label">스타일</label>
          <div class="style-select-wrapper">
            <div @click="toggleStyleDropdown" class="custom-style-select">
              <span v-if="selectedStyle">{{ selectedStyle.name }}</span>
              <span v-else class="placeholder">선택 안함</span>
              <span class="dropdown-arrow">▼</span>
            </div>
            <!-- 스타일 드롭다운 미리보기 -->
            <div v-if="isStyleDropdownOpen" class="style-dropdown-preview">
              <div 
                @click="selectStyleWithPreview('')"
                class="style-option"
                :class="{ selected: !selectedStyleId }"
              >
                <div class="no-style-placeholder">✕</div>
                <span class="style-name">선택 안함</span>
              </div>
              <div 
                v-for="style in styles" 
                :key="style.id"
                @click="selectStyleWithPreview(style.id)"
                class="style-option"
                :class="{ selected: selectedStyleId === style.id }"
              >
                <img :src="style.base_image_url" :alt="style.name" class="style-thumb" />
                <span class="style-name">{{ style.name }}</span>
              </div>
            </div>
          </div>
          <div v-if="selectedStyle" class="style-preview-compact">
            <img :src="selectedStyle.base_image_url" :alt="selectedStyle.name" />
          </div>
        </div>

        <!-- 참조 이미지 (GPT 및 Flux 모델용) -->
        <div v-if="showReferenceImages" class="form-group">
          <div class="inline-group">
            <label class="inline-label">참조 이미지</label>
            <!-- 참조 이미지 소스 선택 탭 -->
            <div class="reference-tabs">
            <button 
              @click="referenceTab = 'upload'"
              :class="{ active: referenceTab === 'upload' }"
              class="tab-btn"
            >
              <Upload :size="16" /> 업로드
            </button>
            <button 
              @click="referenceTab = 'library'"
              :class="{ active: referenceTab === 'library' }"
              class="tab-btn"
            >
              <Library :size="16" /> 라이브러리
            </button>
            <button 
              @click="referenceTab = 'url'"
              :class="{ active: referenceTab === 'url' }"
              class="tab-btn"
            >
              <Link :size="16" /> URL
            </button>
            </div>
          </div>

          <!-- 선택된 참조 이미지 미리보기 -->
          <div v-if="referenceImages.length > 0" class="selected-references">
            <div class="reference-images-grid">
              <div 
                v-for="(item, index) in referenceImages" 
                :key="index" 
                class="reference-image-item"
              >
                <div class="image-preview-wrapper">
                  <img 
                    v-if="item.url || item.preview" 
                    :src="item.preview || item.url" 
                    alt="참조 이미지"
                  />
                  <div v-else-if="item.uploading" class="upload-loading">
                    <div class="spinner-small"></div>
                    <span>업로드 중...</span>
                  </div>
                </div>
                <button @click="removeReferenceImage(index)" class="btn-remove-image">✕</button>
              </div>
            </div>
          </div>

          <!-- 업로드 탭 -->
          <div v-if="referenceTab === 'upload'" class="reference-content">
            <div 
              class="drop-zone-compact"
              :class="{ 'drag-over': isDragging }"
              @drop.prevent="handleDrop"
              @dragover.prevent="handleDragOver"
              @dragleave.prevent="handleDragLeave"
              @click="$refs.fileInput.click()"
            >
              <input 
                ref="fileInput"
                type="file"
                multiple
                accept="image/*"
                @change="handleFileSelect"
                style="display: none"
              />
              <div class="drop-zone-content">
                <FolderOpen :size="24" class="drop-icon-small" />
                <span>클릭 또는 드래그하여 업로드</span>
              </div>
            </div>
          </div>

          <!-- 라이브러리 탭 -->
          <div v-if="referenceTab === 'library'" class="reference-content">
            <div class="library-filters">
              <div class="filter-group">
                <label class="filter-label">
                  <input 
                    type="radio" 
                    v-model="librarySource" 
                    value="my-images"
                  />
                  내 이미지
                </label>
                <label class="filter-label">
                  <input 
                    type="radio" 
                    v-model="librarySource" 
                    value="shared"
                    disabled
                  />
                  공유 이미지 (구현 예정)
                </label>
              </div>
              
              <div v-if="librarySource === 'my-images'" class="filter-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="currentProjectOnly"
                  />
                  현재 프로젝트만
                </label>
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="includeKept"
                  />
                  보관함 포함
                </label>
              </div>
            </div>

            <div v-if="loadingLibrary" class="library-loading">
              <div class="spinner"></div>
              <p>이미지를 불러오는 중...</p>
            </div>

            <div v-else-if="libraryImages.length === 0" class="library-empty">
              <p>사용 가능한 이미지가 없습니다.</p>
              <p class="hint">먼저 이미지를 생성해보세요!</p>
            </div>

            <div v-else class="library-grid">
              <div 
                v-for="image in libraryImages" 
                :key="image.id"
                class="library-item"
                :class="{ selected: isImageSelected(image) }"
                @click="toggleLibraryImage(image)"
              >
                <img 
                  :src="image.thumbnail_url || image.storage_image_url" 
                  :alt="image.element_name || 'Library image'"
                />
                <div class="library-item-overlay">
                  <span class="check-icon">{{ isImageSelected(image) ? '✓' : '' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- URL 탭 -->
          <div v-if="referenceTab === 'url'" class="reference-content">
            <div class="url-input-section">
              <input 
                v-model="urlInput" 
                type="url"
                placeholder="이미지 URL을 입력하세요..."
                class="form-input"
                @keyup.enter="addImageFromUrl"
              />
              <button @click="addImageFromUrl" class="btn-add-url">추가</button>
            </div>
          </div>
        </div>

        <!-- 프롬프트 프리셋 -->
        <div class="form-group">
          <div class="preset-header">
            <label>프롬프트 프리셋</label>
            <button @click="showPresetModal = true" class="btn-preset-manage">
              <Plus :size="16" /> 프리셋 관리
            </button>
          </div>
          <div class="preset-chips">
            <div v-if="presets.length === 0" class="no-presets">
              프리셋이 없습니다. 프리셋을 추가해보세요.
            </div>
            <div 
              v-for="preset in presets" 
              :key="preset.id"
              @click="togglePreset(preset)"
              class="preset-chip"
              :class="{ active: selectedPresets.includes(preset.id) }"
            >
              {{ preset.name }}
            </div>
          </div>
        </div>

        <!-- 프롬프트 입력 -->
        <div class="form-group">
          <div class="label-with-toggle">
            <label>프롬프트</label>
            <div class="translation-toggle">
              <span class="toggle-label">자동 번역</span>
              <label class="toggle-switch">
                <input 
                  type="checkbox" 
                  v-model="enableTranslation"
                  @change="handleTranslationToggle"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <textarea 
            v-model="prompt" 
            @blur="handlePromptBlur"
            placeholder="생성하고 싶은 이미지를 설명하세요..."
            rows="4"
            class="form-textarea"
          ></textarea>
          <div v-if="isTranslating" class="translation-status">
            <span class="spinner-small"></span>
            <span>번역 중...</span>
          </div>
          <div v-if="translatedPrompt && enableTranslation && !isTranslating" class="translated-preview">
            <span class="preview-label">번역된 프롬프트:</span>
            <span class="preview-text">{{ translatedPrompt }}</span>
          </div>
        </div>

        <!-- 카테고리 / 이름 또는 씬 선택 (한 줄) -->
        <div class="form-group inline-group">
          <div class="inline-item category-item">
            <label class="inline-label">카테고리</label>
            <select v-model="category" class="form-select">
              <option value="character">캐릭터</option>
              <option value="background">배경</option>
              <option value="scene">씬</option>
              <option value="object">오브젝트</option>
            </select>
          </div>

          <!-- 캐릭터/배경/오브젝트인 경우 이름 입력 -->
          <div v-if="category !== 'scene'" class="inline-item scene-item">
            <label class="inline-label">
              {{ category === 'character' ? '캐릭터 이름' : 
                 category === 'background' ? '배경 이름' : 
                 '오브젝트 이름' }}
            </label>
            <input 
              v-model="characterName" 
              type="text"
              :placeholder="category === 'character' ? '캐릭터 이름' : 
                           category === 'background' ? '배경 설명' : 
                           '오브젝트 설명'"
              class="form-input"
            />
          </div>

          <!-- 씬인 경우 씬 선택 드롭다운 또는 씬 번호 입력 -->
          <div v-else class="inline-item scene-item">
            <label class="inline-label">씬 번호</label>
            <div class="scene-input-wrapper">
              <input 
                v-model.number="sceneNumber" 
                type="number"
                placeholder="씬 번호 입력"
                class="form-input scene-number-input"
                min="1"
                @input="onSceneNumberInput"
              />
              <span class="or-text">또는</span>
              <select 
                v-model="selectedSceneId" 
                @change="onSceneSelect"
                class="form-select scene-select"
              >
                <option value="">기존 씬 선택</option>
                <option 
                  v-for="scene in scenes" 
                  :key="scene.id"
                  :value="scene.id"
                >
                  씬 {{ scene.scene_number }} - {{ truncateText(scene.original_script_text, 30) }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- 선택된 씬의 상세 정보 (씬 카테고리이고 씬이 선택된 경우) -->
        <div v-if="category === 'scene' && selectedScene" class="selected-scene-preview">
          <div class="scene-preview-header">
            <span class="scene-number-badge">씬 {{ selectedScene.scene_number }}</span>
            <button @click="applySceneToPrompt" class="btn-apply-compact apply-scene-btn">
              프롬프트에 적용
            </button>
          </div>
          <div class="scene-preview-content">
            <p class="scene-text">{{ selectedScene.original_script_text }}</p>
            <div v-if="selectedScene.characters && selectedScene.characters.length > 0" class="scene-info">
              <span class="info-label">등장인물:</span>
              <span class="info-value">{{ selectedScene.characters.join(', ') }}</span>
            </div>
          </div>
        </div>

        <!-- Flux 모델 파라미터 -->
        <div v-if="selectedModel.includes('flux')" class="advanced-params">
          <h4>고급 설정</h4>
          
          <div class="param-group">
            <label>Guidance Scale ({{ guidanceScale }})</label>
            <input 
              v-model="guidanceScale" 
              type="range" 
              min="1" 
              max="10" 
              step="0.5"
              class="form-range"
            />
          </div>

          <div class="param-group">
            <label>Safety Tolerance ({{ safetyTolerance }})</label>
            <input 
              v-model="safetyTolerance" 
              type="range" 
              min="0" 
              max="5" 
              step="1"
              class="form-range"
            />
          </div>

          <div class="param-group">
            <label>Seed (랜덤 시드)</label>
            <input 
              v-model.number="seed" 
              type="number" 
              placeholder="빈 값 = 랜덤"
              class="form-input"
            />
          </div>
        </div> <!-- advanced-params end -->

        <div class="modal-footer">
          <button @click="close" class="btn-secondary">취소</button>
          <button 
            @click="generateImage" 
            class="btn-primary"
            :disabled="!canGenerate || generating"
          >
            <span v-if="generating">생성 중...</span>
            <span v-else>이미지 생성</span>
          </button>
        </div> <!-- modal-footer end -->
      </div> <!-- modal-body end -->
        
        <!-- 프리셋 관리 모달 -->
        <PresetManageModal
          v-if="showPresetModal"
          :show="showPresetModal"
          :project-id="projectId"
          media-type="image"
          @close="showPresetModal = false"
          @saved="handlePresetSaved"
        />
      </div> <!-- modal-main-content end -->
      
      <!-- 사이드 패널 -->
      <div v-if="showSidePanel" class="modal-side-panel">
        <ImageGenerationSidePanel
          :category="category"
          :project-id="projectId"
          :selected-scene="selectedScene"
          :all-scenes="allScenes"
          @close="showSidePanel = false"
          @apply-suggestion="applySuggestion"
          @select-character="selectCharacter"
          @select-scene="selectSceneFromPanel"
          @select-background="selectBackground"
          @select-object="selectObject"
          @view-image="viewImage"
        />
      </div>
    </div> <!-- modal-container end -->
  </div> <!-- modal-overlay end -->
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useProductionStore } from '@/stores/production'
import { useProjectsStore } from '@/stores/projects'
import { X, Plus, PanelRightOpen, PanelRightClose, Upload, Library, Link, FolderOpen } from 'lucide-vue-next'
import PresetManageModal from './PresetManageModal.vue'
import ImageGenerationSidePanel from './ImageGenerationSidePanel.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: String,
    required: true
  },
  initialPrompt: {
    type: String,
    default: ''
  },
  characterName: {
    type: String,
    default: ''
  },
  initialModel: {
    type: String,
    default: null
  },
  initialSize: {
    type: String,
    default: null
  },
  initialCategory: {
    type: String,
    default: null
  },
  initialName: {
    type: String,
    default: null
  },
  referenceImage: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'success'])

const productionStore = useProductionStore()
const projectsStore = useProjectsStore()

// Form data
const prompt = ref(props.initialPrompt)
const selectedModel = ref(props.initialModel || 'gpt-image-1')
const referenceImages = ref([])
const imageSize = ref(props.initialSize || '1024x1024')
const category = ref(props.initialCategory || (props.characterName ? 'character' : 'character'))
const characterName = ref(props.initialName || props.characterName)
const sceneNumber = ref(null)
const generating = ref(false)
const isDragging = ref(false)
const urlInput = ref('')
const fileInput = ref(null)

// Library tab
const referenceTab = ref('upload')
const librarySource = ref('my-images')
const currentProjectOnly = ref(true)
const includeKept = ref(false) // 보관함 포함 옵션 (기본값: false)
const libraryImages = ref([])
const loadingLibrary = ref(false)

// Scene selection
const scenes = ref([])
const loadingScenes = ref(false)
const selectedScene = ref(null)
const selectedSceneId = ref('')

// 번역 관련 상태
const enableTranslation = ref(true) // 기본값 on
const translatedPrompt = ref('')
const isTranslating = ref(false)
// translationTimer 제거 - blur 이벤트 사용

// Project data
const project = computed(() => projectsStore.currentProject)

// Style selection
const selectedStyleId = ref('')
const styles = ref([])
const loadingStyles = ref(false)
const isStyleDropdownOpen = ref(false)

// Flux parameters
const guidanceScale = ref(3.5)
const safetyTolerance = ref(2)

// Side panel state - 데스크톱에서는 기본적으로 열림
const isMobile = window.innerWidth <= 768
const showSidePanel = ref(!isMobile)
const allScenes = ref([])
const seed = ref(null)

// Preset data
const showPresetModal = ref(false)
const presets = ref([])
const selectedPresets = ref([])  // 선택된 프리셋 ID 배열

// Watch for prop changes
watch(() => props.initialPrompt, (newVal) => {
  prompt.value = newVal
})

watch(() => props.characterName, (newVal) => {
  if (newVal) {
    characterName.value = newVal
    category.value = 'character'
  }
})

// 라이브러리 탭이 변경될 때 이미지 로드
watch(referenceTab, (newTab) => {
  if (newTab === 'library') {
    loadLibraryImages()
  }
})

// 라이브러리 필터 변경 시 이미지 로드
watch([librarySource, currentProjectOnly, includeKept], () => {
  if (referenceTab.value === 'library') {
    loadLibraryImages()
  }
})

// 카테고리가 scene으로 변경될 때 씬 목록 로드
watch(category, (newCategory) => {
  if (newCategory === 'scene') {
    loadScenes()
  }
})

// 모델 변경 시 이미지 크기 기본값 설정
watch(selectedModel, (newModel) => {
  // 프로젝트의 마지막 설정이 있으면 그것을 유지, 없으면 기본값 설정
  if (!project.value?.last_image_size) {
    if (newModel === 'gpt-image-1') {
      imageSize.value = '1024x1024'
    } else if (newModel.includes('flux')) {
      imageSize.value = '1:1'
    }
  }
})

// Computed
const canGenerate = computed(() => {
  return prompt.value.trim().length > 0 && !generating.value
})

const showReferenceImages = computed(() => {
  // GPT Image와 Flux 모델들 모두 참조 이미지 지원
  return selectedModel.value === 'gpt-image-1' || selectedModel.value.includes('flux')
})

const canAddMoreImages = computed(() => {
  return referenceImages.value.length < getMaxImages()
})

const selectedStyle = computed(() => {
  return styles.value.find(s => s.id === selectedStyleId.value)
})

// 모델별 최대 이미지 개수
const getMaxImages = () => {
  if (selectedModel.value === 'flux-kontext') {
    return 1
  } else if (selectedModel.value === 'flux-kontext-multi' || selectedModel.value === 'gpt-image-1') {
    return 5
  }
  return 0
}

// Methods
const close = () => {
  emit('close')
}

// Side panel methods
const toggleSidePanel = () => {
  showSidePanel.value = !showSidePanel.value
}

const applySuggestion = (suggestion) => {
  // 제안을 프롬프트에 추가
  if (prompt.value) {
    prompt.value += ', ' + suggestion
  } else {
    prompt.value = suggestion
  }
}

const selectCharacter = (character) => {
  characterName.value = character.name
  // 선택한 캐릭터를 프롬프트에도 추가
  if (prompt.value && !prompt.value.includes(character.name)) {
    prompt.value = character.name + ', ' + prompt.value
  } else if (!prompt.value) {
    prompt.value = character.name
  }
}

const selectSceneFromPanel = (scene) => {
  selectedScene.value = scene
  selectedSceneId.value = scene.id
  sceneNumber.value = scene.scene_number
}

const selectBackground = (bg) => {
  // 배경 이미지를 참조 이미지로 추가 또는 프롬프트에 반영
  if (referenceImages.value.length < getMaxImages()) {
    referenceImages.value.push({
      url: bg.image_url,
      preview: null,
      uploading: false
    })
  }
}

const selectObject = (obj) => {
  // 오브젝트를 참조 이미지로 추가
  if (referenceImages.value.length < getMaxImages()) {
    referenceImages.value.push({
      url: obj.image_url,
      preview: null,
      uploading: false
    })
  }
}

const viewImage = (image) => {
  // 이미지 상세보기 (필요시 구현)
  window.open(image.image_url, '_blank')
}

const removeReferenceImage = (index) => {
  referenceImages.value.splice(index, 1)
}

// 드래그앤드롭 핸들러
const handleDragOver = (e) => {
  isDragging.value = true
}

const handleDragLeave = (e) => {
  isDragging.value = false
}

const handleDrop = (e) => {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files)
  handleFiles(files)
}

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  handleFiles(files)
}

// 파일 처리 및 업로드
const handleFiles = async (files) => {
  const imageFiles = files.filter(file => file.type.startsWith('image/'))
  const maxToAdd = getMaxImages() - referenceImages.value.length
  const filesToAdd = imageFiles.slice(0, maxToAdd)
  
  for (const file of filesToAdd) {
    // 임시 미리보기 추가
    const preview = URL.createObjectURL(file)
    const imageItem = {
      file: file,
      preview: preview,
      uploading: true,
      url: null
    }
    referenceImages.value.push(imageItem)
    
    // 파일 업로드
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('로그인이 필요합니다.')
        return
      }
      
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 9)
      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `${session.user.id}/${timestamp}-${randomId}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('ref-images')
        .upload(fileName, file)
      
      if (error) throw error
      
      // Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('ref-images')
        .getPublicUrl(fileName)
      
      // URL 업데이트
      const index = referenceImages.value.findIndex(item => item.preview === preview)
      if (index !== -1) {
        referenceImages.value[index] = {
          url: publicUrl,
          preview: null,
          uploading: false
        }
        URL.revokeObjectURL(preview) // 메모리 정리
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      // 실패한 이미지 제거
      const index = referenceImages.value.findIndex(item => item.preview === preview)
      if (index !== -1) {
        referenceImages.value.splice(index, 1)
      }
      alert('이미지 업로드에 실패했습니다.')
    }
  }
}

// URL로 이미지 추가
const addImageFromUrl = () => {
  if (urlInput.value && referenceImages.value.length < getMaxImages()) {
    referenceImages.value.push({
      url: urlInput.value,
      preview: null,
      uploading: false
    })
    urlInput.value = ''
  }
}

// 라이브러리 이미지 로드
const loadLibraryImages = async () => {
  loadingLibrary.value = true
  libraryImages.value = []
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    let query = supabase
      .from('gen_images')
      .select('*')
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)
    
    // 내 이미지만
    if (librarySource.value === 'my-images') {
      // 현재 프로젝트만
      if (currentProjectOnly.value) {
        query = query.eq('project_id', props.projectId)
      }
      // 모든 프로젝트의 내 이미지 (구현 필요 - user_id 컬럼이 필요함)
      // else {
      //   query = query.eq('user_id', session.user.id)
      // }
      
      // 보관함 포함 여부
      if (!includeKept.value) {
        // 보관함 이미지 제외 (is_kept가 null이거나 false인 것만)
        query = query.or('is_kept.is.null,is_kept.eq.false')
      }
    }
    // 공유 이미지 (구현 예정)
    // else if (librarySource.value === 'shared') {
    //   query = query.eq('is_public', true)
    // }
    
    const { data, error } = await query
    
    if (error) throw error
    
    libraryImages.value = data || []
  } catch (error) {
    console.error('라이브러리 이미지 로드 실패:', error)
  } finally {
    loadingLibrary.value = false
  }
}

// 라이브러리 이미지 선택/해제
const toggleLibraryImage = (image) => {
  const index = referenceImages.value.findIndex(
    item => item.url === (image.storage_image_url || image.result_image_url)
  )
  
  if (index > -1) {
    // 이미 선택된 경우 제거
    referenceImages.value.splice(index, 1)
  } else if (referenceImages.value.length < getMaxImages()) {
    // 선택 추가
    referenceImages.value.push({
      url: image.storage_image_url || image.result_image_url,
      preview: null,
      uploading: false,
      fromLibrary: true,
      libraryId: image.id
    })
  } else {
    alert(`최대 ${getMaxImages()}개까지만 선택 가능합니다.`)
  }
}

// 이미지가 선택되었는지 확인
const isImageSelected = (image) => {
  return referenceImages.value.some(
    item => item.url === (image.storage_image_url || image.result_image_url)
  )
}

// 씬 목록 로드
const loadScenes = async () => {
  loadingScenes.value = true
  scenes.value = []
  
  try {
    // 스토어에서 씬 데이터 가져오기 또는 새로 로드
    if (productionStore.productionSheets.length === 0) {
      await productionStore.fetchProductionSheets(props.projectId)
    }
    
    scenes.value = productionStore.productionSheets
      .sort((a, b) => a.scene_number - b.scene_number)
    
    // allScenes도 업데이트
    allScenes.value = scenes.value
  } catch (error) {
    console.error('씬 목록 로드 실패:', error)
  } finally {
    loadingScenes.value = false
  }
}

// 씬 선택
const selectScene = (scene) => {
  selectedScene.value = scene
  selectedSceneId.value = scene.id
}

// 씬 드롭다운 변경 핸들러
const onSceneSelect = () => {
  const scene = scenes.value.find(s => s.id === selectedSceneId.value)
  if (scene) {
    selectedScene.value = scene
    // 씬을 선택하면 씬 번호도 자동으로 설정
    sceneNumber.value = scene.scene_number
  } else {
    selectedScene.value = null
  }
}

// 씬 번호 입력 핸들러
const onSceneNumberInput = () => {
  // 씬 번호를 입력하면 드롭다운 선택 초기화
  selectedSceneId.value = ''
  selectedScene.value = null
  
  // 입력한 씬 번호와 일치하는 씬이 있는지 확인
  if (sceneNumber.value) {
    const matchingScene = scenes.value.find(s => s.scene_number === sceneNumber.value)
    if (matchingScene) {
      selectedSceneId.value = matchingScene.id
      selectedScene.value = matchingScene
    }
  }
}

// 씬 스크립트를 프롬프트에 적용 (AI 버전)
const applySceneToPrompt = async () => {
  if (!selectedScene.value) return
  
  // AI 프롬프트 생성 중 표시
  const originalButtonText = document.querySelector('.apply-scene-btn')?.textContent
  if (originalButtonText) {
    document.querySelector('.apply-scene-btn').textContent = 'AI 생성 중...'
    document.querySelector('.apply-scene-btn').disabled = true
  }
  
  try {
    // AI API 호출
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // 세션이 없으면 기본 방식으로 폴백
      applySceneToPromptBasic()
      return
    }
    
    const response = await fetch('/.netlify/functions/generateAIPrompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        scene: {
          scene_number: selectedScene.value.scene_number,
          script: selectedScene.value.original_script_text || selectedScene.value.script || '',
          characters: selectedScene.value.characters,
          location: selectedScene.value.location,
          action: selectedScene.value.action,
          backgrounds: selectedScene.value.backgrounds
        },
        projectContext: project.value?.description || '',
        imageType: category.value,
        imageSize: imageSize.value  // 선택된 이미지 크기 전달
      })
    })
    
    // 응답이 JSON이 아닐 수 있으므로 안전하게 처리
    let result
    try {
      result = await response.json()
    } catch (jsonError) {
      console.error('Failed to parse response as JSON:', jsonError)
      // JSON 파싱 실패 시 기본 프롬프트 사용
      applySceneToPromptBasic()
      return
    }
    
    if (result.success && result.prompt) {
      // AI가 생성한 프롬프트 사용
      prompt.value = result.fullPrompt || result.prompt
      
      // 스타일 태그가 있으면 별도로 표시 (옵션)
      if (result.styleTags && result.styleTags.length > 0) {
        console.log('AI 추천 스타일 태그:', result.styleTags)
      }
      
      // 기술 사양이 있으면 활용 (옵션)
      if (result.technicalSpecs) {
        // 카메라 앵글이나 비율 정보가 있으면 UI에 반영 가능
        console.log('AI 추천 기술 사양:', result.technicalSpecs)
      }
    } else {
      // AI 생성 실패 시 기본 방식으로 폴백
      applySceneToPromptBasic()
    }
  } catch (error) {
    console.error('AI 프롬프트 생성 오류:', error)
    // 오류 발생 시 기본 방식으로 폴백
    applySceneToPromptBasic()
  } finally {
    // 버튼 텍스트 복원
    if (originalButtonText) {
      document.querySelector('.apply-scene-btn').textContent = originalButtonText
      document.querySelector('.apply-scene-btn').disabled = false
    }
  }
}

// 기본 프롬프트 생성 (폴백용)
const applySceneToPromptBasic = () => {
  if (!selectedScene.value) return
  
  // 스크립트를 시각적 장면 설명으로 변환
  const sceneDescription = convertScriptToVisualDescription(selectedScene.value)
  
  // 프롬프트 구성
  let newPrompt = `씬 ${selectedScene.value.scene_number}: ${sceneDescription}`
  
  // 등장인물 추가 (역할 설명 포함)
  if (selectedScene.value.characters && selectedScene.value.characters.length > 0) {
    const characterList = selectedScene.value.characters.map(char => {
      // 특정 캐릭터에 대한 설명 추가
      return addCharacterContext(char)
    }).join(', ')
    newPrompt += `\n등장인물: ${characterList}`
  }
  
  // 배경 정보 추가
  if (selectedScene.value.backgrounds && selectedScene.value.backgrounds.length > 0) {
    newPrompt += `\n배경: ${selectedScene.value.backgrounds.join(', ')}`
  } else {
    // 배경이 없으면 스크립트에서 추론
    const inferredBackground = inferBackgroundFromScript(selectedScene.value.original_script_text)
    if (inferredBackground) {
      newPrompt += `\n배경: ${inferredBackground}`
    }
  }
  
  // 카메라 앵글 추천
  const cameraAngle = recommendCameraAngle(selectedScene.value)
  newPrompt += `\n카메라 사이즈: ${cameraAngle}`
  
  // 이미지 비율 추가
  const aspectRatio = convertSizeToRatio(imageSize.value)
  newPrompt += `\n이미지 비율: ${aspectRatio}`
  
  // 중요 노트 추가
  newPrompt += `\n**중요: 캐릭터 신체 비율 유지`
  
  prompt.value = newPrompt
}

// 스크립트를 시각적 설명으로 변환
const convertScriptToVisualDescription = (scene) => {
  const script = scene.original_script_text
  
  // 스크립트의 핵심 동작/상황을 추출하여 시각적 설명으로 변환
  // 예시: "수도 한양을 지키던 방어선이 속수무책으로 뚫리는 것을 목격한 조선은"
  // -> "인조가 신하들과 함께 방어 전략을 논의하는 모습"
  
  // 키워드 기반 변환 (간단한 구현)
  if (script.includes('목격') || script.includes('보고')) {
    return script.replace(/목격한|본/, '심각한 표정으로 바라보는')
  } else if (script.includes('지시') || script.includes('명령')) {
    return script.replace(/지시한다|명령한다/, '위엄있게 명령을 내리는 모습')
  } else if (script.includes('대화') || script.includes('말')) {
    return script.replace(/대화|말/, '진지하게 논의하는 모습')
  }
  
  // 기본값: 원본 텍스트를 약간 수정
  return `${script.substring(0, 50)}... 장면`
}

// 프리셋 관련 함수들
const loadPresets = async () => {
  try {
    // 현재 사용자 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('User not found')
      return
    }
    
    // 사용자의 모든 프로젝트에서 프리셋 가져오기
    const { data, error } = await supabase
      .from('prompt_presets')
      .select('*')
      .eq('user_id', user.id)  // 프로젝트 ID 대신 사용자 ID로 필터링
      .in('media_type', ['image', 'both'])
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    
    if (error) throw error
    presets.value = data || []
  } catch (error) {
    console.error('프리셋 로드 실패:', error)
  }
}

const togglePreset = (preset) => {
  const index = selectedPresets.value.indexOf(preset.id)
  if (index > -1) {
    selectedPresets.value.splice(index, 1)
  } else {
    selectedPresets.value.push(preset.id)
  }
}

const handlePresetSaved = () => {
  loadPresets()
  showPresetModal.value = false
}

// 선택된 프리셋들의 프롬프트를 합치기
const getPresetsPrompt = () => {
  return presets.value
    .filter(p => selectedPresets.value.includes(p.id))
    .map(p => p.prompt)
    .join(', ')
}

// 캐릭터에 맥락 추가
const addCharacterContext = (characterName) => {
  const characterContexts = {
    '인조': '인조(조선 16대 왕)',
    '광해군': '광해군(조선 15대 왕)',
    // 더 많은 캐릭터 추가 가능
  }
  
  return characterContexts[characterName] || characterName
}

// 스크립트에서 배경 추론
const inferBackgroundFromScript = (script) => {
  const lower = script.toLowerCase()
  
  if (lower.includes('궁궐') || lower.includes('왕')) return '조선 궁궐'
  if (lower.includes('한양') || lower.includes('수도')) return '조선 한양'
  if (lower.includes('전투') || lower.includes('전쟁')) return '전쟁터'
  if (lower.includes('마을') || lower.includes('촌')) return '조선 시대 마을'
  if (lower.includes('산') || lower.includes('산성')) return '산성'
  
  return null
}

// 씬에 따른 카메라 앵글 추천
const recommendCameraAngle = (scene) => {
  const script = scene.original_script_text.toLowerCase()
  const characterCount = scene.characters ? scene.characters.length : 0
  
  // 상황별 카메라 앵글 추천
  if (script.includes('궁궐') && characterCount > 3) {
    return '궁궐 전체가 다 보여지는 익스트림 풀샷'
  } else if (script.includes('대화') && characterCount === 2) {
    return '투샷 (Two Shot)'
  } else if (script.includes('전투') || script.includes('전쟁')) {
    return '와이드 샷 (Wide Shot)'
  } else if (characterCount === 1) {
    return '미디엄 샷 (Medium Shot)'
  } else if (characterCount > 5) {
    return '풀샷 (Full Shot)'
  }
  
  return '풀샷 (Full Shot)'
}

// 이미지 크기를 비율로 변환
const convertSizeToRatio = (size) => {
  const ratioMap = {
    '1024x1024': '1:1',
    '1024x768': '4:3', 
    '768x1024': '3:4',
    '1920x1080': '16:9',
    '1080x1920': '9:16',
    '1280x720': '16:9',
    '720x1280': '9:16',
    '16:9': '16:9',
    '9:16': '9:16',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4'
  }
  
  return ratioMap[size] || '1:1'
}

// 텍스트 자르기 헬퍼
const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// 번역 함수
const translatePrompts = async () => {
  if (!enableTranslation.value || !prompt.value) {
    translatedPrompt.value = ''
    return
  }

  isTranslating.value = true
  
  try {
    const response = await fetch('/.netlify/functions/translatePrompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt.value,
        negativePrompt: null
      })
    })

    if (!response.ok) {
      throw new Error('번역 실패')
    }

    const result = await response.json()
    
    if (result.success) {
      translatedPrompt.value = result.data.translatedPrompt
    }
  } catch (error) {
    console.error('번역 오류:', error)
    // 번역 실패 시 원본 사용
    translatedPrompt.value = prompt.value
  } finally {
    isTranslating.value = false
  }
}

// 프롬프트 입력 완료 시 번역
const handlePromptBlur = () => {
  if (!enableTranslation.value || !prompt.value) return
  translatePrompts()
}

// 번역 토글 핸들러
const handleTranslationToggle = () => {
  if (enableTranslation.value) {
    translatePrompts()
  } else {
    translatedPrompt.value = ''
  }
}

// 컴포넌트 마운트 시 초기 번역
watch(() => props.show, (newVal) => {
  if (newVal && enableTranslation.value && prompt.value) {
    translatePrompts()
  }
})

const generateImage = async () => {
  if (!canGenerate.value) return
  
  generating.value = true
  
  try {
    // 번역이 활성화되어 있으면 먼저 번역 수행
    if (enableTranslation.value && !translatedPrompt.value) {
      await translatePrompts()
    }
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }

    // 모델 파라미터 준비
    const parameters = {}
    if (selectedModel.value.includes('flux')) {
      parameters.guidance_scale = guidanceScale.value
      parameters.safety_tolerance = safetyTolerance.value
      if (seed.value) {
        parameters.seed = seed.value
      }
    }

    // 참조 이미지 URL 추출
    let validReferenceImages = referenceImages.value
      .filter(item => item.url && !item.uploading)
      .map(item => item.url)

    // 프리셋 프롬프트 추가
    const presetPrompt = getPresetsPrompt()
    
    // 스타일이 선택된 경우 처리
    // 번역이 활성화되어 있고 번역된 프롬프트가 있으면 사용
    let finalPrompt = enableTranslation.value && translatedPrompt.value ? translatedPrompt.value : prompt.value
    
    // 프리셋이 있으면 프롬프트에 추가
    if (presetPrompt) {
      finalPrompt = `${finalPrompt}, ${presetPrompt}`
    }
    if (selectedStyle.value) {
      // 스타일의 base_image_url을 참조 이미지 맨 앞에 추가
      validReferenceImages = [selectedStyle.value.base_image_url, ...validReferenceImages]
      
      // 카테고리별 백그라운드 프롬프트 추가
      const stylePrompt = selectedStyle.value.scene_style_description || selectedStyle.value.description || ''
      
      if (validReferenceImages.length > 1) {
        // 참조 이미지가 2개 이상일 때 (스타일 + 다른 참조 이미지)
        if (category.value === 'character') {
          finalPrompt = `${finalPrompt}, Draw the character from the second image in a front-facing view using the style of the first image. Show the full figure completely. Aspect ratio: ${imageSize.value}. ${stylePrompt}`
        } else if (category.value === 'background') {
          finalPrompt = `${finalPrompt}, Draw the background from the second image using the style of the first image. Aspect ratio: ${imageSize.value}. ${stylePrompt}`
        } else if (category.value === 'object') {
          finalPrompt = `${finalPrompt}, Draw the props/objects from the second image using the style of the first image. Aspect ratio: ${imageSize.value}. ${stylePrompt}`
        }
      } else {
        // 스타일 이미지만 있을 때
        if (category.value === 'character') {
          const nameDesc = characterName.value || 'character'
          finalPrompt = `${finalPrompt}, Draw a ${nameDesc} character in a front-facing view using the attached reference image style. Show the full figure. Aspect ratio: ${imageSize.value}. ${stylePrompt}`
        } else if (category.value === 'background') {
          const nameDesc = characterName.value || 'background'
          finalPrompt = `${finalPrompt}, Draw a ${nameDesc} background using the attached reference image style. Aspect ratio: ${imageSize.value}. ${stylePrompt}`
        } else if (category.value === 'object') {
          const nameDesc = characterName.value || 'object'
          finalPrompt = `${finalPrompt}, Draw a ${nameDesc} prop/object using the attached reference image style. Aspect ratio: ${imageSize.value}. ${stylePrompt}`
        } else if (category.value === 'scene') {
          // 씬 카테고리이고 다른 참조 이미지가 없을 때
          if (validReferenceImages.length === 1) {
            finalPrompt += `\n\n1. Match the art style of the attached style image (colors, textures, drawing style, facial features, eye style(important)).\n2. Never use characters from the style image.\n3. If no characters are mentioned, do not draw any characters.`
          }
        }
      }
    }

    // API 요청 데이터
    const requestData = {
      projectId: props.projectId,
      prompt: finalPrompt,
      model: selectedModel.value,
      imageSize: imageSize.value,
      category: category.value,
      characterName: category.value === 'character' ? characterName.value : 
                     category.value === 'scene' ? `씬 ${sceneNumber.value || ''}` :
                     characterName.value,
      parameters: parameters,
      referenceImages: validReferenceImages,  // 스타일 이미지가 포함된 참조 이미지 배열
      styleId: selectedStyleId.value || null,
      usedPrompt: prompt.value  // 원본 프롬프트 저장
    }

    // 비동기 이미지 생성 API 호출
    const response = await fetch('/.netlify/functions/generateImageAsync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(requestData)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '이미지 생성에 실패했습니다.')
    }

    // 프로젝트의 마지막 사용 설정 저장
    await saveLastUsedSettings()
    
    // 생성 시작 성공 - Realtime으로 자동 업데이트됨
    emit('success', result.data)
    alert('이미지 생성이 시작되었습니다. 잠시 후 갤러리에 표시됩니다.')
    close()
    
  } catch (error) {
    console.error('이미지 생성 오류:', error)
    alert(`이미지 생성 실패: ${error.message}`)
  } finally {
    generating.value = false
  }
}

// 스타일 로드
const loadStyles = async () => {
  loadingStyles.value = true
  try {
    const { data, error } = await supabase
      .from('styles')
      .select('*')
      .eq('type', 'ELEMENT_ART_STYLE')
      .order('style_code', { ascending: true })
    
    if (error) throw error
    styles.value = data || []
  } catch (error) {
    console.error('스타일 로드 실패:', error)
  } finally {
    loadingStyles.value = false
  }
}

// 스타일 변경 핸들러
const onStyleChange = () => {
  // 스타일이 선택되면 자동으로 처리됨 (computed selectedStyle 사용)
  console.log('Selected style:', selectedStyle.value)
  isStyleDropdownOpen.value = false
}

// 스타일 드롭다운 미리보기 선택
const selectStyleWithPreview = (styleId) => {
  selectedStyleId.value = styleId
  isStyleDropdownOpen.value = false
  onStyleChange()
}

// 스타일 드롭다운 토글
const toggleStyleDropdown = () => {
  isStyleDropdownOpen.value = !isStyleDropdownOpen.value
}

// 마지막 사용 설정 불러오기
const loadLastUsedSettings = async () => {
  if (!props.projectId) return
  
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('last_image_model, last_image_size, last_image_style_id')
      .eq('id', props.projectId)
      .single()
    
    if (error) throw error
    
    if (data) {
      // 저장된 설정이 있으면 적용
      if (data.last_image_model) {
        selectedModel.value = data.last_image_model
      }
      if (data.last_image_size) {
        imageSize.value = data.last_image_size
      }
      if (data.last_image_style_id) {
        selectedStyleId.value = data.last_image_style_id
      }
    }
  } catch (error) {
    console.error('마지막 설정 불러오기 오류:', error)
  }
}

// 마지막 사용 설정 저장
const saveLastUsedSettings = async () => {
  if (!props.projectId) return
  
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        last_image_model: selectedModel.value,
        last_image_size: imageSize.value,
        last_image_style_id: selectedStyleId.value || null
      })
      .eq('id', props.projectId)
    
    if (error) throw error
  } catch (error) {
    console.error('설정 저장 오류:', error)
  }
}

// 컴포넌트 마운트 시
onMounted(async () => {
  // 스타일 로드
  loadStyles()
  
  // 프리셋 로드
  loadPresets()
  
  // 수정 모드가 아닌 경우에만 마지막 설정 로드
  if (!props.initialModel) {
    await loadLastUsedSettings()
  }
  
  // 참조 이미지가 있으면 추가 (수정 모드)
  if (props.referenceImage) {
    referenceImages.value.push({
      url: props.referenceImage,
      isUrl: true
    })
  }
  
  // 카테고리가 이미 scene이면 씬 목록 로드
  if (category.value === 'scene') {
    loadScenes()
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
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  transition: max-width 0.3s ease;
}

.modal-container.expanded {
  max-width: 1100px; /* 최대 1100px까지 확장 */
}

.modal-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 600px; /* 메인 콘텐츠 최소 너비 */
  overflow-y: auto;
}

@media (max-width: 1200px) {
  .modal-main-content {
    min-width: 500px;
  }
}

.modal-side-panel {
  min-width: 300px; /* 최소 너비 */
  width: 35%; /* 모달 너비의 35% */
  max-width: 500px; /* 최대 너비 */
  border-left: 1px solid var(--border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 화면 크기에 따른 반응형 조정 */
@media (max-width: 1400px) {
  .modal-container.expanded {
    max-width: 95vw;
  }
  
  .modal-side-panel {
    width: 30%;
    min-width: 280px;
  }
}

@media (max-width: 1200px) {
  .modal-side-panel {
    width: 300px; /* 작은 화면에서는 고정 너비 */
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-toggle-panel {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-toggle-panel:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-toggle-panel.active {
  background: var(--bg-secondary);
  color: var(--primary-color);
}

.modal-header h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.80rem;
}

/* 인라인 그룹 스타일 */
.inline-group {
  display: flex;
  align-items: center;
  gap: 20px;
}

.inline-label {
  min-width: 50px;
  margin-bottom: 0 !important;
  font-weight: 500;
  color: var(--text-primary);
  flex-shrink: 0;
  font-size: 0.6rem;
}

.inline-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.inline-item.category-item {
  flex: 0 0 auto;
}

.inline-item.category-item .form-select {
  width: 150px;
}

.inline-item.scene-item {
  flex: 1;
}

.inline-item.scene-item .inline-label {
  min-width: 50px;
}

.inline-item .form-select,
.inline-item .form-input {
  flex: 1;
}

.form-textarea,
.form-input,
.form-select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}


.btn-remove {
  padding: 8px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: #dc2626;
}

/* 드래그앤드롭 영역 */
.drop-zone {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--bg-secondary);
  transition: all 0.3s;
  cursor: pointer;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.drop-zone.drag-over {
  border-color: var(--primary-color);
  background: var(--primary-light);
  opacity: 0.9;
}

.drop-zone-empty {
  text-align: center;
  color: var(--text-secondary);
}

.drop-icon {
  font-size: 3rem;
  margin-bottom: 10px;
  opacity: 0.5;
}

.drop-hint {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin-top: 5px;
}

/* 참조 이미지 그리드 */
.reference-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  width: 100%;
  margin-bottom: 10px;
  grid-auto-rows: 100px; /* 고정 높이 */
}

.reference-image-item {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 6px;
  overflow: hidden;
}

.image-preview-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-wrapper img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain; /* 원본 비율 유지 */
  display: block;
}

.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn-remove-image {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 12px;
}

.btn-remove-image:hover {
  background: #dc2626;
  transform: scale(1.1);
}

/* URL 입력 섹션 */
.url-input-section {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.btn-add-url {
  padding: 10px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  transition: all 0.2s;
}

.btn-add-url:hover {
  background: var(--primary-dark);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-add-image {
  padding: 8px 16px;
  background: var(--bg-tertiary);
  color: var(--primary-color);
  border: 1px dashed var(--primary-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-add-image:hover {
  background: var(--primary-light);
  border-style: solid;
}

.advanced-params {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.advanced-params h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.param-group {
  margin-bottom: 16px;
}

.param-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.form-range {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-tertiary);
  outline: none;
  -webkit-appearance: none;
}

.form-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s;
}

.form-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 번역 토글 스타일 */
.label-with-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.translation-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-secondary);
  transition: 0.3s;
  border-radius: 24px;
  border: 1px solid var(--border-color);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(18px);
}

/* 번역 상태 표시 */
.translation-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(74, 222, 128, 0.3);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 번역된 프롬프트 미리보기 */
.translated-preview {
  margin-top: 8px;
  padding: 10px;
  background: var(--bg-tertiary);
  border-left: 3px solid var(--primary-color);
  border-radius: 4px;
  font-size: 0.85rem;
}

.preview-label {
  font-weight: 600;
  color: var(--primary-color);
  margin-right: 6px;
}

.preview-text {
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 참조 이미지 탭 */
.reference-tabs {
  display: flex;
  gap: 8px;
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

/* 선택된 참조 이미지 */
.selected-references {
  margin-top: 16px;
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.reference-content {
  margin-top: 10px;
  min-height: 80px;
}

/* 컴팩트 드래그 영역 */
.drop-zone-compact {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--bg-secondary);
  transition: all 0.3s;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone-compact:hover,
.drop-zone-compact.drag-over {
  border-color: var(--primary-color);
  background: var(--bg-tertiary);
}

.drop-zone-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}

.drop-icon-small {
  color: var(--text-secondary);
  opacity: 0.7;
  margin-bottom: 8px;
}

/* 프리셋 스타일 */
.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-preset-manage {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-preset-manage:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 36px;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.no-presets {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  font-style: italic;
  padding: 4px;
}

.preset-chip {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.preset-chip:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
}

.preset-chip.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* 라이브러리 */
.library-filters {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.filter-group {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-label,
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.filter-label input[type="radio"],
.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.filter-label input:disabled + span,
.filter-label:has(input:disabled) {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.library-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary);
}

.library-empty {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.library-empty .hint {
  font-size: 0.85rem;
  color: var(--text-tertiary);
  margin-top: 8px;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  grid-auto-rows: 100px; /* 고정 높이 */
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.library-item {
  position: relative;
  height: 100%;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  transition: all 0.2s;
}

.library-item:hover {
  border-color: var(--primary-color);
  transform: scale(1.05);
}

/* 스타일 선택 커스텀 드롭다운 */
.style-select-wrapper {
  position: relative;
  flex: 1;
}

.custom-style-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.custom-style-select:hover {
  border-color: var(--primary-color);
}

.custom-style-select .placeholder {
  color: var(--text-secondary);
}

.custom-style-select .dropdown-arrow {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* 스타일 드롭다운 미리보기 */
.style-dropdown-preview {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.style-option {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.style-option:hover {
  background: var(--bg-tertiary);
}

.style-option.selected {
  background: rgba(74, 222, 128, 0.1);
}

.style-option .style-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 12px;
}

.style-option .no-style-placeholder {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  margin-right: 12px;
  color: var(--text-secondary);
}

.style-option .style-name {
  font-size: 0.9rem;
  color: var(--text-primary);
}

/* 스타일 프리뷰 */
.style-preview {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.style-preview img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 8px;
}

.style-description {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

/* 컴팩트 스타일 프리뷰 */
.style-preview-compact {
  margin-left: 12px;
  display: inline-block;
}

.style-preview-compact img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  border: 2px solid var(--border-color);
  vertical-align: middle;
}

.library-item.selected {
  border-color: var(--primary-color);
}

.library-item img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain; /* 원본 빔율 유지 */
  display: block;
}

.library-item-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(79, 70, 229, 0.8);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.library-item.selected .library-item-overlay {
  opacity: 1;
}

.check-icon {
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 컴팩트 씬 선택 */
.selected-scene-preview {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.scene-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.scene-number-badge {
  padding: 4px 10px;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

.btn-apply-compact {
  padding: 4px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-apply-compact:hover {
  background: var(--primary-dark);
}

.scene-preview-content {
  padding-top: 8px;
}

.scene-text {
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 8px;
  max-height: 100px;
  overflow-y: auto;
  padding-right: 8px;
}

/* 씬 번호 입력 래퍼 */
.scene-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.scene-number-input {
  flex: 0 0 120px;
}

.or-text {
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-style: italic;
}

.scene-select {
  flex: 1;
}

.scene-info {
  display: flex;
  gap: 8px;
  font-size: 0.85rem;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

.info-label {
  color: var(--text-tertiary);
  font-weight: 500;
}

.info-value {
  color: var(--text-secondary);
}

/* 모바일 반응형 스타일 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 20px;
  }

  .modal-container {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    max-height: 85vh;
    border-radius: 12px;
  }

  .modal-container.expanded {
    width: 100%;
    max-width: 100%;
  }

  .modal-main-content {
    min-width: unset;
    width: 100%;
  }

  .modal-header {
    padding: 12px 16px;
  }

  .modal-header h3 {
    font-size: 1.1rem;
  }

  .modal-body {
    padding: 16px;
  }

  /* 드롭다운 화면 밖으로 나가지 않도록 수정 */
  .form-select {
    width: 100%;
    max-width: 100%;
    font-size: 14px;
  }

  /* 인라인 그룹 수직 정렬 */
  .inline-group {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .inline-item {
    flex-direction: column;
    align-items: stretch;
    flex: 1 1 100%;
    width: 100%;
    gap: 4px;
  }

  .inline-label {
    min-width: unset;
    width: 100%;
    margin-bottom: 4px;
    display: block;
    font-size: 0.85rem;
  }

  /* 카테고리 아이템도 전체 너비 사용 */
  .inline-item.category-item {
    flex: 1 1 100%;
  }

  .inline-item.category-item .form-select {
    width: 100%;
  }

  /* 모든 select와 input을 전체 너비로 */
  .inline-item .form-select,
  .inline-item .form-input {
    width: 100%;
    flex: none;
  }

  /* 스타일 선택 영역 */
  .style-select-wrapper {
    width: 100%;
  }

  .style-preview-compact {
    margin-left: 0;
    margin-top: 12px;
    display: block;
  }

  .style-dropdown-preview {
    max-width: calc(100vw - 40px);
    left: 0;
    right: 0;
    position: fixed;
    z-index: 9999;
  }

  .custom-style-select {
    width: 100%;
  }

  /* 참조 이미지 탭 */
  .reference-tabs {
    flex-wrap: wrap;
    gap: 8px;
  }

  .tab-btn {
    flex: 1 1 calc(50% - 4px);
    padding: 8px;
    font-size: 0.85rem;
  }

  /* 참조 이미지 그리드 - 모바일에서 3열로 표시 */
  .reference-images-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    grid-auto-rows: 80px;
  }

  .library-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    max-height: 250px;
    grid-auto-rows: 80px;
  }

  .reference-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  /* 업로드 영역 */
  .upload-area {
    padding: 20px;
  }

  /* 사이드 패널 */
  .modal-side-panel {
    display: none; /* 모바일에서는 사이드 패널 숨김 */
  }

  .btn-toggle-panel {
    display: none; /* 모바일에서는 토글 버튼도 숨김 */
  }

  /* 프롬프트 입력 */
  .form-textarea {
    min-height: 80px;
    font-size: 14px;
  }

  /* 버튼 */
  .modal-footer {
    padding: 12px 16px;
    flex-direction: column;
    gap: 10px;
  }

  .btn-generate,
  .btn-cancel {
    width: 100%;
    padding: 12px;
    font-size: 0.95rem;
  }

  /* 씬 선택 영역 */
  .scene-input-wrapper {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .scene-number-input {
    flex: 1;
    width: 100%;
  }

  .or-text {
    text-align: center;
  }

  .scene-select {
    width: 100%;
  }

  /* 미리보기 이미지 */
  .preview-overlay img,
  .reference-preview img {
    max-width: 90vw;
    max-height: 70vh;
  }

  /* 선택/복사 버튼 */
  .select-copy-buttons {
    flex-direction: column;
    gap: 8px;
  }

  .select-copy-buttons button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 15px;
  }

  .modal-container {
    width: 100%;
    max-width: 100%;
    max-height: 90vh;
    margin: 0 auto;
    border-radius: 10px;
  }

  .modal-header {
    padding: 10px 12px;
  }

  .modal-body {
    padding: 12px;
  }

  /* 매우 작은 화면에서도 3열 유지 */
  .reference-images-grid,
  .library-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    grid-auto-rows: 70px;
  }

  .reference-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .form-group > label {
    font-size: 0.9rem;
  }

  .style-option .style-thumb {
    width: 32px;
    height: 32px;
  }

  .style-option .no-style-placeholder {
    width: 32px;
    height: 32px;
  }
}
</style>