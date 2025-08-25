<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h2><Video :size="20" class="modal-icon" /> AI 비디오 생성</h2>
        <button @click="close" class="btn-close"><X :size="20" /></button>
      </div>

      <div class="modal-body">
        <!-- AI 모델 선택 -->
        <div class="form-group">
          <div class="inline-group model-selection">
            <label class="inline-label">AI 모델</label>
            <select v-model="selectedModel" class="form-select model-select">
              <option value="veo2">🎬 Google Veo 2</option>
              <option value="veo3">🚀 Google Veo 3 Preview</option>
              <option value="veo3-fast">⚡ Google Veo 3 Fast Preview</option>
              <option value="kling2.1">🎥 Kling AI 2.1 Pro</option>
              <option value="hailou02-standard">📹 MiniMax Hailou 02 Standard</option>
              <option value="hailou02-pro">🎞️ MiniMax Hailou 02 Pro</option>
              <option value="seedance">🌟 ByteDance SeedDance v1 Pro</option>
              <option value="seedance-lite">💫 ByteDance SeedDance v1 Lite</option>
            </select>
          </div>
          <p class="model-note">⚠️ 모든 비디오 모델은 참조 이미지가 필수입니다</p>
        </div>

        <!-- 참조 이미지 (필수) -->
        <div class="form-group">
          <div class="inline-group">
            <label class="inline-label">참조 이미지</label>
            <!-- 참조 이미지 소스 선택 탭 -->
            <div class="reference-tabs">
              <button 
                @click="referenceTab = 'storyboard'"
                :class="{ active: referenceTab === 'storyboard' }"
                class="tab-btn"
              >
                <Layers :size="16" /> 스토리보드
              </button>
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
                <BookOpen :size="16" /> 라이브러리
              </button>
              <button 
                @click="referenceTab = 'url'"
                :class="{ active: referenceTab === 'url' }"
                class="tab-btn"
              >
                🔗 URL
              </button>
            </div>
          </div>

          <!-- 씨댄스 라이트 모델 안내 -->
          <div v-if="selectedModel === 'seedance-lite' && referenceTab !== 'storyboard'" class="seedance-info">
            <p class="seedance-hint">
              <span class="icon">ℹ️</span>
              SeedDance Lite는 <strong>첫 프레임</strong>과 <strong>끝 이미지</strong>를 참조합니다.
              <br>
              <span v-if="referenceImages.length === 0" class="warning">
                ⚠️ 최소 1개의 이미지를 선택해주세요.
              </span>
              <span v-else-if="referenceImages.length === 1" class="info">
                🎬 첫 이미지만 사용됩니다.
              </span>
              <span v-else class="info">
                🎬 첫 이미지와 마지막 이미지를 사용합니다.
              </span>
            </p>
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
                <div class="reference-actions">
                  <button 
                    @click="openDrawCanvas(item, index)"
                    class="btn-edit-image"
                    title="그리기 편집"
                    :disabled="item.uploading"
                  >
                    ✏️
                  </button>
                  <button 
                    @click="removeReferenceImage(index)" 
                    class="btn-remove-image"
                    title="제거"
                  >
                    ✕
                  </button>
                </div>
                <div v-if="item.hasAnnotations" class="annotation-badge" title="주석 추가됨">
                  🎨
                </div>
                <!-- 씨댄스 라이트 모델일 때 첫/마짉 이미지 표시 -->
                <div v-if="selectedModel === 'seedance-lite' && referenceImages.length > 1" class="image-position-badge">
                  <span v-if="index === 0" class="badge-first">첫 프레임</span>
                  <span v-else-if="index === referenceImages.length - 1" class="badge-last">끝 이미지</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 업로드 탭 -->
          <div v-if="referenceTab === 'upload'" class="reference-content">
            <!-- 이미 선택된 이미지가 있으면 표시 -->
            <div v-if="referenceImages.length > 0" class="upload-info">
              <p class="upload-status">✅ 이미지가 선택되었습니다 ({{ referenceImages.length }}개)</p>
              <p class="upload-hint">아래에서 선택된 이미지를 확인하고 편집할 수 있습니다.</p>
            </div>
            <!-- 추가 업로드 영역 -->
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
                <span class="drop-icon-small">📁</span>
                <span>{{ referenceImages.length > 0 ? '추가 이미지 업로드' : '클릭 또는 드래그하여 업로드' }}</span>
              </div>
            </div>
          </div>

          <!-- 라이브러리 탭 -->
          <div v-if="referenceTab === 'library'" class="reference-content">
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
                  :src="image.storage_image_url || image.result_image_url" 
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

          <!-- 스토리보드 탭 -->
          <div v-if="referenceTab === 'storyboard'" class="reference-content">
            <div v-if="loadingStoryboard" class="library-loading">
              <div class="spinner"></div>
              <p>스토리보드 이미지를 불러오는 중...</p>
            </div>
            <div v-else-if="storyboardImages.length === 0" class="library-empty">
              <p>스토리보드에 이미지가 없습니다.</p>
              <p class="hint">먼저 스토리보드에서 씬 이미지를 생성해주세요.</p>
            </div>
            <div v-else class="library-grid">
              <div 
                v-for="scene in storyboardImages" 
                :key="scene.id"
                @click="selectStoryboardImage(scene)"
                class="library-item"
                :class="{ selected: isStoryboardImageSelected(scene.id) }"
              >
                <img :src="scene.scene_image_url" :alt="`씬 ${scene.scene_number}`" />
                <div class="library-item-info">
                  <span class="scene-number">씬 {{ scene.scene_number }}</span>
                  <span class="scene-text">{{ scene.original_script_text?.substring(0, 50) }}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 프롬프트 입력 -->
        <div class="form-group">
          <div class="label-with-toggle">
            <label>프롬프트</label>
            <div class="label-actions">
              <button 
                @click="showPresetModal = true" 
                class="btn-preset-manage"
                title="프리셋 관리"
              >
                <Settings :size="16" /> 프리셋
              </button>
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
          </div>
          <textarea
            v-model="prompt"
            @blur="handlePromptBlur"
            placeholder="생성할 비디오를 설명해주세요..."
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
          
          <!-- 프리셋 선택 -->
          <div v-if="availablePresets.length > 0" class="preset-selection">
            <label class="preset-label">프리셋 적용:</label>
            <div class="preset-chips">
              <button
                v-for="preset in availablePresets"
                :key="preset.id"
                @click="togglePreset(preset)"
                :class="{ active: selectedPresets.includes(preset.id) }"
                class="preset-chip"
                :title="preset.prompt"
              >
                {{ preset.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- 네거티브 프롬프트 입력 (Google Veo 모델만) -->
        <div v-if="selectedModel.startsWith('veo')" class="form-group">
          <label>네거티브 프롬프트 (선택사항)</label>
          <textarea
            v-model="negativePrompt"
            @blur="handlePromptBlur"
            placeholder="비디오에 포함되지 않았으면 하는 요소들..."
            rows="2"
            class="form-textarea"
          ></textarea>
          <div v-if="translatedNegativePrompt && enableTranslation && negativePrompt && !isTranslating" class="translated-preview">
            <span class="preview-label">번역된 네거티브:</span>
            <span class="preview-text">{{ translatedNegativePrompt }}</span>
          </div>
        </div>

        <!-- 모델별 파라미터 -->
        <div class="model-parameters">
          <!-- Veo 2 파라미터 -->
          <div v-if="selectedModel === 'veo2'" class="parameter-group">
            <h4>Google Veo 2 설정</h4>
            <div class="form-group inline-group">
              <label class="inline-label">화면 비율</label>
              <select v-model="veo2Params.aspectRatio" class="form-select">
                <option value="16:9">16:9 (가로)</option>
                <option value="9:16">9:16 (세로)</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">사람 생성</label>
              <select v-model="veo2Params.personGeneration" class="form-select">
                <option value="allow_adult">성인만 허용</option>
                <option value="dont_allow">사람 제외</option>
              </select>
            </div>
          </div>

          <!-- Veo 3 Preview 파라미터 -->
          <div v-else-if="selectedModel === 'veo3'" class="parameter-group">
            <h4>Google Veo 3 Preview 설정</h4>
            <div class="form-group inline-group">
              <label class="inline-label">화면 비율</label>
              <select v-model="veo3Params.aspectRatio" class="form-select">
                <option value="16:9">16:9 (가로)</option>
                <option value="9:16">9:16 (세로)</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">사람 생성</label>
              <select v-model="veo3Params.personGeneration" class="form-select">
                <option value="allow_adult">성인만 허용</option>
                <option value="dont_allow">사람 제외</option>
              </select>
            </div>
          </div>

          <!-- Veo 3 Fast Preview 파라미터 -->
          <div v-else-if="selectedModel === 'veo3-fast'" class="parameter-group">
            <h4>Google Veo 3 Fast Preview 설정</h4>
            <div class="form-group inline-group">
              <label class="inline-label">화면 비율</label>
              <select v-model="veo3FastParams.aspectRatio" class="form-select">
                <option value="16:9">16:9 (가로)</option>
                <option value="9:16">9:16 (세로)</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">사람 생성</label>
              <select v-model="veo3FastParams.personGeneration" class="form-select">
                <option value="allow_adult">성인만 허용</option>
                <option value="dont_allow">사람 제왔</option>
              </select>
            </div>
          </div>

          <!-- Kling 2.1 파라미터 -->
          <div v-else-if="selectedModel === 'kling2.1'" class="parameter-group">
            <h4>Kling AI 2.1 설정</h4>
            <div class="form-group inline-group">
              <label class="inline-label">비디오 길이</label>
              <select v-model="klingParams.duration" class="form-select">
                <option :value="5">5초</option>
                <option :value="10">10초</option>
              </select>
            </div>
            <div class="form-group">
              <label>네거티브 프롬프트</label>
              <input
                v-model="klingParams.negative_prompt"
                type="text"
                placeholder="제외할 요소들..."
                class="form-input"
              />
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">CFG Scale</label>
              <input
                v-model.number="klingParams.cfg_scale"
                type="number"
                min="0"
                max="1"
                step="0.1"
                class="form-input"
                style="max-width: 100px"
              />
              <span class="hint" style="margin-left: 10px">프롬프트 준수도 (0-1)</span>
            </div>
          </div>

          <!-- Hailou 02 Standard 파라미터 -->
          <div v-else-if="selectedModel === 'hailou02-standard'" class="parameter-group">
            <h4>Hailou 02 Standard 설정</h4>
            <div class="form-group inline-group">
              <label class="inline-label">비디오 길이</label>
              <select v-model="hailouStandardParams.duration" class="form-select">
                <option value="6">6초</option>
                <option value="10">10초</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">해상도</label>
              <select v-model="hailouStandardParams.resolution" class="form-select">
                <option value="512P">512P</option>
                <option value="768P">768P (기본)</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">프롬프트 최적화</label>
              <select v-model="hailouStandardParams.prompt_optimizer" class="form-select">
                <option :value="true">사용</option>
                <option :value="false">사용 안함</option>
              </select>
            </div>
          </div>

          <!-- Hailou 02 Pro 파라미터 -->
          <div v-else-if="selectedModel === 'hailou02-pro'" class="parameter-group">
            <h4>Hailou 02 Pro 설정</h4>
            <div class="form-group inline-group">
              <label class="inline-label">프롬프트 최적화</label>
              <select v-model="hailouProParams.prompt_optimizer" class="form-select">
                <option :value="true">사용 (권장)</option>
                <option :value="false">사용 안함</option>
              </select>
            </div>
            <p class="hint">Pro 버전은 자동으로 최고 품질로 생성됩니다</p>
          </div>

          <!-- SeedDance Pro 파라미터 -->
          <div v-else-if="selectedModel === 'seedance'" class="parameter-group">
            <h4>ByteDance SeedDance v1 Pro 설정</h4>
            <div class="form-group inline-group">
              <label class="inline-label">해상도</label>
              <select v-model="seedanceParams.resolution" class="form-select">
                <option value="480p">480p (빠른 생성)</option>
                <option value="720p">720p (균형)</option>
                <option value="1080p">1080p (고화질)</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">비디오 길이</label>
              <select v-model="seedanceParams.duration" class="form-select">
                <option :value="3">3초</option>
                <option :value="5">5초 (기본)</option>
                <option :value="7">7초</option>
                <option :value="10">10초</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">카메라 움직임</label>
              <select v-model="seedanceParams.cameraFixed" class="form-select">
                <option :value="false">동적 카메라 (기본)</option>
                <option :value="true">고정 카메라</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">시드 (선택사항)</label>
              <input 
                v-model.number="seedanceParams.seed" 
                type="number" 
                placeholder="재현 가능한 결과를 위한 시드값"
                class="form-input"
                min="0"
                max="2147483647"
              />
            </div>
            <p class="hint">💡 시작 이미지를 기반으로 자연스러운 비디오를 생성합니다</p>
          </div>

          <!-- SeedDance Lite 파라미터 -->
          <div v-else-if="selectedModel === 'seedance-lite'" class="parameter-group">
            <h4>ByteDance SeedDance v1 Lite 설정</h4>
            <div class="form-group inline-group">
              <label class="inline-label">해상도</label>
              <select v-model="seedanceLiteParams.resolution" class="form-select">
                <option value="480p">480p</option>
                <option value="720p">720p (기본)</option>
                <option value="1080p" v-if="referenceImages.length < 2">1080p (단일 이미지만)</option>
              </select>
              <p v-if="referenceImages.length >= 2" class="hint" style="margin-top: 4px; font-size: 0.85rem; color: #f59e0b;">
                ⚠️ 끝 이미지 사용 시 1080p는 지원되지 않습니다.
              </p>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">비디오 길이</label>
              <select v-model="seedanceLiteParams.duration" class="form-select">
                <option :value="3">3초</option>
                <option :value="4">4초</option>
                <option :value="5">5초 (기본)</option>
                <option :value="6">6초</option>
                <option :value="7">7초</option>
                <option :value="8">8초</option>
                <option :value="9">9초</option>
                <option :value="10">10초</option>
                <option :value="11">11초</option>
                <option :value="12">12초</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">카메라 움직임</label>
              <select v-model="seedanceLiteParams.cameraFixed" class="form-select">
                <option :value="false">동적 카메라 (기본)</option>
                <option :value="true">고정 카메라</option>
              </select>
            </div>
            <div class="form-group inline-group">
              <label class="inline-label">시드 (선택사항)</label>
              <input 
                v-model.number="seedanceLiteParams.seed" 
                type="number" 
                placeholder="재현 가능한 결과를 위한 시드값"
                class="form-input"
                min="0"
                max="2147483647"
              />
            </div>
            <p class="hint">💫 Lite 버전은 빠른 생성과 낮은 비용이 장점입니다</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-secondary">취소</button>
        <button 
          @click="generateVideo" 
          class="btn-primary"
          :disabled="!prompt || generating || referenceImages.length === 0"
        >
          {{ generating ? '생성 중...' : '비디오 생성' }}
        </button>
      </div>
    </div>
  </div>
  
  <!-- 프리셋 관리 모달 -->
  <PresetManageModal
    v-if="showPresetModal"
    :show="showPresetModal"
    :project-id="props.projectId"
    media-type="video"
    @close="showPresetModal = false"
    @saved="onPresetsSaved"
  />
  
  <!-- DrawCanvas 모달 -->
  <div v-if="showDrawCanvas" class="draw-canvas-modal">
    <DrawCanvas
      v-if="currentEditImage"
      :imageUrl="currentEditImage.url || currentEditImage.preview"
      @save="handleDrawCanvasSave"
      @close="closeDrawCanvas"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { supabase } from '@/utils/supabase'
import { Video, X, Layers, Upload, BookOpen, ImagePlus, Settings, Edit2, Brush } from 'lucide-vue-next'
import PresetManageModal from './PresetManageModal.vue'
import DrawCanvas from './DrawCanvas.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  initialPrompt: {
    type: String,
    default: ''
  },
  initialImage: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'generated'])

// Auth store
const authStore = useAuthStore()

// 상태 관리
const prompt = ref('')
const negativePrompt = ref('')  // 네거티브 프롬프트 추가
const selectedModel = ref('veo2')  // Google Veo2가 기본 모델
const generating = ref(false)

// 참조 이미지 관련
// 초기 이미지가 있으면 upload 탭으로, 없으면 storyboard 탭으로 시작
const referenceTab = ref(props.initialImage ? 'upload' : 'storyboard')
const referenceImages = ref([])
const isDragging = ref(false)
const libraryImages = ref([])
const loadingLibrary = ref(false)
const urlInput = ref('')
const storyboardImages = ref([])
const loadingStoryboard = ref(false)

// DrawCanvas 관련 상태
const showDrawCanvas = ref(false)
const currentEditImage = ref(null)
const currentEditIndex = ref(-1)

// 번역 관련 상태
const enableTranslation = ref(true) // 기본값 on
const translatedPrompt = ref('')
const translatedNegativePrompt = ref('')
const isTranslating = ref(false)
// translationTimer 제거 - blur 이벤트 사용

// 프리셋 관련 상태
const showPresetModal = ref(false)
const availablePresets = ref([])
const selectedPresets = ref([])

// 모델별 파라미터
const veo2Params = ref({
  aspectRatio: '16:9',
  personGeneration: 'allow_adult',  // image-to-video는 allow_adult 또는 dont_allow만 가능
  negativePrompt: ''
})

const veo3Params = ref({
  aspectRatio: '16:9',
  personGeneration: 'allow_adult',
  negativePrompt: ''
})

const veo3FastParams = ref({
  aspectRatio: '16:9',
  personGeneration: 'allow_adult',
  negativePrompt: ''
})

const klingParams = ref({
  duration: 5,
  negative_prompt: 'blur, distort, and low quality',
  cfg_scale: 0.5
})

const hailouStandardParams = ref({
  duration: 6,
  resolution: '768P',
  prompt_optimizer: true
})

const hailouProParams = ref({
  prompt_optimizer: true
})

const seedanceParams = ref({
  resolution: '1080p',
  duration: 5,
  cameraFixed: false,
  seed: null
})

const seedanceLiteParams = ref({
  resolution: '720p',  // 480p, 720p, 1080p
  duration: 5,  // 3-12 seconds, default 5
  cameraFixed: false,
  seed: null
})

// 마지막 사용 설정 불러오기
const loadLastUsedSettings = async () => {
  if (!props.projectId) return
  
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('last_video_model')
      .eq('id', props.projectId)
      .single()
    
    if (error) throw error
    
    if (data && data.last_video_model) {
      selectedModel.value = data.last_video_model
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
        last_video_model: selectedModel.value
      })
      .eq('id', props.projectId)
    
    if (error) throw error
  } catch (error) {
    console.error('설정 저장 오류:', error)
  }
}

// 초기화
onMounted(async () => {
  if (props.initialPrompt) {
    prompt.value = props.initialPrompt
  }
  
  // 초기 이미지가 있으면 설정
  if (props.initialImage && props.show) {
    referenceImages.value = [{
      url: props.initialImage,
      preview: props.initialImage,
      thumbnail: props.initialImage,
      name: 'Selected Image from Gallery'
    }]
    referenceTab.value = 'upload'
  }
  
  await loadLibraryImages()
  await loadStoryboardImages()
  await loadPresets()
  await loadLastUsedSettings()
})

// 스토리보드 이미지 로드 - watch에서 사용되므로 먼저 정의
const loadStoryboardImages = async () => {
  if (!props.projectId) return
  
  loadingStoryboard.value = true
  
  try {
    const { data, error } = await supabase
      .from('production_sheets')
      .select('id, scene_number, scene_image_url, original_script_text')
      .eq('project_id', props.projectId)
      .not('scene_image_url', 'is', null)
      .order('scene_number', { ascending: true })
    
    if (error) throw error
    
    storyboardImages.value = data || []
  } catch (error) {
    console.error('스토리보드 이미지 로드 실패:', error)
    storyboardImages.value = []
  } finally {
    loadingStoryboard.value = false
  }
}

// watch props 변경 - show와 initialImage를 모두 감시
watch(
  () => ({ show: props.show, image: props.initialImage, prompt: props.initialPrompt }),
  (newVal, oldVal) => {
    if (newVal.show) {
      // 모달이 열릴 때마다 초기화 및 설정
      
      // 초기 이미지가 전달되면 참조 이미지에 추가
      if (newVal.image) {
        // 참조 이미지 배열 초기화 후 새 이미지 추가
        const newImage = {
          url: newVal.image,
          preview: newVal.image,
          thumbnail: newVal.image,
          name: 'Selected Image from Gallery'
        }
        referenceImages.value = [newImage]
        // 업로드 탭으로 전환
        referenceTab.value = 'upload'
      } else {
        // 초기 이미지가 없으면 참조 이미지 초기화
        referenceImages.value = []
        // 기본 탭으로 전환
        referenceTab.value = 'storyboard'
        // 스토리보드 이미지 로드
        loadStoryboardImages()
      }
      
      // 초기 프롬프트 설정
      if (newVal.prompt) {
        prompt.value = newVal.prompt
      }
    } else if (!newVal.show && oldVal?.show) {
      // 모달이 닫힐 때 초기화
      referenceImages.value = []
      prompt.value = ''
      referenceTab.value = 'storyboard'
    }
  },
  { immediate: true }
)

// 씨댄스 라이트에서 참조 이미지가 2개 이상일 때 1080p를 720p로 변경
watch(
  () => referenceImages.value.length,
  (newLength) => {
    if (selectedModel.value === 'seedance-lite' && newLength >= 2) {
      if (seedanceLiteParams.value.resolution === '1080p') {
        seedanceLiteParams.value.resolution = '720p'
        console.log('씨댄스 라이트: 끝 이미지 사용으로 해상도를 720p로 변경')
      }
    }
  }
)

// 메서드들
const close = () => {
  emit('close')
}

// 참조 이미지 관련 메서드
const handleDrop = (e) => {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files)
  handleFiles(files) // handleFiles 함수에서 이미 파일명 변경 처리
}

const handleDragOver = () => {
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  handleFiles(files)
}

const handleFiles = async (files) => {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      // SeedDance Lite는 최대 2개 이미지만 허용
      if (selectedModel.value === 'seedance-lite' && referenceImages.value.length >= 2) {
        console.log('SeedDance Lite는 최대 2개 이미지만 지원합니다')
        break
      }
      
      // 파일명을 영문과 숫자로 변경
      const sanitizedFile = await sanitizeFileName(file)
      
      const preview = URL.createObjectURL(sanitizedFile)
      const item = { 
        file: sanitizedFile, 
        preview, 
        uploading: true,
        originalName: file.name,
        sanitizedName: sanitizedFile.name
      }
      
      // SeedDance Lite는 2개까지, 다른 모델은 1개만
      if (selectedModel.value === 'seedance-lite') {
        if (referenceImages.value.length < 2) {
          referenceImages.value.push(item)
        }
      } else {
        // 다른 모델은 이전 이미지 교체
        referenceImages.value = [item]
      }
      
      // 실제 업로드는 생성 시점에 수행
      item.uploading = false
    }
  }
}

// 파일명을 영문과 숫자로 변경하는 함수
const sanitizeFileName = async (file) => {
  // 파일 확장자 추출
  const lastDotIndex = file.name.lastIndexOf('.')
  const extension = lastDotIndex > -1 ? file.name.slice(lastDotIndex) : ''
  
  // 타임스탬프와 랜덤 문자열로 파일명 생성
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const sanitizedName = `ref_${timestamp}_${randomStr}${extension}`
  
  // 새로운 File 객체 생성
  const sanitizedFile = new File([file], sanitizedName, {
    type: file.type,
    lastModified: file.lastModified
  })
  
  console.log(`파일명 변경: ${file.name} → ${sanitizedName}`)
  
  return sanitizedFile
}

const removeReferenceImage = (index) => {
  referenceImages.value.splice(index, 1)
}

// DrawCanvas 관련 메서드
const openDrawCanvas = (image, index) => {
  currentEditImage.value = image
  currentEditIndex.value = index
  showDrawCanvas.value = true
}

const closeDrawCanvas = () => {
  showDrawCanvas.value = false
  currentEditImage.value = null
  currentEditIndex.value = -1
}

const handleDrawCanvasSave = (data) => {
  // 편집된 이미지로 교체
  if (currentEditIndex.value >= 0) {
    referenceImages.value[currentEditIndex.value] = {
      ...referenceImages.value[currentEditIndex.value],
      file: data.file,
      url: data.url,
      preview: data.url,
      hasAnnotations: true,
      annotations: data.annotations
    }
  }
  closeDrawCanvas()
}

const loadLibraryImages = async () => {
  loadingLibrary.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    libraryImages.value = data || []
  } catch (error) {
    console.error('라이브러리 이미지 로드 실패:', error)
    libraryImages.value = []
  } finally {
    loadingLibrary.value = false
  }
}

const isImageSelected = (image) => {
  return referenceImages.value.some(ref => ref.id === image.id)
}

const toggleLibraryImage = (image) => {
  const index = referenceImages.value.findIndex(ref => ref.id === image.id)
  if (index >= 0) {
    referenceImages.value.splice(index, 1)
  } else {
    // SeedDance Lite는 2개 이미지 허용, 다른 모델은 1개만
    if (selectedModel.value === 'seedance-lite') {
      if (referenceImages.value.length < 2) {
        referenceImages.value.push({
          id: image.id,
          url: image.storage_image_url || image.result_image_url,
          preview: image.storage_image_url || image.result_image_url
        })
      } else {
        // 2개가 이미 선택된 경우, 마지막 이미지를 교체
        referenceImages.value[1] = {
          id: image.id,
          url: image.storage_image_url || image.result_image_url,
          preview: image.storage_image_url || image.result_image_url
        }
      }
    } else {
      // 일반 비디오는 1개의 참조 이미지만 허용
      referenceImages.value = [{
        id: image.id,
        url: image.storage_image_url || image.result_image_url,
        preview: image.storage_image_url || image.result_image_url
      }]
    }
  }
}

const addImageFromUrl = () => {
  if (urlInput.value) {
    // SeedDance Lite는 2개 이미지 허용, 다른 모델은 1개만
    if (selectedModel.value === 'seedance-lite') {
      if (referenceImages.value.length < 2) {
        referenceImages.value.push({
          url: urlInput.value,
          preview: urlInput.value
        })
      } else {
        // 2개가 이미 선택된 경우, 마지막 이미지를 교체
        referenceImages.value[1] = {
          url: urlInput.value,
          preview: urlInput.value
        }
      }
    } else {
      // 일반 비디오는 1개의 참조 이미지만 허용
      referenceImages.value = [{
        url: urlInput.value,
        preview: urlInput.value
      }]
    }
    urlInput.value = ''
  }
}

// 프리셋 관련 메서드
const loadPresets = async () => {
  if (!props.projectId) return
  
  try {
    const { data, error } = await supabase
      .from('prompt_presets')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('is_active', true)
      .in('media_type', ['video', 'both'])
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    
    if (error) throw error
    availablePresets.value = data || []
  } catch (error) {
    console.error('프리셋 로드 실패:', error)
    availablePresets.value = []
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

const getPresetsPrompt = () => {
  return availablePresets.value
    .filter(preset => selectedPresets.value.includes(preset.id))
    .map(preset => preset.prompt)
    .join(', ')
}

const getFinalPrompt = () => {
  let finalPrompt = enableTranslation.value && translatedPrompt.value ? translatedPrompt.value : prompt.value
  
  // 주석이 있는 이미지인 경우 지시사항 추가
  const firstRef = referenceImages.value[0]
  if (firstRef?.hasAnnotations && firstRef?.annotations) {
    finalPrompt = `${firstRef.annotations.instruction}${finalPrompt}`
  }
  
  // 프리셋이 있으면 프롬프트에 추가
  const presetPrompt = getPresetsPrompt()
  if (presetPrompt) {
    finalPrompt = `${finalPrompt}, ${presetPrompt}`
  }
  
  return finalPrompt
}

const onPresetsSaved = () => {
  loadPresets()
}

// loadStoryboardImages 함수는 이미 위에 정의됨

// 스토리보드 이미지 선택 여부 확인
const isStoryboardImageSelected = (sceneId) => {
  return referenceImages.value.some(ref => ref.sceneId === sceneId)
}

// 스토리보드 이미지 선택/해제
const selectStoryboardImage = (scene) => {
  const index = referenceImages.value.findIndex(ref => ref.sceneId === scene.id)
  if (index >= 0) {
    referenceImages.value.splice(index, 1)
  } else {
    // SeedDance Lite는 2개 이미지 허용, 다른 모델은 1개만
    if (selectedModel.value === 'seedance-lite') {
      if (referenceImages.value.length < 2) {
        referenceImages.value.push({
          sceneId: scene.id,
          url: scene.scene_image_url,
          preview: scene.scene_image_url,
          sceneNumber: scene.scene_number
        })
      } else {
        // 2개가 이미 선택된 경우, 마지막 이미지를 교체
        referenceImages.value[1] = {
          sceneId: scene.id,
          url: scene.scene_image_url,
          preview: scene.scene_image_url,
          sceneNumber: scene.scene_number
        }
      }
    } else {
      // 일반 비디오는 1개의 참조 이미지만 허용
      referenceImages.value = [{
        sceneId: scene.id,
        url: scene.scene_image_url,
        preview: scene.scene_image_url,
        sceneNumber: scene.scene_number
      }]
    }
    // 프롬프트가 비어있으면 씬 텍스트를 기본 프롬프트로 설정
    if (!prompt.value && scene.original_script_text) {
      prompt.value = scene.original_script_text
    }
  }
}

// 번역 함수
const translatePrompts = async () => {
  if (!enableTranslation.value || !prompt.value) {
    translatedPrompt.value = ''
    translatedNegativePrompt.value = ''
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
        negativePrompt: negativePrompt.value || null
      })
    })

    if (!response.ok) {
      throw new Error('번역 실패')
    }

    const result = await response.json()
    
    if (result.success) {
      translatedPrompt.value = result.data.translatedPrompt
      translatedNegativePrompt.value = result.data.translatedNegativePrompt || ''
    }
  } catch (error) {
    console.error('번역 오류:', error)
    // 번역 실패 시 원본 사용
    translatedPrompt.value = prompt.value
    translatedNegativePrompt.value = negativePrompt.value
  } finally {
    isTranslating.value = false
  }
}

// 프롬프트 입력 완료 시 번역
const handlePromptBlur = () => {
  if (!enableTranslation.value) return
  if (!prompt.value && !negativePrompt.value) return
  translatePrompts()
}

// 번역 토글 핸들러
const handleTranslationToggle = () => {
  if (enableTranslation.value) {
    translatePrompts()
  } else {
    translatedPrompt.value = ''
    translatedNegativePrompt.value = ''
  }
}

// 컴포넌트 마운트 시 초기 번역
watch(() => props.show, (newVal) => {
  if (newVal) {
    // 초기 프롬프트가 전달되면 설정
    if (props.initialPrompt) {
      console.log('Initial prompt received:', props.initialPrompt)
      prompt.value = props.initialPrompt
    }
    
    if (enableTranslation.value && prompt.value) {
      translatePrompts()
    }
  } else {
    // 모달이 닫힐 때 프롬프트 초기화 (초기값이 있었던 경우)
    if (props.initialPrompt) {
      prompt.value = ''
    }
  }
})

// 비디오 생성
const generateVideo = async () => {
  if (!prompt.value || referenceImages.value.length === 0) {
    alert('프롬프트와 참조 이미지는 필수입니다.')
    return
  }

  generating.value = true

  try {
    // 번역이 활성화되어 있으면 먼저 번역 수행
    if (enableTranslation.value && !translatedPrompt.value) {
      await translatePrompts()
    }
    // 참조 이미지 업로드 (필요한 경우)
    let referenceImageUrl = null
    let endImageUrl = null // 씨댄스 라이트용 마지막 이미지
    const firstRef = referenceImages.value[0]
    const lastRef = referenceImages.value[referenceImages.value.length - 1]
    
    // 첫 번째 이미지 처리
    if (firstRef.file) {
      // 파일 업로드 - RLS 정책에 맞춰 userId를 첫 번째 폴더로 사용
      const userId = authStore.user?.id
      if (!userId) {
        throw new Error('사용자 인증이 필요합니다.')
      }
      
      // 이미 sanitizeFileName에서 변경된 파일명 사용
      const fileName = firstRef.file.name
      const filePath = `${userId}/${props.projectId}/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('ref-images')
        .upload(filePath, firstRef.file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('ref-images')
        .getPublicUrl(filePath)
      
      referenceImageUrl = publicUrl
    } else {
      referenceImageUrl = firstRef.url
    }
    
    // 씨댄스 라이트 모델이고 이미지가 2개 이상일 때 마지막 이미지 처리
    if (selectedModel.value === 'seedance-lite' && referenceImages.value.length > 1) {
      if (lastRef.file) {
        const userId = authStore.user?.id
        const fileName = lastRef.file.name
        const filePath = `${userId}/${props.projectId}/end_${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('ref-images')
          .upload(filePath, lastRef.file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('ref-images')
          .getPublicUrl(filePath)
        
        endImageUrl = publicUrl
      } else {
        endImageUrl = lastRef.url
      }
    }

    // 모델별 파라미터 준비
    let modelParams = {}
    let negativePromptToSend = ''
    
    if (selectedModel.value === 'veo2') {
      modelParams = { ...veo2Params.value }
      negativePromptToSend = negativePrompt.value || veo2Params.value.negativePrompt
    } else if (selectedModel.value === 'veo3') {
      modelParams = { ...veo3Params.value }
      negativePromptToSend = negativePrompt.value || veo3Params.value.negativePrompt
    } else if (selectedModel.value === 'veo3-fast') {
      modelParams = { ...veo3FastParams.value }
      negativePromptToSend = negativePrompt.value || veo3FastParams.value.negativePrompt
    } else if (selectedModel.value === 'kling2.1') {
      modelParams = { ...klingParams.value }
    } else if (selectedModel.value === 'hailou02-standard') {
      modelParams = { ...hailouStandardParams.value }
    } else if (selectedModel.value === 'hailou02-pro') {
      modelParams = { ...hailouProParams.value }
    } else if (selectedModel.value === 'seedance') {
      modelParams = { ...seedanceParams.value }
    } else if (selectedModel.value === 'seedance-lite') {
      modelParams = { ...seedanceLiteParams.value }
    }

    // 세션 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('로그인이 필요합니다.')
    }

    // API 호출
    const response = await fetch('/.netlify/functions/generateVideoAsync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        prompt: getFinalPrompt(),
        negativePrompt: enableTranslation.value && translatedNegativePrompt.value ? translatedNegativePrompt.value : negativePromptToSend,
        model: selectedModel.value,
        projectId: props.projectId,
        referenceImageUrl,
        endImageUrl,  // 씨댄스 라이트용 마지막 이미지 추가
        modelParams,
        parameters: modelParams,  // parameters로도 전달 (백엔드 호환성)
        usedPrompt: prompt.value,  // 원본 프롬프트 저장
        usedNegativePrompt: negativePrompt.value || null  // 원본 네거티브 프롬프트 저장
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '비디오 생성 실패')
    }

    // 프로젝트의 마지막 사용 설정 저장
    await saveLastUsedSettings()

    emit('generated', result)
    close()
  } catch (error) {
    console.error('비디오 생성 오류:', error)
    alert(error.message || '비디오 생성 중 오류가 발생했습니다.')
  } finally {
    generating.value = false
  }
}
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
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
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
  gap: 12px;
}

.inline-label {
  min-width: 100px;
  margin-bottom: 0 !important;
  font-weight: 500;
  color: var(--text-primary);
  flex-shrink: 0;
  font-size: 0.9rem;
}

.inline-item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.form-textarea,
.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.3s;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath fill='%236b7280' d='M10 12l-5-5h10l-5 5z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 20px;
  padding-right: 40px;
}

.form-select:hover {
  border-color: var(--primary-color);
  background-color: var(--bg-tertiary);
}

.form-select option {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 8px;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  background: var(--bg-tertiary);
}

.model-note {
  font-size: 0.85rem;
  color: var(--warning-color);
  margin: 8px 0 15px 0;
  padding: 8px 12px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 6px;
  border-left: 3px solid var(--warning-color);
}

/* 모델 선택 스타일 */
.model-selection {
  margin-bottom: 10px;
}

.model-select {
  font-weight: 500;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  transition: all 0.3s;
}

.model-select:hover {
  border-color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.model-select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
}

/* 모델 파라미터 */
.model-parameters {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
}

.parameter-group h4 {
  margin: 0 0 15px 0;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
}

.parameter-group .hint {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border-left: 3px solid var(--primary-color);
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
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
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

.reference-images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.reference-image-item {
  position: relative;
}

.image-preview-wrapper {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.btn-remove-image {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-remove-image:hover {
  background: var(--danger-color);
}

.reference-content {
  margin-top: 10px;
  min-height: 80px;
}

/* 업로드 정보 표시 */
.upload-info {
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  margin-bottom: 12px;
}

.upload-status {
  color: var(--success-color, #4ade80);
  font-weight: 600;
  margin: 0 0 4px 0;
}

.upload-hint {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

/* 컴팩트 드래그 영역 */
.drop-zone-compact {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 20px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
}

.drop-zone-compact:hover,
.drop-zone-compact.drag-over {
  border-color: var(--primary-color);
  background: var(--bg-tertiary);
}

.drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.drop-icon-small {
  font-size: 1.5rem;
}

/* 라이브러리 그리드 */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.library-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.library-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.library-item:hover {
  border-color: var(--primary-color);
  transform: scale(1.05);
}

.library-item.selected {
  border-color: var(--primary-color);
}

.library-item-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scene-number {
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
}

.scene-text {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-item-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(74, 222, 128, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.library-item.selected .library-item-overlay {
  opacity: 1;
}

.check-icon {
  font-size: 1.5rem;
  color: white;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.library-loading,
.library-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.hint {
  font-size: 0.85rem;
  margin-top: 8px;
  opacity: 0.7;
}

/* URL 입력 */
.url-input-section {
  display: flex;
  gap: 8px;
}

.btn-add-url {
  padding: 10px 20px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
  flex-shrink: 0;
}

.btn-add-url:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

/* 로딩 스피너 */
.spinner,
.spinner-small {
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto;
}

.spinner-small {
  width: 20px;
  height: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* 모달 푸터 */
.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
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
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
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

.label-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

/* 프리셋 관련 스타일 */
.btn-preset-manage {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-preset-manage:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--primary-color);
}

.preset-selection {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.preset-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-chip {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.preset-chip:hover {
  background: var(--bg-primary);
  border-color: var(--primary-color);
  color: var(--text-primary);
}

.preset-chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

/* 씨댄스 라이트 안내 메시지 */
.seedance-info {
  margin: 12px 0;
  padding: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

.seedance-hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.seedance-hint .icon {
  margin-right: 6px;
}

.seedance-hint strong {
  color: var(--primary-color);
}

.seedance-hint .warning {
  color: #f59e0b;
  font-weight: 500;
}

.seedance-hint .info {
  color: var(--text-secondary);
  display: block;
  margin-top: 4px;
}

/* 이미지 위치 배지 */
.image-position-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
}

.badge-first,
.badge-last {
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.badge-first {
  background: rgba(34, 197, 94, 0.9);
  color: white;
}

.badge-last {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}

/* DrawCanvas 통합 스타일 */
.draw-canvas-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.draw-canvas-modal > div {
  width: 100%;
  max-width: 1200px;
  height: 100%;
  max-height: 90vh;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.reference-actions {
  display: flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.btn-edit-image {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit-image:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.annotation-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .draw-canvas-modal {
    padding: 1rem;
  }
  
  .draw-canvas-modal > div {
    max-height: 95vh;
  }
  
  .btn-edit-image {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
  
  /* 모바일 참조 이미지 그리드 수정 */
  .reference-images-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 4px;
  }
  
  .reference-image-item {
    max-width: 100%;
  }
  
  .image-preview-wrapper {
    aspect-ratio: 1;
    width: 100%;
    height: auto;
  }
  
  .selected-references {
    padding: 8px;
    margin-top: 12px;
    margin-bottom: 12px;
  }
  
  /* 라이브러리 그리드 모바일 최적화 */
  .library-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    max-height: 180px;
    padding: 6px;
  }
  
  .library-item {
    min-width: 0;
  }
}
</style>