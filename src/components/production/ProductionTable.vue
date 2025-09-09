<template>
  <div class="production-table-root">
    <div class="production-table-wrapper" :class="{ 'panel-open': mediaPanelOpen }">
    <!-- 선택된 씬이 있을 때 표시되는 액션 바 -->
    <div v-if="selectedScenes.length > 0" class="selection-actions">
      <div class="selection-info">
        <span class="selection-count">{{ selectedScenes.length }}개 씬 선택됨</span>
      </div>
      <div class="selection-buttons">
        <button @click="playBatchTTS" class="btn-play-tts">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          TTS 일괄 듣기
        </button>
        <button @click="generateBatchTTS" class="btn-tts">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
          </svg>
          TTS 생성
        </button>
        <button @click="downloadBatchTTS" class="btn-download-tts">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          TTS 다운로드
        </button>
        <button @click="downloadBatchImages" class="btn-download-images">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          이미지 다운로드
        </button>
        <button @click="downloadBatchVideos" class="btn-download-videos">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          비디오 다운로드
        </button>
        <button @click="deleteSelectedScenes" class="btn-delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          삭제
        </button>
      </div>
    </div>
    
    <div class="production-table-container">
      <table class="production-table">
        <thead>
          <tr>
            <th class="scene-number-col">
            <input 
              type="checkbox" 
              :checked="isAllSelected"
              @change="toggleSelectAll"
            >
          </th>
          <th class="scene-image-col">
            <div class="media-header">
              <div class="media-switch-container">
                <span class="media-label" :class="{ active: globalMediaType === 'image' }">이미지</span>
                <label class="media-switch">
                  <input 
                    type="checkbox" 
                    :checked="globalMediaType === 'video'"
                    @change="switchGlobalMediaType(globalMediaType === 'image' ? 'video' : 'image')"
                  >
                  <span class="switch-slider"></span>
                </label>
                <span class="media-label" :class="{ active: globalMediaType === 'video' }">비디오</span>
              </div>
            </div>
          </th>
          <th class="script-col">스크립트 원본</th>
          <th class="scene-type-col">씬타입</th>
          <th class="director-guide-col">연출가이드</th>
          <th class="assets-col">
            <div class="assets-header">
              <span>에셋</span>
              <div class="asset-filter-dropdown">
                <button class="filter-toggle-btn" @click="toggleAssetFilterDropdown">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M7 12h10m-7 6h4"/>
                  </svg>
                </button>
                <div v-if="showAssetFilterDropdown" class="filter-dropdown-menu" @click.stop>
                  <div class="filter-option">
                    <input 
                      type="checkbox" 
                      id="filter-characters"
                      v-model="assetFilter.characters"
                    />
                    <label for="filter-characters">
                      <span class="filter-color characters-color"></span>
                      캐릭터
                    </label>
                  </div>
                  <div class="filter-option">
                    <input 
                      type="checkbox" 
                      id="filter-backgrounds"
                      v-model="assetFilter.backgrounds"
                    />
                    <label for="filter-backgrounds">
                      <span class="filter-color backgrounds-color"></span>
                      배경
                    </label>
                  </div>
                  <div class="filter-option">
                    <input 
                      type="checkbox" 
                      id="filter-props"
                      v-model="assetFilter.props"
                    />
                    <label for="filter-props">
                      <span class="filter-color props-color"></span>
                      소품/그래픽
                    </label>
                  </div>
                  <div class="filter-option">
                    <input 
                      type="checkbox" 
                      id="filter-reference"
                      v-model="assetFilter.referenceSources"
                    />
                    <label for="filter-reference">
                      <span class="filter-color reference-color"></span>
                      참고소스
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </th>
          <th class="tts-col">
            TTS
            <span v-if="totalTTSDuration > 0" class="tts-total-duration">
              ({{ formatDuration(totalTTSDuration) }})
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(scene, index) in scenes" :key="scene.id">
          <tr 
            class="production-sheet-data-row"
            :class="{ selected: isSelected(scene.id) }"
            @mouseover="setHoveredItem(scene.id)"
            @mouseleave="clearHoveredItem()"
          >
            <td v-if="!isMobile" class="scene-number-col" :data-label="'씬 번호'">
              <div class="scene-number-wrapper">
                <input 
                  type="checkbox" 
                  :checked="isSelected(scene.id)"
                  @change="toggleSelect(scene.id)"
                >
                <span class="scene-number">#S{{ scene.scene_number }}</span>
              </div>
            </td>
            <td v-if="!isMobile" class="scene-image-col" :data-label="'이미지/비디오'">
              <SceneImageUploader
                :scene-id="scene.id"
                :scene-number="scene.scene_number"
                :image-url="scene.scene_image_url"
                :video-url="scene.scene_video_url"
                :media-type="globalMediaType"
                :project-id="projectId"
                @update="handleImageUpdate(scene.id, $event)"
                @view-image="showFullImage"
              />
            </td>
            <!-- 모바일에서는 씬 번호와 이미지를 하나의 셀로 합침 -->
            <td v-if="isMobile" class="mobile-scene-header" colspan="2">
              <div class="mobile-header-row">
                <input 
                  type="checkbox" 
                  :checked="isSelected(scene.id)"
                  @change="toggleSelect(scene.id)"
                >
                <span class="scene-number">#S{{ scene.scene_number }}</span>
                <div class="mobile-media-switch-inline">
                  <span class="media-label-small" :class="{ active: sceneMediaTypes[scene.id] === 'image' }">이미지</span>
                  <label class="media-switch-small">
                    <input 
                      type="checkbox" 
                      :checked="sceneMediaTypes[scene.id] === 'video'"
                      @change="toggleSceneMediaType(scene.id)"
                    >
                    <span class="switch-slider-small"></span>
                  </label>
                  <span class="media-label-small" :class="{ active: sceneMediaTypes[scene.id] === 'video' }">비디오</span>
                </div>
              </div>
              <div class="mobile-media-container">
                <SceneImageUploader
                  :scene-id="scene.id"
                  :scene-number="scene.scene_number"
                  :image-url="scene.scene_image_url"
                  :video-url="scene.scene_video_url"
                  :media-type="sceneMediaTypes[scene.id] || 'image'"
                  :project-id="projectId"
                  :hide-switch="true"
                  @update="handleImageUpdate(scene.id, $event)"
                  @view-image="showFullImage"
                />
              </div>
            </td>
            <td class="script-col editable-cell" :data-label="isMobile ? '오리지널 스크립트' : ''" @click="startEditing(scene.id, 'original_script_text', scene.original_script_text)">
              <template v-if="isEditing(scene.id, 'original_script_text')">
                <textarea 
                  :id="`edit-${scene.id}-original_script_text`"
                  v-model="editedValue"
                  @blur="saveEdit(scene, 'original_script_text')"
                  @keydown.esc.prevent="cancelEdit"
                  @keydown.enter.ctrl="saveEdit(scene, 'original_script_text')"
                  @keydown.enter.shift.prevent="splitSceneAtCursor(scene)"
                  rows="3"
                  class="edit-input edit-textarea"
                ></textarea>
              </template>
              <template v-else>
                {{ scene.original_script_text }}
              </template>
            </td>
            
            <!-- 씬타입 컬럼 -->
            <td class="scene-type-col" :data-label="isMobile ? '씬타입' : ''">
              <span class="scene-type-badge" :class="getSceneTypeClass(scene)">
                {{ getSceneType(scene) }}
              </span>
            </td>
            
            <!-- 연출가이드 컬럼 -->
            <td class="director-guide-col editable-cell" :data-label="isMobile ? '연출가이드' : ''" @click="startEditingDirectorGuide(scene.id, scene.director_guide)">
              <template v-if="isEditing(scene.id, 'director_guide')">
                <textarea 
                  :id="`edit-${scene.id}-director-guide`"
                  v-model="editedValue"
                  @blur="handleDirectorGuideBlur(scene)"
                  @keydown.esc.prevent="cancelEdit"
                  @keydown.ctrl.enter.prevent="handleDirectorGuideEnter(scene)"
                  placeholder="시각적 연출 방안을 입력하세요..."
                  class="edit-textarea"
                  rows="3"
                />
                <div class="edit-hint">Ctrl+Enter: 저장, Esc: 취소</div>
              </template>
              <template v-else>
                <div class="director-guide-content">
                  <p v-if="scene.director_guide" class="guide-text">{{ scene.director_guide }}</p>
                  <span v-else class="empty-hint">연출가이드 추가</span>
                </div>
              </template>
            </td>
            
            <!-- 에셋 컬럼 -->
            <td class="assets-col" :data-label="isMobile ? '에셋' : ''">
              <div class="assets-container">
                <!-- 캐릭터 -->
                <div v-if="assetFilter.characters && scene.characters && scene.characters.length > 0" class="asset-section characters-section" 
                     @mouseover="hoveredAsset = `${scene.id}-characters`" 
                     @mouseleave="hoveredAsset = null"
                     @click="startEditingCharacters(scene.id, scene.characters)"
                     :class="{ 'editable-hover': hoveredAsset === `${scene.id}-characters`, 'editing': editingCell === `${scene.id}-characters` }">
                  <div class="asset-type-label">캐릭터</div>
                  <div v-if="editingCell !== `${scene.id}-characters`" class="tag-list">
                    <span 
                      v-for="(character, idx) in scene.characters" 
                      :key="`char-${idx}`"
                      class="tag character-tag"
                    >
                      {{ character }}
                    </span>
                  </div>
                  <div v-else class="edit-input-container">
                    <input 
                      :id="`edit-${scene.id}-characters`"
                      type="text" 
                      v-model="editedValue" 
                      @keydown.enter="saveCharactersEdit(scene)"
                      @keydown.escape="cancelEdit"
                      @blur="saveCharactersEdit(scene)"
                      class="edit-input"
                      placeholder="캐릭터 이름들 (쉼표로 구분)"
                    />
                  </div>
                  <div v-if="hoveredAsset === `${scene.id}-characters` && editingCell !== `${scene.id}-characters`" class="edit-hint">
                    클릭하여 편집
                  </div>
                </div>
                
                <!-- 배경 -->
                <div v-if="assetFilter.backgrounds && scene.backgrounds && scene.backgrounds.length > 0" class="asset-section backgrounds-section"
                     @mouseover="hoveredAsset = `${scene.id}-backgrounds`" 
                     @mouseleave="hoveredAsset = null"
                     @click="startEditingBackgrounds(scene.id, scene.backgrounds)"
                     :class="{ 'editable-hover': hoveredAsset === `${scene.id}-backgrounds`, 'editing': editingCell === `${scene.id}-backgrounds` }">
                  <div class="asset-type-label">배경</div>
                  <div v-if="editingCell !== `${scene.id}-backgrounds`" class="tag-list">
                    <span 
                      v-for="(background, idx) in scene.backgrounds" 
                      :key="`bg-${idx}`"
                      class="tag background-tag"
                    >
                      {{ background }}
                    </span>
                  </div>
                  <div v-else class="edit-input-container">
                    <input 
                      :id="`edit-${scene.id}-backgrounds`"
                      type="text" 
                      v-model="editedValue" 
                      @keydown.enter="saveBackgroundsEdit(scene)"
                      @keydown.escape="cancelEdit"
                      @blur="saveBackgroundsEdit(scene)"
                      class="edit-input"
                      placeholder="배경 설명들 (쉼표로 구분)"
                    />
                  </div>
                  <div v-if="hoveredAsset === `${scene.id}-backgrounds` && editingCell !== `${scene.id}-backgrounds`" class="edit-hint">
                    클릭하여 편집
                  </div>
                </div>
                
                <!-- 소품/그래픽 -->
                <div v-if="assetFilter.props && scene.props && scene.props.length > 0" class="asset-section props-section"
                     @mouseover="hoveredAsset = `${scene.id}-props`" 
                     @mouseleave="hoveredAsset = null"
                     @click="startEditingProps(scene.id, scene.props)"
                     :class="{ 'editable-hover': hoveredAsset === `${scene.id}-props`, 'editing': editingCell === `${scene.id}-props` }">
                  <div class="asset-type-label">소품/그래픽</div>
                  <div v-if="editingCell !== `${scene.id}-props`" class="tag-list">
                    <span 
                      v-for="(prop, idx) in scene.props" 
                      :key="`prop-${idx}`"
                      class="tag prop-tag"
                    >
                      {{ prop }}
                    </span>
                  </div>
                  <div v-else class="edit-input-container">
                    <input 
                      :id="`edit-${scene.id}-props`"
                      type="text" 
                      v-model="editedValue" 
                      @keydown.enter="savePropsEdit(scene)"
                      @keydown.escape="cancelEdit"
                      @blur="savePropsEdit(scene)"
                      class="edit-input"
                      placeholder="소품/그래픽 설명들 (쉼표로 구분)"
                    />
                  </div>
                  <div v-if="hoveredAsset === `${scene.id}-props` && editingCell !== `${scene.id}-props`" class="edit-hint">
                    클릭하여 편집
                  </div>
                </div>
                
                <!-- 자료 키워드 -->
                <div v-if="assetFilter.referenceSources && scene.reference_keywords && scene.reference_keywords.length > 0" class="asset-section keywords-section">
                  <div class="asset-type-label">자료</div>
                  <div class="tag-list">
                    <span 
                      v-for="(keyword, idx) in scene.reference_keywords" 
                      :key="`keyword-${idx}`"
                      class="tag reference-keyword-tag"
                    >
                      {{ keyword }}
                    </span>
                  </div>
                </div>
                
                <!-- 자료 소스 -->
                <div v-if="assetFilter.referenceSources && getReferenceSources(scene) && getReferenceSources(scene).length > 0" class="asset-section sources-section">
                  <div class="asset-type-label">참고 소스</div>
                  <div class="tag-list">
                    <span 
                      v-for="(source, idx) in getReferenceSources(scene)" 
                      :key="`source-${idx}`"
                      class="tag reference-source-tag"
                    >
                      {{ source }}
                    </span>
                  </div>
                </div>
                
                <span 
                  v-if="!hasAnyAssets(scene)" 
                  class="empty-hint clickable-hint"
                  @click="handleEmptyAssetClick(scene)"
                >
                  {{ getEmptyAssetHintText() }}
                </span>
              </div>
            </td>
            <td class="tts-col" :data-label="isMobile ? '' : 'TTS 컨트롤'">
              <div class="tts-controls">
                <!-- TTS가 없을 때 -->
                <button 
                  v-if="!ttsData[scene.id]"
                  @click="generateTTS(scene)"
                  class="tts-generate-btn"
                  :disabled="!scene.original_script_text || loadingTTS[scene.id]"
                >
                  <span v-if="loadingTTS[scene.id]" class="loading-spinner-small"></span>
                  <span v-else>생성</span>
                </button>
                
                <!-- TTS가 있을 때 -->
                <template v-else>
                  <!-- 검증 실패 시 경고 표시 -->
                  <div v-if="ttsData[scene.id]?.validation_failed" class="tts-validation-warning">
                    ⚠️ 로드 실패
                  </div>
                  
                  <button 
                    @click="playTTS(scene.id)"
                    class="tts-play-btn"
                    :class="{ 
                      'playing': playingTTS[scene.id],
                      'validation-failed': ttsData[scene.id]?.validation_failed
                    }"
                    :disabled="ttsData[scene.id]?.validation_failed"
                    :title="ttsData[scene.id]?.validation_failed ? 'TTS 파일을 로드할 수 없습니다' : '재생'"
                  >
                    <Pause v-if="playingTTS[scene.id]" :size="14" />
                    <Play v-else :size="14" />
                  </button>
                  
                  <span class="tts-duration" v-if="ttsData[scene.id]?.duration && !ttsData[scene.id]?.validation_failed">
                    {{ formatDuration(ttsData[scene.id].duration) }}
                  </span>
                  
                  <button 
                    @click="generateTTS(scene, true)"
                    class="tts-regenerate-btn"
                    :class="{ 'validation-failed-regenerate': ttsData[scene.id]?.validation_failed }"
                    :disabled="loadingTTS[scene.id]"
                    :title="ttsData[scene.id]?.validation_failed ? '파일 재생성 권장' : '재생성'"
                  >
                    <span v-if="loadingTTS[scene.id]" class="loading-spinner-small"></span>
                    <span v-else>{{ ttsData[scene.id]?.validation_failed ? '재생성' : '재생성' }}</span>
                  </button>
                  
                  <button 
                    @click="downloadTTS(scene)"
                    class="tts-download-btn"
                    :disabled="ttsData[scene.id]?.validation_failed"
                    :title="ttsData[scene.id]?.validation_failed ? '다운로드 불가' : '다운로드'"
                  >
                    <Download :size="14" />
                  </button>
                </template>
              </div>
            </td>
          </tr>
          <!-- 모바일에서 씬 추가 버튼 (씬 사이에 겹쳐짐) -->
          <div v-if="isMobile && index < scenes.length - 1" class="mobile-scene-divider">
            <button @click="addRow(scene.scene_number)" class="mobile-add-scene-floating-btn">
              + 씬 추가
            </button>
          </div>
          <!-- 데스크탑 씬 추가 버튼 오버레이 -->
          <tr v-if="!isMobile && index < scenes.length - 1" class="scene-divider-row">
            <td colspan="6" class="scene-divider-cell">
              <div 
                class="add-scene-overlay"
                :class="{ 'visible': hoveredItemId === scene.id || hoveredItemId === `divider-${scene.id}` }"
                @mouseenter="setHoveredItem(`divider-${scene.id}`)"
                @mouseleave="clearHoveredItem()"
              >
                <button @click="addRow(scene.scene_number)" class="add-scene-overlay-button">
                  + 씬 추가
                </button>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
    
    <!-- 데이터 없음 -->
    <div v-if="scenes.length === 0" class="no-data">
      <p>아직 생성된 씬이 없습니다.</p>
    </div>
    </div>
    </div>
  
    <!-- 미디어 패널 (데스크톱용) -->
    <MediaPanel 
      v-if="projectId && !isMobile"
      ref="mediaPanel"
      :project-id="projectId"
      @panel-toggle="mediaPanelOpen = $event"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useProductionStore } from '@/stores/production'
import { useProjectsStore } from '@/stores/projects'
import { supabase } from '@/utils/supabase'
import SceneImageUploader from './SceneImageUploader.vue'
import MediaPanel from '@/components/storyboard/MediaPanel.vue'
import JSZip from 'jszip'
import { Download, Play, Pause } from 'lucide-vue-next'

const props = defineProps({
  scenes: {
    type: Array,
    default: () => []
  },
  selectedScenes: {
    type: Array,
    default: () => []
  },
  projectId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:selected', 'edit-scene', 'add-scene', 'delete-scene', 'update-scene', 'character-extraction'])

const productionStore = useProductionStore()
const projectsStore = useProjectsStore()

// State
const editingCell = ref(null)
const editedValue = ref('')
const hoveredItemId = ref(null)
const hoveredAsset = ref(null)
const isSaving = ref(false)
const globalMediaType = ref('image') // 전체 미디어 타입 (image/video)
const pollingInterval = ref(null) // 자동 새로고침용 interval

// 에셋 필터링 상태
const assetFilter = ref({
  characters: true,
  backgrounds: true, 
  props: true,
  referenceSources: true
})
const showAssetFilterDropdown = ref(false)

// MediaPanel 관련
const mediaPanel = ref(null)
const mediaPanelOpen = ref(false)

// 모바일 감지
const isMobile = ref(window.innerWidth <= 768)
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
}
window.addEventListener('resize', handleResize)

// 모바일에서 각 씬별 미디어 타입 관리 (기본값: image)
const sceneMediaTypes = ref({})

// 씬별 미디어 타입 초기화
const initSceneMediaTypes = () => {
  props.scenes.forEach(scene => {
    if (!sceneMediaTypes.value[scene.id]) {
      sceneMediaTypes.value[scene.id] = 'image'
    }
  })
}


// TTS 관련 상태
const loadingTTS = ref({})
const ttsData = ref({}) // { sceneId: { file_url, duration, version } }
const playingTTS = ref({})
const audioElements = ref({})

// Computed
const isAllSelected = computed(() => {
  return props.scenes.length > 0 && 
         props.selectedScenes.length === props.scenes.length
})

// TTS 총 듀레이션 계산
const totalTTSDuration = computed(() => {
  let total = 0
  props.scenes.forEach(scene => {
    if (ttsData.value[scene.id]?.duration) {
      total += ttsData.value[scene.id].duration
    }
  })
  return total
})

// Methods
const isSelected = (sceneId) => {
  return props.selectedScenes.includes(sceneId)
}

const toggleSelect = (sceneId) => {
  let newSelected = [...props.selectedScenes]
  
  if (isSelected(sceneId)) {
    newSelected = newSelected.filter(id => id !== sceneId)
  } else {
    newSelected.push(sceneId)
  }
  
  emit('update:selected', newSelected)
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    emit('update:selected', [])
  } else {
    emit('update:selected', props.scenes.map(s => s.id))
  }
}

// 인라인 편집 관련 함수들
const startEditing = (sceneId, field, value) => {
  editingCell.value = `${sceneId}-${field}`
  editedValue.value = value || ''
  nextTick(() => {
    const input = document.querySelector(`#edit-${sceneId}-${field}`)
    if (input) {
      input.focus()
      if (input.type === 'textarea') {
        input.setSelectionRange(input.value.length, input.value.length)
      }
    }
  })
}

const startEditingCharacters = (sceneId, characters) => {
  editingCell.value = `${sceneId}-characters`
  // 배열을 쉼표로 구분된 문자열로 변환
  editedValue.value = characters ? characters.join(', ') : ''
  nextTick(() => {
    const input = document.querySelector(`#edit-${sceneId}-characters`)
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  })
}

const startEditingBackgrounds = (sceneId, backgrounds) => {
  editingCell.value = `${sceneId}-backgrounds`
  editedValue.value = backgrounds ? backgrounds.join(', ') : ''
  nextTick(() => {
    const input = document.querySelector(`#edit-${sceneId}-backgrounds`)
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  })
}

const startEditingProps = (sceneId, props) => {
  editingCell.value = `${sceneId}-props`
  editedValue.value = props ? props.join(', ') : ''
  nextTick(() => {
    const input = document.querySelector(`#edit-${sceneId}-props`)
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  })
}

const saveEdit = async (scene, field) => {
  if (editedValue.value === scene[field]) {
    cancelEdit()
    return
  }
  
  console.log(`Saving ${field}:`, editedValue.value)
  console.log('Scene ID:', scene.id)
  
  try {
    // Supabase 직접 호출
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ [field]: editedValue.value })
      .eq('id', scene.id)
      .select()
      .single()
    
    console.log(`Direct Supabase response for ${field}:`, { data, error })
    
    if (error) {
      console.error('Supabase error:', error)
      alert(`저장에 실패했습니다: ${error.message}`)
    } else {
      console.log(`${field} saved successfully, data:`, data)
      console.log('Full scene data after save:', data)
      
      // 로컬 상태 업데이트 - 해당 필드만 업데이트
      if (data[field] !== undefined) {
        scene[field] = data[field]
      }
      
      // Store 상태도 업데이트 - 해당 필드만 업데이트
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1 && data[field] !== undefined) {
        productionStore.productionSheets[index][field] = data[field]
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  }
  
  cancelEdit()
}

// Enter 키 핸들러
const handleCharactersEnter = async (scene) => {
  await saveCharactersEdit(scene)
}

// Blur 핸들러
const handleCharactersBlur = async (scene) => {
  // Enter 키로 인한 blur 이벤트는 무시
  if (editingCell.value === null) {
    return
  }
  await saveCharactersEdit(scene)
}

const saveCharactersEdit = async (scene) => {
  // 이미 저장 중이면 무시
  if (isSaving.value) {
    console.log('Already saving, ignoring duplicate call')
    return
  }
  
  // 쉼표로 구분된 문자열을 배열로 변환
  const newCharacters = editedValue.value
    .split(',')
    .map(char => char.trim())
    .filter(char => char.length > 0)
  
  // 변경사항이 없으면 취소
  const oldCharacters = scene.characters || []
  if (JSON.stringify(newCharacters) === JSON.stringify(oldCharacters)) {
    cancelEdit()
    return
  }
  
  isSaving.value = true
  console.log('Saving characters as array:', newCharacters)
  console.log('Scene ID:', scene.id)
  
  try {
    // PostgreSQL TEXT[] 배열로 저장
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ 
        characters: newCharacters  // JavaScript 배열이 자동으로 PostgreSQL 배열로 변환됨
      })
      .eq('id', scene.id)
      .select()
      .single()
    
    console.log('Supabase response:', { data, error })
    
    if (error) {
      console.error('Supabase error:', error)
      alert('캐릭터 저장에 실패했습니다: ' + error.message)
    } else {
      console.log('Characters saved successfully:', data.characters)
      console.log('Full scene data after save:', data)
      
      // 로컬 상태 업데이트 - characters만 업데이트
      if (data.characters !== undefined) {
        scene.characters = data.characters
      }
      
      // Store 상태도 업데이트 - characters만 업데이트
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1 && data.characters !== undefined) {
        productionStore.productionSheets[index].characters = data.characters
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  } finally {
    cancelEdit()  // editingCell을 null로 만들어서 blur 이벤트가 무시되도록 함
    setTimeout(() => {
      isSaving.value = false  // 약간의 지연 후 플래그 해제
    }, 100)
  }
}

const saveBackgroundsEdit = async (scene) => {
  if (isSaving.value || !editingCell.value) {
    return
  }
  
  const newBackgrounds = editedValue.value
    .split(',')
    .map(bg => bg.trim())
    .filter(bg => bg.length > 0)
  
  const oldBackgrounds = scene.backgrounds || []
  if (JSON.stringify(newBackgrounds) === JSON.stringify(oldBackgrounds)) {
    cancelEdit()
    return
  }
  
  isSaving.value = true
  
  try {
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ 
        backgrounds: newBackgrounds
      })
      .eq('id', scene.id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      alert('배경 저장에 실패했습니다: ' + error.message)
    } else {
      if (data.backgrounds !== undefined) {
        scene.backgrounds = data.backgrounds
      }
      
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1 && data.backgrounds !== undefined) {
        productionStore.productionSheets[index].backgrounds = data.backgrounds
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  } finally {
    cancelEdit()
    setTimeout(() => {
      isSaving.value = false
    }, 100)
  }
}

const savePropsEdit = async (scene) => {
  if (isSaving.value || !editingCell.value) {
    return
  }
  
  const newProps = editedValue.value
    .split(',')
    .map(prop => prop.trim())
    .filter(prop => prop.length > 0)
  
  const oldProps = scene.props || []
  if (JSON.stringify(newProps) === JSON.stringify(oldProps)) {
    cancelEdit()
    return
  }
  
  isSaving.value = true
  
  try {
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ 
        props: newProps
      })
      .eq('id', scene.id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      alert('소품 저장에 실패했습니다: ' + error.message)
    } else {
      if (data.props !== undefined) {
        scene.props = data.props
      }
      
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1 && data.props !== undefined) {
        productionStore.productionSheets[index].props = data.props
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  } finally {
    cancelEdit()
    setTimeout(() => {
      isSaving.value = false
    }, 100)
  }
}

const cancelEdit = () => {
  editingCell.value = null
  editedValue.value = ''
}

const isEditing = (sceneId, field) => {
  return editingCell.value === `${sceneId}-${field}`
}

// 연출가이드 편집 관련 함수들
const startEditingDirectorGuide = (sceneId, directorGuide) => {
  editingCell.value = `${sceneId}-director_guide`
  editedValue.value = directorGuide || ''
  nextTick(() => {
    const textarea = document.querySelector(`#edit-${sceneId}-director-guide`)
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }
  })
}

const handleDirectorGuideEnter = async (scene) => {
  await saveDirectorGuideEdit(scene)
}

const handleDirectorGuideBlur = async (scene) => {
  if (editingCell.value === null) {
    return
  }
  await saveDirectorGuideEdit(scene)
}

const saveDirectorGuideEdit = async (scene) => {
  if (isSaving.value) {
    return
  }
  
  isSaving.value = true
  
  try {
    const newDirectorGuide = editedValue.value.trim()
    
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ 
        director_guide: newDirectorGuide
      })
      .eq('id', scene.id)
      .select()
      .single()
    
    if (error) {
      console.error('연출가이드 저장 오류:', error)
      alert('연출가이드 저장에 실패했습니다: ' + error.message)
    } else {
      scene.director_guide = data.director_guide
      
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1) {
        productionStore.productionSheets[index].director_guide = data.director_guide
      }
    }
  } catch (err) {
    console.error('연출가이드 저장 오류:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  } finally {
    cancelEdit()
    setTimeout(() => {
      isSaving.value = false
    }, 100)
  }
}

// scene_type 추출 함수
const getSceneType = (scene) => {
  // metadata.scene_type이 있으면 사용
  if (scene.metadata && scene.metadata.scene_type) {
    return scene.metadata.scene_type
  }
  return 'mixed' // 기본값
}

// scene_type CSS 클래스 함수
const getSceneTypeClass = (scene) => {
  const sceneType = getSceneType(scene)
  switch (sceneType) {
    case '그래픽': return 'scene-type-graphics'
    case 'CG': return 'scene-type-cg'
    case '자료영상': return 'scene-type-archive'
    case '애니메이션': return 'scene-type-animation'
    default: return 'scene-type-mixed'
  }
}

// reference_sources 추출 함수
const getReferenceSources = (scene) => {
  // metadata.reference_sources가 있으면 사용
  if (scene.metadata && scene.metadata.reference_sources && Array.isArray(scene.metadata.reference_sources)) {
    return scene.metadata.reference_sources.filter(source => source && source !== '-')
  }
  return []
}

// 에셋 검사 함수 (필터링 조건 고려)
const hasAnyAssets = (scene) => {
  const hasReferenceSources = getReferenceSources(scene).length > 0
  
  const hasCharacters = assetFilter.value.characters && (scene.characters && scene.characters.length > 0)
  const hasBackgrounds = assetFilter.value.backgrounds && (scene.backgrounds && scene.backgrounds.length > 0)
  const hasProps = assetFilter.value.props && (scene.props && scene.props.length > 0)
  const hasReferenceData = assetFilter.value.referenceSources && (
    (scene.reference_keywords && scene.reference_keywords.length > 0) || hasReferenceSources
  )
  
  return hasCharacters || hasBackgrounds || hasProps || hasReferenceData
}

// 에셋 관련 새로운 함수들
const getEmptyAssetHintText = () => {
  const activeFilters = getActiveFilterCount()
  if (activeFilters === 1) {
    const activeFilter = getSingleActiveFilter()
    return `${activeFilter} 추가하기`
  }
  return '에셋 정보 없음'
}

const getActiveFilterCount = () => {
  let count = 0
  if (assetFilter.value.characters) count++
  if (assetFilter.value.backgrounds) count++
  if (assetFilter.value.props) count++
  if (assetFilter.value.referenceSources) count++
  return count
}

const getSingleActiveFilter = () => {
  if (assetFilter.value.characters) return '캐릭터'
  if (assetFilter.value.backgrounds) return '배경'
  if (assetFilter.value.props) return '소품'
  if (assetFilter.value.referenceSources) return '참고자료'
  return ''
}

const handleEmptyAssetClick = (scene) => {
  const activeFilters = getActiveFilterCount()
  if (activeFilters !== 1) {
    return // 필터가 정확히 하나만 활성화된 경우에만 처리
  }
  
  const activeFilter = getSingleActiveFilter()
  
  // 각 에셋 타입별로 인라인 편집 시작
  if (activeFilter === '캐릭터') {
    startCharactersEdit(scene)
  } else if (activeFilter === '배경') {
    startBackgroundsEdit(scene)
  } else if (activeFilter === '소품') {
    startPropsEdit(scene)
  }
  // 참고자료는 자동 추출이므로 수동 편집 비활성화
}

// 호버 관련 함수들
const setHoveredItem = (itemId) => {
  hoveredItemId.value = itemId
}

const clearHoveredItem = () => {
  hoveredItemId.value = null
}

// 씬 추가 함수 (Netlify Function 사용)
const addRow = async (afterSceneNumber) => {
  try {
    // 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    console.log('Adding scene after scene number:', afterSceneNumber)
    
    // Netlify Function 호출
    const response = await fetch('/.netlify/functions/addProductionSheetRow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        projectId: props.projectId,
        afterSceneNumber: afterSceneNumber
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('씬 추가 실패:', error)
      
      // 중복 키 오류인 경우 재시도
      if (error.error && error.error.includes('duplicate key')) {
        console.log('Duplicate key error detected, refreshing and retrying...')
        
        // 먼저 최신 데이터 가져오기
        await productionStore.fetchProductionSheets(props.projectId)
        
        // 마지막 씬 번호 찾기
        const maxSceneNumber = Math.max(...props.scenes.map(s => s.scene_number || 0))
        
        // 마지막에 추가
        const retryResponse = await fetch('/.netlify/functions/addProductionSheetRow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            projectId: props.projectId,
            afterSceneNumber: maxSceneNumber
          })
        })
        
        if (!retryResponse.ok) {
          const retryError = await retryResponse.json()
          console.error('재시도 실패:', retryError)
          alert('씬 추가에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.')
          return
        }
      } else {
        alert(`씬 추가에 실패했습니다: ${error.error || '알 수 없는 오류'}`)
        return
      }
    }
    
    // 프로덕션 시트 다시 로드
    await productionStore.fetchProductionSheets(props.projectId)
  } catch (err) {
    console.error('씬 추가 중 오류:', err)
    alert('씬 추가 중 오류가 발생했습니다.')
  }
}

// Shift+Enter로 씬 분할
const splitSceneAtCursor = async (scene) => {
  const textarea = document.getElementById(`edit-${scene.id}-original_script_text`)
  if (!textarea) return
  
  const cursorPosition = textarea.selectionStart
  const fullText = editedValue.value
  
  // 커서 위치에서 텍스트 분할
  const beforeText = fullText.substring(0, cursorPosition).trim()
  const afterText = fullText.substring(cursorPosition).trim()
  
  if (!beforeText || !afterText) {
    // 분할할 텍스트가 없으면 일반 저장
    await saveEdit(scene, 'original_script_text')
    return
  }
  
  try {
    const session = await supabase.auth.getSession()
    if (!session.data.session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    // 1. 먼저 현재 씬을 커서 앞부분으로 업데이트 (ID로 직접 업데이트하므로 안전)
    const { error: updateError } = await supabase
      .from('production_sheets')
      .update({ original_script_text: beforeText })
      .eq('id', scene.id)
    
    if (updateError) {
      console.error('씬 업데이트 실패:', updateError)
      alert('씬 업데이트에 실패했습니다.')
      return
    }
    
    // 2. 그 다음 새 씬 추가 (커서 뒷부분)
    const newSceneData = {
      projectId: props.projectId,
      afterSceneNumber: scene.scene_number,
      scriptText: afterText,
      characters: extractCharacters(afterText)
    }
    
    const response = await fetch('/.netlify/functions/addProductionSheetRow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session.access_token}`
      },
      body: JSON.stringify(newSceneData)
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('씬 분할 실패:', error)
      alert('씬 분할에 실패했습니다.')
      
      // 새 씬 추가 실패 시 원래 텍스트로 복구
      await supabase
        .from('production_sheets')
        .update({ original_script_text: fullText })
        .eq('id', scene.id)
      
      return
    }
    
    // 3. 편집 모드 종료
    cancelEdit()
    
    // 4. 프로덕션 시트 다시 로드
    await productionStore.fetchProductionSheets(props.projectId)
    
  } catch (err) {
    console.error('씬 분할 중 오류:', err)
    alert('씬 분할 중 오류가 발생했습니다.')
  }
}

// 간단한 캐릭터 추출 함수
const extractCharacters = (text) => {
  const characters = []
  
  // "캐릭터명 |" 패턴 찾기 (대화 부분은 제외)
  const lines = text.split('\n')
  for (const line of lines) {
    const match = line.match(/^([가-힣A-Za-z0-9\s]+)\s*\|/)
    if (match) {
      const name = match[1].trim()
      if (name && !characters.includes(name)) {
        characters.push(name)
      }
    }
  }
  
  return characters
}

// 선택 해제
const clearSelection = () => {
  emit('update:selected', [])
}

// 에셋 필터 드롭다운 토글
const toggleAssetFilterDropdown = () => {
  showAssetFilterDropdown.value = !showAssetFilterDropdown.value
}

// 드롭다운 외부 클릭 시 닫기
const handleClickOutside = (event) => {
  const dropdown = event.target.closest('.asset-filter-dropdown')
  if (!dropdown) {
    showAssetFilterDropdown.value = false
  }
}

// 씬 삭제 함수 (Netlify Function 사용)
const deleteSelectedScenes = async () => {
  if (props.selectedScenes.length === 0) {
    alert('삭제할 씬을 선택해주세요.')
    return
  }
  
  if (!confirm(`선택한 ${props.selectedScenes.length}개의 씬을 삭제하시겠습니까?`)) {
    return
  }
  
  try {
    // 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    // Netlify Function 호출
    const response = await fetch('/.netlify/functions/deleteProductionSheetRows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        projectId: props.projectId,
        idsToDelete: props.selectedScenes
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('씬 삭제 실패:', error)
      alert(`씬 삭제에 실패했습니다: ${error.error || '알 수 없는 오류'}`)
      return
    }
    
    // 선택 해제 및 프로덕션 시트 다시 로드
    emit('update:selected', [])
    await productionStore.fetchProductionSheets(props.projectId)
  } catch (err) {
    console.error('씬 삭제 중 오류:', err)
    alert('씬 삭제 중 오류가 발생했습니다.')
  }
}

// Duration 포맷 함수
const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const totalSeconds = Math.round(seconds) // 반올림
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 텍스트 파싱 함수
const parseTextForTTS = (text) => {
  let processedText = text
  
  // 1. 괄호 안 내용 제거 (지시문, 연출 노트 등)
  processedText = processedText.replace(/\([^)]*\)/g, '')
  processedText = processedText.replace(/\[[^\]]*\]/g, '')
  processedText = processedText.replace(/\{[^}]*\}/g, '')
  
  // 2. 이모지 및 특수 유니코드 문자 제거
  processedText = processedText.replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 이모티콘
  processedText = processedText.replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // 기타 기호
  processedText = processedText.replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 교통/지도 기호
  processedText = processedText.replace(/[\u{2600}-\u{26FF}]/gu, '')   // 기타 기호
  processedText = processedText.replace(/[\u{2700}-\u{27BF}]/gu, '')   // 딩뱃
  
  // 3. 따옴표 제거 (대화문 표시용 따옴표 모두 제거)
  processedText = processedText.replace(/[""""]/g, '') // 큰따옴표 제거
  processedText = processedText.replace(/['''']/g, '') // 작은따옴표 제거
  processedText = processedText.replace(/[「」『』]/g, '') // 일본어 따옴표 제거
  processedText = processedText.replace(/[《》〈〉]/g, '') // 중국어 따옴표 제거
  processedText = processedText.replace(/[｢｣]/g, '') // 반각 따옴표 제거
  processedText = processedText.replace(/[`´]/g, '') // 백틱과 억음 부호 제거
  
  // 4. 특수 문자 처리
  processedText = processedText.replace(/[♪♫♬♭♮♯]/g, '') // 음악 기호
  processedText = processedText.replace(/[★☆♥♡]/g, '') // 별, 하트 등
  processedText = processedText.replace(/[※▶◀■□▲△▼▽○●◎◇◆]/g, '') // 도형
  
  // 5. 연속된 특수 문자 정리
  processedText = processedText.replace(/[!?]{2,}/g, match => match[0]) // 연속된 느낌표/물음표를 하나로
  processedText = processedText.replace(/\.{3,}/g, '...') // 연속된 마침표를 ...로
  processedText = processedText.replace(/[~]{2,}/g, '~') // 연속된 물결표를 하나로
  
  // 6. 줄바꿈 및 공백 정리
  processedText = processedText.replace(/\n{3,}/g, '\n\n') // 3개 이상의 줄바꿈을 2개로
  processedText = processedText.replace(/\s+/g, ' ') // 연속된 공백을 하나로
  processedText = processedText.trim() // 앞뒤 공백 제거
  
  return processedText
}

// TTS 생성 함수
const generateTTS = async (scene, regenerate = false) => {
  if (!scene.original_script_text) {
    alert('스크립트 텍스트가 없습니다.')
    return
  }
  
  // 텍스트 파싱 (클라이언트에서 미리 확인)
  const parsedText = parseTextForTTS(scene.original_script_text)
  if (!parsedText || parsedText.length === 0) {
    alert('텍스트 처리 후 내용이 없습니다. 스크립트를 확인해주세요.')
    return
  }
  
  try {
    // 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    loadingTTS.value[scene.id] = true
    
    // TTS 생성 API 호출 (원본 텍스트를 보내고 서버에서 파싱)
    const response = await fetch('/.netlify/functions/generateTTS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        projectId: props.projectId,
        sceneId: scene.id,
        text: scene.original_script_text // 원본 텍스트를 보냄 (서버에서 파싱)
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'TTS 생성에 실패했습니다.')
    }
    
    const result = await response.json()
    console.log('TTS generated:', result)
    
    // 오디오 요소 생성 및 duration 계산
    if (!audioElements.value[scene.id]) {
      audioElements.value[scene.id] = new Audio()
    }
    const audio = audioElements.value[scene.id]
    audio.src = result.data.file_url
    
    // 오디오 메타데이터 로드 대기하여 duration 얻기
    await new Promise((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        // TTS 데이터 저장
        ttsData.value[scene.id] = {
          file_url: result.data.file_url,
          duration: audio.duration,
          version: result.data.version
        }
        
        // Duration을 데이터베이스에 저장
        saveTTSDuration(scene.id, audio.duration, result.data.version)
        resolve()
      }, { once: true })
      
      audio.load()
    })
    
    if (regenerate) {
      alert('TTS가 재생성되었습니다.')
    } else {
      alert('TTS가 성공적으로 생성되었습니다.')
    }
  } catch (error) {
    console.error('TTS 생성 오류:', error)
    alert(`TTS 생성 실패: ${error.message}`)
  } finally {
    loadingTTS.value[scene.id] = false
  }
}

// TTS duration 저장 함수
const saveTTSDuration = async (sceneId, duration, version) => {
  try {
    const { error } = await supabase
      .from('tts_audio')
      .update({ duration })
      .eq('scene_id', sceneId)
      .eq('version', version || 1)
    
    if (error) {
      console.error('Duration 저장 실패:', error)
    }
  } catch (err) {
    console.error('Duration 저장 오류:', err)
  }
}

// TTS 일괄 듣기 기능
let currentAudioPlayer = null
let ttsPlaylist = []
let currentTrackIndex = 0

const playBatchTTS = async () => {
  if (props.selectedScenes.length === 0) {
    alert('TTS를 들을 씬을 선택해주세요.')
    return
  }
  
  // 선택된 씬들 중 TTS가 있는 씬만 필터링
  const scenesWithTTS = []
  for (const sceneId of props.selectedScenes) {
    const scene = props.scenes.find(s => s.id === sceneId)
    if (scene && scene.tts_audio_url) {
      scenesWithTTS.push({
        id: scene.id,
        sceneNumber: scene.scene_number,
        text: scene.original_script_text,
        audioUrl: scene.tts_audio_url
      })
    }
  }
  
  if (scenesWithTTS.length === 0) {
    // TTS가 없으면 먼저 생성하도록 안내
    const confirmGenerate = confirm('선택된 씬에 TTS가 없습니다. TTS를 먼저 생성하시겠습니까?')
    if (confirmGenerate) {
      generateBatchTTS()
    }
    return
  }
  
  // 씬 번호순으로 정렬
  scenesWithTTS.sort((a, b) => a.sceneNumber - b.sceneNumber)
  
  // 플레이리스트 설정
  ttsPlaylist = scenesWithTTS
  currentTrackIndex = 0
  
  // 재생 시작
  playNextTrack()
}

const playNextTrack = () => {
  if (currentTrackIndex >= ttsPlaylist.length) {
    console.log('TTS 일괄 재생 완료')
    return
  }
  
  const currentTrack = ttsPlaylist[currentTrackIndex]
  console.log(`재생 중: 씬 ${currentTrack.sceneNumber} - ${currentTrack.text.substring(0, 50)}...`)
  
  // 기존 플레이어 정리
  if (currentAudioPlayer) {
    currentAudioPlayer.pause()
    currentAudioPlayer.removeEventListener('ended', onTrackEnded)
    currentAudioPlayer.removeEventListener('error', onTrackError)
  }
  
  // 새 오디오 플레이어 생성
  currentAudioPlayer = new Audio(currentTrack.audioUrl)
  currentAudioPlayer.addEventListener('ended', onTrackEnded)
  currentAudioPlayer.addEventListener('error', onTrackError)
  
  // 재생
  currentAudioPlayer.play().catch(error => {
    console.error('Audio play error:', error)
    // 에러 발생 시 다음 트랙으로
    currentTrackIndex++
    playNextTrack()
  })
}

const onTrackEnded = () => {
  currentTrackIndex++
  playNextTrack()
}

const onTrackError = (error) => {
  console.error('Audio error:', error)
  currentTrackIndex++
  playNextTrack()
}

// 컴포넌트 언마운트 시 오디오 정리
onUnmounted(() => {
  if (currentAudioPlayer) {
    currentAudioPlayer.pause()
    currentAudioPlayer.removeEventListener('ended', onTrackEnded)
    currentAudioPlayer.removeEventListener('error', onTrackError)
  }
})

const generateBatchTTS = async () => {
  if (props.selectedScenes.length === 0) {
    alert('TTS를 생성할 씬을 선택해주세요.')
    return
  }
  
  // 선택된 씬들 중 스크립트가 있는 씬만 필터링
  const scenesWithScript = props.scenes
    .filter(scene => {
      if (!props.selectedScenes.includes(scene.id) || !scene.original_script_text) {
        return false
      }
      // 파싱 후 텍스트가 있는지 확인
      const parsed = parseTextForTTS(scene.original_script_text)
      return parsed && parsed.length > 0
    })
  
  if (scenesWithScript.length === 0) {
    alert('선택된 씬에 유효한 스크립트가 없습니다.')
    return
  }
  
  const confirmMessage = `${scenesWithScript.length}개 씬의 TTS를 생성하시겠습니까?`
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    // 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    // 모든 씬에 대해 로딩 상태 설정
    scenesWithScript.forEach(scene => {
      loadingTTS.value[scene.id] = true
    })
    
    // ElevenLabs API는 동시에 5개까지만 허용하므로 배치로 나누어 처리
    const batchSize = 5
    const batches = []
    
    for (let i = 0; i < scenesWithScript.length; i += batchSize) {
      batches.push(scenesWithScript.slice(i, i + batchSize))
    }
    
    const allResults = []
    
    // 각 배치를 순차적으로 처리
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`배치 ${batchIndex + 1}/${batches.length} 처리 중 (${batch.length}개 씬)`)
      
      // 현재 배치의 TTS 생성 요청들 (배치 내에서는 병렬 처리)
      const batchPromises = batch.map(async (scene) => {
        try {
          const response = await fetch('/.netlify/functions/generateTTS', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              projectId: props.projectId,
              sceneId: scene.id,
              text: scene.original_script_text
            })
          })
          
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'TTS 생성에 실패했습니다.')
          }
          
          const result = await response.json()
          
          // 오디오 요소 생성 및 duration 계산
          if (!audioElements.value[scene.id]) {
            audioElements.value[scene.id] = new Audio()
          }
          const audio = audioElements.value[scene.id]
          audio.src = result.data.file_url
          
          // 오디오 메타데이터 로드 대기
          await new Promise((resolve) => {
            audio.addEventListener('loadedmetadata', () => {
              // TTS 데이터 저장
              ttsData.value[scene.id] = {
                file_url: result.data.file_url,
                duration: audio.duration,
                version: result.data.version
              }
              
              // Duration을 데이터베이스에 저장
              saveTTSDuration(scene.id, audio.duration, result.data.version)
              
              resolve()
            }, { once: true })
            
            audio.load()
          })
          
          return { success: true, sceneId: scene.id, sceneNumber: scene.scene_number }
        } catch (error) {
          console.error(`씬 ${scene.scene_number} TTS 생성 실패:`, error)
          return { success: false, sceneId: scene.id, sceneNumber: scene.scene_number, error: error.message }
        } finally {
          loadingTTS.value[scene.id] = false
        }
      })
      
      // 현재 배치의 모든 요청이 완료될 때까지 대기
      const batchResults = await Promise.allSettled(batchPromises)
      allResults.push(...batchResults)
      
      console.log(`배치 ${batchIndex + 1} 완료: ${batchResults.filter(r => r.value?.success).length}개 성공`)
      
      // 다음 배치 처리 전 1초 대기 (API 제한 회피)
      if (batchIndex < batches.length - 1) {
        console.log('다음 배치 처리 전 대기 중...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // 모든 결과를 results에 할당
    const results = allResults
    
    // 결과 집계
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
    
    // 선택 해제
    clearSelection()
    
    // 결과 알림
    if (failCount === 0) {
      alert(`${successCount}개 씬의 TTS가 성공적으로 생성되었습니다.`)
    } else {
      alert(`TTS 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    }
    
  } catch (error) {
    console.error('일괄 TTS 생성 오류:', error)
    alert(`일괄 TTS 생성 실패: ${error.message}`)
    
    // 모든 로딩 상태 해제
    scenesWithScript.forEach(scene => {
      loadingTTS.value[scene.id] = false
    })
  }
}

// TTS 일괄 다운로드 함수
const downloadBatchTTS = async () => {
  if (props.selectedScenes.length === 0) {
    alert('다운로드할 TTS를 선택해주세요.')
    return
  }
  
  // 선택된 씬들 중 TTS가 있는 씬만 필터링
  const scenesWithTTS = props.scenes.filter(scene => {
    return props.selectedScenes.includes(scene.id) && ttsData.value[scene.id]?.file_url
  })
  
  if (scenesWithTTS.length === 0) {
    alert('선택된 씬에 다운로드 가능한 TTS가 없습니다.')
    return
  }
  
  try {
    // 프로젝트 정보 가져오기 - currentProject가 없으면 직접 가져오기
    let projectName = projectsStore.currentProject?.name
    
    if (!projectName) {
      // projectId로 프로젝트 정보 가져오기
      await projectsStore.getProject(props.projectId)
      projectName = projectsStore.currentProject?.name || 'project'
    }
    
    // ZIP 파일 생성
    const zip = new JSZip()
    
    // 각 TTS 파일 다운로드 및 ZIP에 추가
    const downloadPromises = scenesWithTTS.map(async (scene) => {
      try {
        const tts = ttsData.value[scene.id]
        const response = await fetch(tts.file_url)
        
        if (!response.ok) {
          throw new Error(`Failed to download TTS for scene ${scene.scene_number}`)
        }
        
        const blob = await response.blob()
        const fileName = `TTS_${projectName}_${scene.scene_number}.mp3`
        
        // ZIP에 파일 추가
        zip.file(fileName, blob)
        
        return { success: true, sceneNumber: scene.scene_number }
      } catch (error) {
        console.error(`Scene ${scene.scene_number} TTS download failed:`, error)
        return { success: false, sceneNumber: scene.scene_number, error: error.message }
      }
    })
    
    // 모든 다운로드 완료 대기
    const results = await Promise.allSettled(downloadPromises)
    const successCount = results.filter(r => r.value?.success).length
    const failCount = results.filter(r => !r.value?.success).length
    
    if (successCount === 0) {
      alert('다운로드 가능한 TTS 파일이 없습니다.')
      return
    }
    
    // ZIP 파일 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `TTS_${projectName}_batch.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    // 결과 알림
    if (failCount > 0) {
      alert(`TTS 다운로드 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    } else {
      alert(`${successCount}개 TTS 파일이 다운로드되었습니다.`)
    }
    
    // 선택 해제
    clearSelection()
    
  } catch (error) {
    console.error('TTS 일괄 다운로드 오류:', error)
    alert(`TTS 다운로드 실패: ${error.message}`)
  }
}

// 이미지 일괄 다운로드 함수
const downloadBatchImages = async () => {
  if (props.selectedScenes.length === 0) {
    alert('다운로드할 씬을 선택해주세요.')
    return
  }
  
  // 선택된 씬들 중 이미지가 있는 씬만 필터링
  const scenesWithImages = props.scenes.filter(scene => {
    return props.selectedScenes.includes(scene.id) && scene.scene_image_url
  })
  
  if (scenesWithImages.length === 0) {
    alert('선택된 씬에 다운로드 가능한 이미지가 없습니다.')
    return
  }
  
  try {
    // 프로젝트 정보 가져오기
    let projectName = projectsStore.currentProject?.name
    
    if (!projectName) {
      await projectsStore.getProject(props.projectId)
      projectName = projectsStore.currentProject?.name || 'project'
    }
    
    // ZIP 파일 생성
    const zip = new JSZip()
    
    // 각 이미지 파일 다운로드 및 ZIP에 추가
    const downloadPromises = scenesWithImages.map(async (scene) => {
      try {
        // CORS 문제 회피를 위해 프록시 사용 (Supabase 이미지인 경우)
        let imageUrl = scene.scene_image_url
        
        // 이미지 다운로드
        const response = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to download image for scene ${scene.scene_number}: ${response.status}`)
        }
        
        const blob = await response.blob()
        
        // 파일 확장자 결정 (Content-Type 기반)
        const contentType = response.headers.get('content-type') || 'image/png'
        let extension = 'png'
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          extension = 'jpg'
        } else if (contentType.includes('webp')) {
          extension = 'webp'
        } else if (contentType.includes('gif')) {
          extension = 'gif'
        }
        
        const fileName = `image_${projectName}_scene_${String(scene.scene_number).padStart(3, '0')}.${extension}`
        
        // ZIP에 파일 추가
        zip.file(fileName, blob, { binary: true })
        
        console.log(`Successfully added ${fileName} to ZIP`)
        return { success: true, sceneNumber: scene.scene_number, fileName }
      } catch (error) {
        console.error(`Scene ${scene.scene_number} image download failed:`, error)
        return { success: false, sceneNumber: scene.scene_number, error: error.message }
      }
    })
    
    // 모든 다운로드 완료 대기
    const results = await Promise.all(downloadPromises)
    const successResults = results.filter(r => r.success)
    const successCount = successResults.length
    const failCount = results.filter(r => !r.success).length
    
    if (successCount === 0) {
      alert('다운로드 가능한 이미지 파일이 없습니다.')
      return
    }
    
    // ZIP 파일 생성 및 다운로드
    console.log(`Creating ZIP file with ${successCount} images...`)
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: "DEFLATE",
      compressionOptions: {
        level: 6  // 압축 레벨 (1-9, 6이 기본값)
      }
    })
    
    // 파일 크기 확인
    const fileSizeMB = (zipBlob.size / (1024 * 1024)).toFixed(2)
    console.log(`ZIP file created: ${fileSizeMB} MB`)
    
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `images_${projectName}_batch_${new Date().getTime()}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 메모리 정리를 위해 약간의 딜레이 후 revoke
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
    
    // 결과 알림
    if (failCount > 0) {
      alert(`이미지 다운로드 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    } else {
      alert(`${successCount}개 이미지 파일이 다운로드되었습니다.`)
    }
    
    // 선택 해제
    clearSelection()
    
  } catch (error) {
    console.error('이미지 일괄 다운로드 오류:', error)
    alert(`이미지 다운로드 실패: ${error.message}`)
  }
}

// 비디오 일괄 다운로드 함수
const downloadBatchVideos = async () => {
  if (props.selectedScenes.length === 0) {
    alert('다운로드할 씬을 선택해주세요.')
    return
  }
  
  // 선택된 씬의 비디오 데이터 가져오기 (업스케일 비디오 포함)
  const { data: videoData, error: videoError } = await supabase
    .from('gen_videos')
    .select('scene_id, storage_video_url, upscale_video_url, upscale_status, upscale_factor')
    .in('scene_id', props.selectedScenes)
  
  if (videoError) {
    console.error('비디오 데이터 로드 실패:', videoError)
    alert('비디오 데이터를 불러오는데 실패했습니다.')
    return
  }
  
  // 각 씬의 최적 비디오 찾기 (업스케일된 비디오 우선)
  const bestVideoByScene = {}
  if (videoData) {
    videoData.forEach(video => {
      if (!bestVideoByScene[video.scene_id]) {
        bestVideoByScene[video.scene_id] = video
      } else {
        const currentVideo = bestVideoByScene[video.scene_id]
        // 업스케일된 비디오가 있으면 우선적으로 사용
        if (video.upscale_video_url && video.upscale_status === 'completed') {
          bestVideoByScene[video.scene_id] = video
        } else if (!currentVideo.upscale_video_url && video.storage_video_url) {
          bestVideoByScene[video.scene_id] = video
        }
      }
    })
  }
  
  // 선택된 씬들 중 비디오가 있는 씬만 필터링
  const scenesWithVideos = props.scenes.filter(scene => {
    if (!props.selectedScenes.includes(scene.id)) return false
    
    const video = bestVideoByScene[scene.id]
    const videoUrl = video?.upscale_video_url || video?.storage_video_url || scene.scene_video_url
    
    return videoUrl && videoUrl.trim() !== ''
  }).map(scene => {
    const video = bestVideoByScene[scene.id]
    const videoUrl = video?.upscale_video_url || video?.storage_video_url || scene.scene_video_url
    const isUpscaled = !!(video?.upscale_video_url && video?.upscale_status === 'completed')
    const upscaleFactor = video?.upscale_factor || null
    
    return {
      ...scene,
      bestVideoUrl: videoUrl,
      isUpscaled: isUpscaled,
      upscaleFactor: upscaleFactor
    }
  })
  
  if (scenesWithVideos.length === 0) {
    // 선택된 씬들을 확인하여 더 구체적인 메시지 제공
    const selectedCount = props.selectedScenes.length
    alert(`선택된 ${selectedCount}개 씬에 다운로드 가능한 비디오가 없습니다.\n비디오가 생성된 씬을 선택해주세요.`)
    return
  }
  
  console.log(`Processing ${scenesWithVideos.length} scenes with videos out of ${props.selectedScenes.length} selected`)
  
  try {
    // 프로젝트 정보 가져오기
    let projectName = projectsStore.currentProject?.name
    
    if (!projectName) {
      await projectsStore.getProject(props.projectId)
      projectName = projectsStore.currentProject?.name || 'project'
    }
    
    // ZIP 파일 생성
    const zip = new JSZip()
    
    // 각 비디오 파일 다운로드 및 ZIP에 추가
    const downloadPromises = scenesWithVideos.map(async (scene) => {
      try {
        // 비디오 URL이 없거나 유효하지 않은 경우 건너뛰기
        if (!scene.bestVideoUrl) {
          console.log(`Scene ${scene.scene_number}: No video URL available`)
          return { success: false, sceneNumber: scene.scene_number, error: 'No video URL' }
        }

        // CORS 문제를 피하기 위한 fetch 옵션 설정
        const response = await fetch(scene.bestVideoUrl, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-cache'
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        
        // blob이 유효한지 확인
        if (!blob || blob.size === 0) {
          throw new Error('Empty or invalid video file')
        }
        
        // 업스케일 표시를 포함한 파일명 생성
        const upscaleTag = scene.isUpscaled ? `-upscaled-${scene.upscaleFactor || '4x'}` : ''
        const fileName = `video_${projectName}_${scene.scene_number}${upscaleTag}.mp4`
        
        // ZIP에 파일 추가
        zip.file(fileName, blob)
        
        return { success: true, sceneNumber: scene.scene_number, isUpscaled: scene.isUpscaled }
      } catch (error) {
        // 에러를 경고로 변경하여 다른 비디오 다운로드는 계속 진행
        console.warn(`Scene ${scene.scene_number} video download skipped:`, error.message)
        return { success: false, sceneNumber: scene.scene_number, error: error.message }
      }
    })
    
    // 모든 다운로드 완료 대기
    const results = await Promise.allSettled(downloadPromises)
    const successCount = results.filter(r => r.value?.success).length
    const failCount = results.filter(r => !r.value?.success).length
    
    if (successCount === 0) {
      alert('다운로드 가능한 비디오 파일이 없습니다.')
      return
    }
    
    // ZIP 파일 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `videos_${projectName}_batch.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    // 결과 알림 (업스케일 정보 포함)
    const upscaledCount = results.filter(r => r.value?.success && r.value?.isUpscaled).length
    if (failCount > 0) {
      const upscaleMsg = upscaledCount > 0 ? ` (업스케일: ${upscaledCount}개)` : ''
      alert(`비디오 다운로드 완료: 성공 ${successCount}개${upscaleMsg}, 실패 ${failCount}개`)
    } else {
      const upscaleMsg = upscaledCount > 0 ? ` (업스케일: ${upscaledCount}개)` : ''
      alert(`${successCount}개 비디오 파일이 다운로드되었습니다.${upscaleMsg}`)
    }
    
    // 선택 해제
    clearSelection()
    
  } catch (error) {
    console.error('비디오 일괄 다운로드 오류:', error)
    alert(`비디오 다운로드 실패: ${error.message}`)
  }
}

// TTS 다운로드 함수
const downloadTTS = async (scene) => {
  const tts = ttsData.value[scene.id]
  if (!tts || !tts.file_url) {
    alert('TTS 파일이 없습니다.')
    return
  }
  
  try {
    // 프로젝트 이름 가져오기
    const projectName = currentProject.value?.name || 'untitled'
    const sceneNumber = scene.scene_number || 'unknown'
    
    // 버전 정보 가져오기 (tts.version이 있으면 사용, 없으면 v1)
    const version = tts.version || 'v1'
    
    // 파일명 생성 (특수문자 제거)
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
    const fileName = `TTS_${sanitizedProjectName}_${sceneNumber}_${version}.wav`
    
    // TTS 파일 다운로드
    const response = await fetch(tts.file_url)
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
    console.error('TTS 다운로드 오류:', error)
    // 실패 시 기본 다운로드
    const link = document.createElement('a')
    link.href = tts.file_url
    link.download = `TTS_${scene.id}_v1.wav`
    link.click()
  }
}

// TTS 재생/일시정지 함수
const playTTS = async (sceneId) => {
  if (!audioElements.value[sceneId]) {
    // ttsData에서 URL 가져오기
    const tts = ttsData.value[sceneId]
    if (!tts || !tts.file_url) {
      alert('TTS 파일을 찾을 수 없습니다.')
      return
    }
    
    audioElements.value[sceneId] = new Audio(tts.file_url)
  }
  
  const audio = audioElements.value[sceneId]
  
  if (playingTTS.value[sceneId]) {
    // 일시정지
    audio.pause()
    playingTTS.value[sceneId] = false
  } else {
    // 재생
    try {
      // 다른 재생 중인 오디오 정지
      Object.keys(audioElements.value).forEach(id => {
        if (id !== sceneId && audioElements.value[id]) {
          audioElements.value[id].pause()
          playingTTS.value[id] = false
        }
      })
      
      await audio.play()
      playingTTS.value[sceneId] = true
      
      // 재생 완료 시 상태 업데이트
      audio.onended = () => {
        playingTTS.value[sceneId] = false
      }
    } catch (error) {
      console.error('오디오 재생 오류:', error)
      alert('오디오 재생에 실패했습니다.')
    }
  }
}

// 이미지 업로드 관련 메서드
const handleImageUpdate = async () => {
  // 스토어 업데이트
  await productionStore.fetchProductionSheets(props.projectId)
}

const showFullImage = (mediaUrl) => {
  // 전체 화면 미디어 보기 (간단한 모달 또는 새 창)
  window.open(mediaUrl, '_blank')
}

// 전체 미디어 타입 스위치 핸들러
const switchGlobalMediaType = (newType) => {
  globalMediaType.value = newType
  console.log(`전체 미디어 타입이 ${newType}로 변경되었습니다.`)
}

// 모바일에서 개별 씬 미디어 타입 토글
const toggleSceneMediaType = (sceneId) => {
  const currentType = sceneMediaTypes.value[sceneId] || 'image'
  const newType = currentType === 'image' ? 'video' : 'image'
  sceneMediaTypes.value[sceneId] = newType
  console.log(`Scene ${sceneId} media type changed to: ${newType}`)
}

// TTS 파일 검증 함수
const validateTtsFile = async (audioUrl) => {
  if (!audioUrl) return false
  
  try {
    // HEAD 요청으로 파일 접근 가능성 확인
    const response = await fetch(audioUrl, { method: 'HEAD' })
    if (!response.ok) {
      console.warn(`TTS 파일 접근 불가: ${audioUrl} (${response.status})`)
      return false
    }
    
    // Content-Type 확인 (오디오 파일인지)
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('audio')) {
      console.warn(`TTS 파일이 아닌 형식: ${audioUrl} (${contentType})`)
      return false
    }
    
    return true
  } catch (error) {
    console.warn(`TTS 파일 검증 실패: ${audioUrl}`, error)
    return false
  }
}

// TTS 파일 존재 여부 확인 및 검증 (컴포넌트 마운트 시)
const checkExistingTTS = async () => {
  if (!props.scenes.length) return
  
  const sceneIds = props.scenes.map(s => s.id)
  
  // 각 씬의 최신 TTS 정보 가져오기
  const { data } = await supabase
    .from('tts_audio')
    .select('scene_id, file_url, duration, version')
    .in('scene_id', sceneIds)
    .order('version', { ascending: false })
  
  if (data) {
    // 각 씬의 최신 버전만 저장
    const latestByScene = {}
    data.forEach(item => {
      if (!latestByScene[item.scene_id] || item.version > latestByScene[item.scene_id].version) {
        latestByScene[item.scene_id] = item
      }
    })
    
    // TTS 데이터 저장 및 검증
    let hasInvalidFiles = false
    
    for (const item of Object.values(latestByScene)) {
      // TTS 파일 접근 가능성 검증
      const isValid = await validateTtsFile(item.file_url)
      
      ttsData.value[item.scene_id] = {
        file_url: item.file_url,
        duration: item.duration,
        version: item.version,
        validation_failed: !isValid
      }
      
      if (!isValid) {
        hasInvalidFiles = true
      }
    }
    
    // 검증 실패한 파일이 있으면 알림 표시
    if (hasInvalidFiles) {
      console.warn('일부 TTS 파일을 로드할 수 없습니다.')
      // 실패한 TTS 파일 개수 알림 (필요시 구현)
      const failedCount = Object.values(ttsData.value).filter(item => item.validation_failed).length
      console.log(`${failedCount}개의 TTS 파일 로드 실패`)
    }
  }
}

// 자동 새로고침 함수
const startPolling = () => {
  // 기존 polling 정리
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
  
  // 10초마다 실시간 데이터 확인 (silent 모드로)
  pollingInterval.value = setInterval(async () => {
    // 현재 편집 중이 아닐 때만 새로고침
    if (!editingCell.value && !isSaving.value) {
      await productionStore.fetchProductionSheets(props.projectId, true) // silent: true
      console.log('자동 새로고침: 프로덕션 데이터 업데이트됨')
    }
  }, 10000) // 10초마다
}

const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

// scenes 변경 감지
watch(() => props.scenes, () => {
  initSceneMediaTypes()
}, { deep: true })

// 컴포넌트 마운트 시 TTS 확인 및 폴링 시작
onMounted(() => {
  initSceneMediaTypes() // 씬 미디어 타입 초기화
  checkExistingTTS()
  startPolling() // 자동 새로고침 시작
  document.addEventListener('click', handleClickOutside) // 드롭다운 외부 클릭 감지
})


// 컴포넌트 언마운트 시 오디오 정리 및 폴링 중지
onUnmounted(() => {
  Object.values(audioElements.value).forEach(audio => {
    if (audio) {
      audio.pause()
      audio.src = ''
    }
  })
  stopPolling() // 자동 새로고침 중지
  window.removeEventListener('resize', handleResize) // 리사이즈 리스너 제거
  document.removeEventListener('click', handleClickOutside) // 드롭다운 이벤트 리스너 제거
})


// export deleteSelectedScenes for parent component
defineExpose({ deleteSelectedScenes })
</script>

<style scoped>
/* 루트 컨테이너 */
.production-table-root {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
}

.production-table-wrapper {
  width: 100%;
  position: relative;
  height: 100%;
  overflow-y: auto;
  padding: 10px 5px; /* 좌우 여백 최소화 */
  padding-top: 10px;
  transition: padding-right 0.3s ease;
}

/* 패널이 열렸을 때 콘텐츠 영역 조정 */
.production-table-wrapper.panel-open {
  padding-right: 310px; /* 패널 너비(300px) + 여백(10px) */
}

/* 섹션 헤더 - 이미지뷰와 스타일 통일 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0;
}

.section-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.filter-options {
  display: flex;
  gap: 12px;
}

/* 선택 액션 바 */
.selection-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(34, 197, 94, 0.05));
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  margin-bottom: 12px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-count {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 0.95rem;
}

.selection-buttons {
  display: flex;
  gap: 8px;
}

.btn-character,
.btn-reference-keywords,
.btn-tts,
.btn-download-tts {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download-tts {
  background-color: #10b981;
}

.btn-download-images {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download-videos {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-character:hover,
.btn-reference-keywords:hover,
.btn-tts:hover,
.btn-download-tts:hover {
  background-color: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.btn-download-tts:hover {
  background-color: #059669;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-download-images:hover {
  background-color: #7c3aed;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.btn-download-videos:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-tts svg,
.btn-download-tts svg,
.btn-download-images svg,
.btn-download-videos svg {
  width: 16px;
  height: 16px;
}

.btn-delete {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background-color: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-delete svg {
  width: 16px;
  height: 16px;
}

.btn-cancel {
  padding: 6px 14px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--text-secondary);
}

.production-table-container {
  width: 100%;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.production-table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.production-table-container::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.production-table-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.production-table-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.production-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--bg-primary);
}

.production-table thead {
  background-color: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.production-table th {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 2px solid var(--border-color);
  white-space: nowrap;
}

.production-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
  min-height: 140px;
}

.production-table tbody tr:hover {
  background-color: var(--bg-secondary);
}

.production-table tbody tr.selected {
  background-color: rgba(74, 222, 128, 0.1);
}

.production-table td {
  padding: 12px;
  vertical-align: middle;
  color: var(--text-primary);
}

/* Media type switcher */
.media-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
}

/* Switch container */
.media-switch-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.media-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: color 0.3s;
  font-weight: 500;
}

.media-label.active {
  font-weight: 600;
}

/* 이미지 레이블 활성화 시 파란색 */
.media-label:first-child.active {
  color: #60a5fa;
}

/* 비디오 레이블 활성화 시 초록색 */
.media-label:last-child.active {
  color: var(--primary-color);
}

/* 캐릭터 정규화 버튼 스타일 */
.btn-normalize {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-normalize:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Toggle switch styles */
.media-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.media-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #60a5fa; /* 이미지 모드: 파란색 */
  transition: all 0.3s;
  border-radius: 24px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: all 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.media-switch input:checked + .switch-slider {
  background-color: var(--primary-color); /* 비디오 모드: 초록색 */
}

.media-switch input:checked + .switch-slider:before {
  transform: translateX(20px);
}

.media-switch:hover .switch-slider {
  opacity: 0.9;
}

.media-switch input:not(:checked):hover + .switch-slider {
  background-color: #3b82f6; /* 이미지 모드 호버: 진한 파란색 */
}

.media-switch input:checked:hover + .switch-slider {
  background-color: var(--primary-dark); /* 비디오 모드 호버: 진한 초록색 */
}

/* Old media type switcher styles - kept for fallback */
/* .media-type-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.media-type-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.media-type-btn:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.media-type-btn.active {
  color: white;
  background: var(--primary-color);
}

.separator {
  color: var(--text-tertiary);
  font-size: 0.9rem;
} */

/* Column widths */
.scene-number-col {
  width: 60px;
  text-align: center;
  vertical-align: middle;
}

.scene-number-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.scene-number {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.scene-image-col {
  width: 200px;
  text-align: center;
  padding: 8px;
  vertical-align: middle;
}

.script-col {
  min-width: 280px;
  max-width: 380px;
}

.scene-type-col {
  min-width: 80px;
  max-width: 100px;
  text-align: center;
}

.director-guide-col {
  min-width: 200px;
  max-width: 300px;
}

.assets-col {
  min-width: 180px;
  max-width: 250px;
}

.tts-col {
  width: 150px;
  text-align: center;
}

/* 아이콘 스타일 */
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.icon-wrapper svg {
  width: 20px;
  height: 20px;
}

.icon-data {
  color: #3b82f6;
}

.icon-infographic {
  color: #4ade80;
}

.icon-text {
  font-size: 0.75rem;
  font-weight: 500;
  display: none;
}

@media (min-width: 1024px) {
  .icon-text {
    display: inline;
  }
}

/* 인라인 편집 스타일 */
.editable-cell {
  cursor: text;
  position: relative;
}

.editable-cell:hover {
  background-color: rgba(74, 222, 128, 0.05);
}

.edit-input,
.edit-textarea {
  width: 100%;
  padding: 8px;
  border: 2px solid var(--primary-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: inherit;
  outline: none;
}

.edit-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}

.edit-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.empty-hint {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.85rem;
  cursor: pointer;
}

.clickable-hint {
  color: var(--primary);
  border: 1px dashed var(--primary);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-style: normal;
}

.clickable-hint:hover {
  background-color: var(--primary);
  color: white;
}

/* Tags */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.character-tag {
  background-color: rgba(168, 85, 247, 0.15);
  color: #a855f7;
  font-size: 0.75rem;
  padding: 1px 6px;
}

.reference-keyword-tag {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-size: 0.75rem;
}

.reference-source-tag {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-size: 0.75rem;
  padding: 1px 6px;
}

/* TTS 총 듀레이션 표시 */
.tts-total-duration {
  font-weight: normal;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-left: 4px;
}

/* TTS 컨트롤 스타일 */
.tts-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.tts-generate-btn {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
}

.tts-generate-btn:hover:not(:disabled) {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.tts-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-play-btn {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.tts-play-btn:hover {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.tts-play-btn.playing {
  background-color: #10b981;
  border-color: #10b981;
  color: white;
}

.tts-play-btn.validation-failed {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
  cursor: not-allowed;
  opacity: 0.7;
}

.tts-validation-warning {
  font-size: 11px;
  color: #dc2626;
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  padding: 2px 6px;
  margin-bottom: 4px;
  text-align: center;
}

.tts-duration {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
  padding: 2px 0;
}

.tts-regenerate-btn {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
}

.tts-regenerate-btn:hover:not(:disabled) {
  background-color: #fbbf24;
  border-color: #fbbf24;
  opacity: 1;
}

.tts-regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-regenerate-btn.validation-failed-regenerate {
  background-color: #fef3c7;
  border-color: #fbbf24;
  color: #d97706;
  font-weight: 600;
}

.tts-regenerate-btn.validation-failed-regenerate:hover:not(:disabled) {
  background-color: #fbbf24;
  border-color: #f59e0b;
  color: white;
}

.tts-download-btn {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.tts-download-btn:hover {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.loading-spinner-small {
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 씬 이미지 스타일은 SceneImageUploader 컴포넌트로 이동 */

/* 씬 구분선 행 - 높이 최소화 */
.scene-divider-row {
  height: 5px;
  position: relative;
}

.scene-divider-cell {
  padding: 0 !important;
  height: 5px;
  position: relative;
  border: none !important;
}

/* 씬 추가 버튼 오버레이 */
.add-scene-overlay {
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 5;
}

.add-scene-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.add-scene-overlay-button {
  padding: 6px 20px;
  background: var(--bg-primary);
  border: 1px solid var(--primary-color);
  border-radius: 20px;
  color: var(--primary-color);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.add-scene-overlay-button:hover {
  background: var(--primary-color);
  color: var(--bg-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

/* No data message */
.no-data {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

/* Checkbox styling */
input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .production-table-wrapper {
    padding: 5px 2px;
  }
  
  .production-table-container {
    overflow-x: visible;
    overflow-y: auto;
  }
  
  .production-table {
    font-size: 0.9rem;
    display: block;
    width: 100%;
  }
  
  .production-table thead {
    display: none;
  }
  
  .production-table tbody {
    display: block;
  }
  
  .production-table tr.production-sheet-data-row {
    display: block;
    margin-bottom: 5px; /* 씬 간 아주 미세한 간격 */
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px;
    background: var(--bg-secondary);
  }
  
  .production-table td {
    display: block;
    width: 100%;
    padding: 6px; /* 8px에서 6px로 감소 */
    border: none;
    text-align: left;
  }
  
  /* 모바일 씬 헤더 (체크박스, 씬번호, 스위치 한 줄) */
  .mobile-scene-header {
    padding: 6px !important;
  }
  
  .mobile-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .mobile-header-row .scene-number {
    font-weight: 600;
    color: var(--primary-color);
    font-size: 0.95rem;
    margin-right: auto;
  }
  
  /* 인라인 미디어 스위치 (작은 버전) */
  .mobile-media-switch-inline {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  .media-label-small {
    font-size: 0.75rem;
    color: var(--text-secondary);
    transition: color 0.2s;
  }
  
  .media-label-small.active {
    color: var(--primary-color);
    font-weight: 600;
  }
  
  .media-switch-small {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
  }
  
  .media-switch-small input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .switch-slider-small {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-color);
    transition: 0.3s;
    border-radius: 18px;
  }
  
  .switch-slider-small:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
  
  .media-switch-small input:checked + .switch-slider-small {
    background-color: var(--primary-color);
  }
  
  .media-switch-small input:checked + .switch-slider-small:before {
    transform: translateX(14px);
  }
  
  /* 모바일 미디어 컨테이너 (너비 100%) */
  .mobile-media-container {
    width: 100% !important;
    margin-bottom: 8px;
    padding: 0 !important;
  }
  
  .mobile-media-container .scene-image-wrapper {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  .mobile-media-container .scene-image-uploader {
    width: 100% !important;
    margin: 0 !important;
  }
  
  /* 오리지널 스크립트 섹션 */
  .production-table td.script-col {
    padding: 10px 6px; /* 패딩 감소 */
    background: var(--bg-tertiary);
    border-radius: 6px;
    margin: 6px 0; /* 마진 감소 */
  }
  
  .production-table td.script-col:before {
    content: attr(data-label);
    font-weight: bold;
    display: block;
    margin-bottom: 6px; /* 마진 감소 */
    color: var(--text-secondary);
    font-size: 0.85rem;
  }
  
  /* 연출가이드 섹션 */
  .production-table td.director-guide-col {
    padding: 8px 6px;
  }
  
  .production-table td.director-guide-col:before {
    content: attr(data-label);
    font-weight: bold;
    display: inline-block;
    margin-bottom: 6px;
    margin-right: 8px;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }
  
  /* 에셋 섹션 */
  .production-table td.assets-col {
    padding: 8px 6px;
  }
  
  .production-table td.assets-col:before {
    content: attr(data-label);
    font-weight: bold;
    display: inline-block;
    margin-bottom: 6px;
    margin-right: 8px;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }
  
  .production-table td.assets-col .tag-list {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  /* TTS 컨트롤 섹션 */
  .production-table td.tts-col {
    padding: 10px 6px; /* 패딩 감소 */
    background: var(--bg-tertiary);
    border-radius: 6px;
    margin-top: 6px; /* 마진 감소 */
  }
  
  .production-table td.tts-col .tts-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px; /* 갭 감소 */
  }
  
  /* 씬 구분자 행 - 모바일에서는 숨기기 */
  .scene-divider-row {
    display: none !important;
  }
  
  /* 모바일 씬 추가 플로팅 버튼 */
  .mobile-scene-divider {
    position: relative;
    height: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 10;
    margin-top: -1px;
    margin-bottom: -1px;
  }
  
  .mobile-add-scene-floating-btn {
    position: absolute;
    top: -10px;
    padding: 1px 10px;
    font-size: 0.65rem;
    background: var(--primary-color);
    color: white;
    border: 2px solid var(--bg-primary);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    height: 20px;
    line-height: 16px;
  }
  
  .mobile-add-scene-floating-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  }
  
  /* 선택 액션 바 모바일 스타일 */
  .selection-actions {
    flex-direction: column;
    gap: 12px;
    padding: 10px;
  }
  
  .selection-buttons {
    flex-wrap: wrap;
    justify-content: flex-start;
    width: 100%;
  }
  
  .selection-buttons button {
    flex: 1 1 calc(50% - 4px);
    min-width: 120px;
    font-size: 0.85rem;
    padding: 8px 10px;
  }
  
  .scene-image-col {
    margin-bottom: 15px;
  }
  
  .scene-image-col img,
  .scene-image-col video {
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: contain;
  }
  
  .script-col,
  .director-guide-col,
  .assets-col,
  .tts-col {
    margin-bottom: 10px;
  }
  
  .selection-actions {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  
  .selection-buttons {
    flex-wrap: wrap;
    gap: 5px;
    width: 100%;
  }
  
  .selection-buttons button {
    flex: 1 1 calc(50% - 5px);
    min-width: 100px;
    padding: 8px 10px;
    font-size: 0.85rem;
  }
  
  .production-table th,
  .production-table td {
    padding: 8px;
  }
  
  .script-col {
    min-width: 200px;
  }
  
  .tag {
    font-size: 0.8rem;
    padding: 3px 8px;
  }
}

/* 씬타입 배지 스타일 */
.scene-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.scene-type-graphics {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.scene-type-cg {
  background-color: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.scene-type-archive {
  background-color: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.scene-type-animation {
  background-color: rgba(236, 72, 153, 0.15);
  color: #ec4899;
}

.scene-type-mixed {
  background-color: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

/* 연출가이드 스타일 */
.director-guide-content {
  /* 세로 제한 제거 - 전체 내용 표시 */
}

.guide-text {
  margin: 0;
  line-height: 1.4;
  white-space: pre-wrap;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.edit-textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  background-color: var(--background);
  color: var(--text-primary);
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* 에셋 컨테이너 스타일 */
.assets-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.asset-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.asset-section.editable-hover {
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px dashed rgba(59, 130, 246, 0.3);
}

.asset-section.editing {
  background-color: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.5);
  cursor: default;
}

.asset-type-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 각 에셋 타입별 컬러 */
.characters-section .asset-type-label {
  color: #3b82f6;
}

.backgrounds-section .asset-type-label {
  color: #10b981;
}

.props-section .asset-type-label {
  color: #f59e0b;
}

.keywords-section .asset-type-label {
  color: #8b5cf6;
}

/* 인라인 편집 관련 스타일 */
.edit-input-container {
  width: 100%;
}

.edit-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
  resize: none;
}

.edit-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.empty-placeholder {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
  opacity: 0.6;
}

.edit-hint {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  color: #3b82f6;
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  white-space: nowrap;
  z-index: 10;
}

/* 에셋 필터 헤더 스타일 */
.assets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.asset-filter-dropdown {
  position: relative;
}

.filter-toggle-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-toggle-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--primary-color);
}

.filter-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
  margin-top: 4px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
}

.filter-option input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.filter-option label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-primary);
  margin: 0;
}

.filter-color {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 2px;
}

.characters-color {
  background-color: #3b82f6;
}

.backgrounds-color {
  background-color: #10b981;
}

.props-color {
  background-color: #f59e0b;
}

.reference-color {
  background-color: #8b5cf6;
}

/* 태그 스타일 업데이트 */
.character-tag {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.background-tag {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.prop-tag {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.reference-keyword-tag {
  background-color: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.reference-source-tag {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

/* 편집 힌트 스타일 */
.edit-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
  font-style: italic;
}
</style>