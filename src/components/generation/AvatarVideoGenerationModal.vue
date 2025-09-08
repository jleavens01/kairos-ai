<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">아바타 비디오 생성</h2>
        <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <form @submit.prevent="generateAvatarVideo" class="space-y-6">
        <!-- 비디오 제목 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">비디오 제목</label>
          <input
            v-model="formData.title"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="아바타 비디오 제목을 입력하세요"
          />
        </div>

        <!-- 아바타 선택 -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-gray-700">아바타 선택</label>
            <button
              type="button"
              @click="showPhotoAvatarModal = true"
              class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus :size="14" />
              사진으로 아바타 만들기
            </button>
          </div>
          
          <!-- 로딩 상태 -->
          <div v-if="loadingAvatars" class="flex justify-center py-8">
            <div class="spinner"></div>
            <span class="ml-2 text-gray-600">아바타 목록을 불러오는 중...</span>
          </div>
          
          <!-- 아바타 그리드 -->
          <div v-else class="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            <div
              v-for="avatar in availableAvatars"
              :key="avatar.id"
              @click="selectAvatar(avatar)"
              :class="[
                'border-2 rounded-lg p-3 cursor-pointer transition-all relative',
                formData.avatarId === avatar.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <img
                :src="avatar.thumbnail"
                :alt="avatar.name"
                class="w-full aspect-square object-cover rounded-md mb-2"
                @error="handleImageError"
              />
              <p class="text-sm font-medium text-center">{{ avatar.name }}</p>
              <!-- 프리미엄 배지 -->
              <div v-if="avatar.premium" class="absolute top-1 right-1">
                <span class="bg-yellow-400 text-yellow-900 text-xs px-1 py-0.5 rounded">PRO</span>
              </div>
              <!-- 타입 배지 -->
              <div class="absolute top-1 left-1">
                <span :class="[
                  'text-xs px-1 py-0.5 rounded',
                  avatar.type === 'talking_photo' 
                    ? 'bg-green-100 text-green-800'
                    : avatar.type === 'photo_avatar_group'
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                ]">
                  {{ 
                    avatar.type === 'talking_photo' ? 'Photo' 
                    : avatar.type === 'photo_avatar_group' ? 'Custom'
                    : 'Avatar' 
                  }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- API 상태 표시 -->
          <div v-if="avatarsError" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <div class="flex items-center mb-1">
              <svg class="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span class="font-medium text-yellow-800">HeyGen API 연결 상태</span>
            </div>
            <p class="text-yellow-700 mb-2">{{ avatarsError }}</p>
            <div class="flex justify-between items-center">
              <span class="text-xs text-yellow-600">현재 테스트 데이터를 사용중입니다.</span>
              <button @click="loadAvatars" class="text-xs bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded">
                다시 시도
              </button>
            </div>
          </div>
        </div>

        <!-- 음성 설정 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">음성 선택</label>
          
          <!-- 로딩 상태 -->
          <div v-if="loadingVoices" class="flex justify-center py-4">
            <div class="spinner-small"></div>
            <span class="ml-2 text-gray-600">음성 목록을 불러오는 중...</span>
          </div>
          
          <!-- 음성 선택 -->
          <div v-else>
            <select
              v-model="formData.voiceId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">음성을 선택하세요</option>
              <optgroup 
                v-for="language in availableLanguages" 
                :key="language" 
                :label="language"
              >
                <option 
                  v-for="voice in voicesByLanguage[language]" 
                  :key="voice.voice_id" 
                  :value="voice.voice_id"
                >
                  {{ voice.voice_name }} ({{ voice.gender }})
                  {{ voice.supports_emotion ? '🎭' : '' }}
                  {{ voice.supports_pause ? '⏸️' : '' }}
                  {{ voice.is_premium ? '👑' : '' }}
                </option>
              </optgroup>
            </select>
            
            <!-- 선택된 음성 미리듣기 -->
            <div v-if="selectedVoice && selectedVoice.preview_audio_url" class="mt-2">
              <audio controls class="w-full">
                <source :src="selectedVoice.preview_audio_url" type="audio/mpeg">
                Your browser does not support the audio element.
              </audio>
            </div>
            
            <!-- 음성 제공업체 정보 -->
            <div v-if="selectedVoice" class="mt-2 text-xs text-gray-600">
              <span class="bg-gray-100 px-2 py-1 rounded">{{ selectedVoice.provider.toUpperCase() }}</span>
              <span v-if="selectedVoice.category" class="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded">{{ selectedVoice.category }}</span>
              <span v-if="selectedVoice.is_premium" class="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PRO</span>
            </div>
          </div>
          
          <!-- API 상태 표시 -->
          <div v-if="voicesError" class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm mt-2">
            <div class="flex items-center mb-1">
              <svg class="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <span class="font-medium text-yellow-800">음성 API 연결 상태</span>
            </div>
            <p class="text-yellow-700 mb-2">{{ voicesError }}</p>
            <div class="flex justify-between items-center">
              <span class="text-xs text-yellow-600">현재 테스트 음성을 사용중입니다.</span>
              <button @click="loadVoices" class="text-xs bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded">
                다시 시도
              </button>
            </div>
          </div>
        </div>

        <!-- 스크립트 입력 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">스크립트</label>
          <textarea
            v-model="formData.script"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="아바타가 말할 스크립트를 입력하세요..."
          />
          <p class="text-sm text-gray-500 mt-1">{{ formData.script.length }}/2000 글자</p>
        </div>

        <!-- 고급 설정 -->
        <div class="border rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-700 mb-3">고급 설정</h3>
          
          <!-- 배경 설정 -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">배경</label>
            <div class="grid grid-cols-3 gap-2 mb-2">
              <button
                type="button"
                @click="formData.backgroundType = 'color'"
                :class="[
                  'px-3 py-2 rounded-md text-sm border',
                  formData.backgroundType === 'color'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 border-gray-300'
                ]"
              >
                단색
              </button>
              <button
                type="button"
                @click="formData.backgroundType = 'image'"
                :class="[
                  'px-3 py-2 rounded-md text-sm border',
                  formData.backgroundType === 'image'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 border-gray-300'
                ]"
              >
                이미지
              </button>
              <button
                type="button"
                @click="formData.backgroundType = 'video'"
                :class="[
                  'px-3 py-2 rounded-md text-sm border',
                  formData.backgroundType === 'video'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-50 border-gray-300'
                ]"
              >
                비디오
              </button>
            </div>

            <!-- 배경 색상 -->
            <div v-if="formData.backgroundType === 'color'">
              <input
                v-model="formData.backgroundColor"
                type="color"
                class="w-16 h-8 border rounded"
              />
            </div>

            <!-- 배경 이미지 URL -->
            <div v-if="formData.backgroundType === 'image'">
              <input
                v-model="formData.backgroundUrl"
                type="url"
                placeholder="이미지 URL을 입력하세요"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- 배경 비디오 URL -->
            <div v-if="formData.backgroundType === 'video'">
              <input
                v-model="formData.backgroundUrl"
                type="url"
                placeholder="비디오 URL을 입력하세요"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              />
              <select
                v-model="formData.videoPlayStyle"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="loop">반복 재생</option>
                <option value="once">한번 재생</option>
                <option value="fit_to_scene">화면 맞춤</option>
                <option value="freeze">정지</option>
              </select>
            </div>
          </div>

          <!-- 비디오 해상도 -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">해상도</label>
            <select
              v-model="selectedResolution"
              @change="updateResolution"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <!-- Photo Avatar는 세로형 우선 -->
              <template v-if="isPhotoAvatar">
                <option value="720x1280">720x1280 (세로 HD) 📱</option>
                <option value="1080x1920">1080x1920 (세로 Full HD) 📱</option>
                <option value="1280x720">1280x720 (가로 HD)</option>
                <option value="1920x1080">1920x1080 (가로 Full HD)</option>
              </template>
              <!-- 일반 Avatar는 가로형 우선 -->
              <template v-else>
                <option value="1920x1080">1920x1080 (Full HD)</option>
                <option value="1280x720">1280x720 (HD)</option>
                <option value="720x1280">720x1280 (모바일 세로)</option>
                <option value="1080x1920">1080x1920 (모바일 세로 HD)</option>
              </template>
            </select>
          </div>

          <!-- 음성 속도 -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              음성 속도: {{ formData.voiceSpeed }}x
            </label>
            <input
              v-model.number="formData.voiceSpeed"
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              class="w-full"
            />
          </div>

          <!-- 음성 피치 (지원하는 경우) -->
          <div v-if="selectedVoice?.supports_pitch" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              음성 피치: {{ formData.voicePitch }}
            </label>
            <input
              v-model.number="formData.voicePitch"
              type="range"
              min="-50"
              max="50"
              step="1"
              class="w-full"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>낮음</span>
              <span>기본</span>
              <span>높음</span>
            </div>
          </div>

          <!-- 감정 설정 (지원하는 경우) -->
          <div v-if="selectedVoice?.supports_emotion && selectedVoice?.supported_emotions?.length" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">감정</label>
            <select
              v-model="formData.voiceEmotion"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">기본</option>
              <option 
                v-for="emotion in selectedVoice.supported_emotions" 
                :key="emotion" 
                :value="emotion"
              >
                {{ emotion }}
              </option>
            </select>
          </div>

          <!-- 로케일 설정 (다국어 지원하는 경우) -->
          <div v-if="selectedVoice?.supports_multilingual && selectedVoice?.supported_locales?.length" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">발음 (로케일)</label>
            <select
              v-model="formData.voiceLocale"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">기본</option>
              <option 
                v-for="locale in selectedVoice.supported_locales" 
                :key="locale" 
                :value="locale"
              >
                {{ locale }}
              </option>
            </select>
          </div>

          <!-- ElevenLabs 고급 설정 -->
          <div v-if="selectedVoice?.provider === 'elevenlabs'" class="mb-4 border rounded-lg p-4 bg-purple-50">
            <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs mr-2">ElevenLabs</span>
              고급 설정
            </h4>
            
            <!-- ElevenLabs 모델 선택 -->
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">모델</label>
              <select
                v-model="formData.elevenlabsModel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option 
                  v-for="model in elevenLabsModels" 
                  :key="model.value" 
                  :value="model.value"
                >
                  {{ model.label }}
                </option>
              </select>
            </div>

            <!-- 유사성 (Similarity Boost) -->
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                유사성: {{ formData.elevenLabsSimilarity.toFixed(2) }}
              </label>
              <input
                v-model.number="formData.elevenLabsSimilarity"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">원본 음성과의 유사도 조절</p>
            </div>

            <!-- 안정성 (Stability) -->
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                안정성: {{ formData.elevenLabsStability.toFixed(2) }}
              </label>
              <input
                v-model.number="formData.elevenLabsStability"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">음성 생성 안정성 및 일관성</p>
            </div>

            <!-- 스타일 (Style) -->
            <div class="mb-3">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                스타일 강도: {{ formData.elevenLabsStyle.toFixed(2) }}
              </label>
              <input
                v-model.number="formData.elevenLabsStyle"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full"
              />
              <p class="text-xs text-gray-500 mt-1">음성 스타일 표현 강도</p>
            </div>
          </div>

          <!-- 자막 설정 -->
          <div class="flex items-center">
            <input
              v-model="formData.caption"
              type="checkbox"
              id="caption"
              class="mr-2"
            />
            <label for="caption" class="text-sm text-gray-700">자막 추가</label>
          </div>
        </div>

        <!-- 생성 버튼 -->
        <div class="flex justify-end space-x-3">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            :disabled="isGenerating"
          >
            취소
          </button>
          <button
            type="submit"
            :disabled="!canGenerate || isGenerating"
            :class="[
              'px-4 py-2 rounded-md font-medium',
              canGenerate && !isGenerating
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
          >
            <span v-if="isGenerating">생성 중...</span>
            <span v-else>아바타 비디오 생성</span>
          </button>
        </div>
      </form>
    </div>

    <!-- 사진 아바타 생성 모달 -->
    <PhotoAvatarWorkflowModal
      v-if="showPhotoAvatarModal"
      @close="showPhotoAvatarModal = false"
      @complete="handlePhotoAvatarComplete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useGenerationStore } from '@/stores/generation'
import { Plus } from 'lucide-vue-next'
import PhotoAvatarWorkflowModal from './PhotoAvatarWorkflowModal.vue'
import { getRecommendedVoicesForAvatar } from '@/utils/kairosAvatars'

const props = defineProps({
  projectId: {
    type: String,
    required: false
  },
  defaultAvatarId: {
    type: String,
    required: false
  },
  isPhotoAvatar: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'generated'])
const generationStore = useGenerationStore()

const isGenerating = ref(false)
// Photo Avatar는 세로형, 일반 Avatar는 가로형 기본값
const selectedResolution = ref(props.isPhotoAvatar ? '720x1280' : '1280x720')
const showPhotoAvatarModal = ref(false)

// 로딩 상태
const loadingAvatars = ref(false)
const loadingVoices = ref(false)
const avatarsError = ref(null)
const voicesError = ref(null)

// 동적 데이터
const availableAvatars = ref([])
const availableVoices = ref([])
const voicesByLanguage = ref({})
const availableLanguages = ref([])

// 선택된 음성 정보
const selectedVoice = computed(() => {
  return availableVoices.value.find(voice => voice.voice_id === formData.voiceId)
})

// ElevenLabs 모델 옵션
const elevenLabsModels = [
  { value: 'eleven_monolingual_v1', label: 'Monolingual V1' },
  { value: 'eleven_multilingual_v1', label: 'Multilingual V1' },
  { value: 'eleven_multilingual_v2', label: 'Multilingual V2' },
  { value: 'eleven_turbo_v2', label: 'Turbo V2' },
  { value: 'eleven_turbo_v2_5', label: 'Turbo V2.5 (권장)' }
]

const formData = reactive({
  title: '',
  avatarId: '',
  avatarType: 'avatar',
  voiceId: '',
  voiceProvider: 'heygen',
  script: '',
  backgroundType: 'color',
  backgroundColor: props.isPhotoAvatar ? '#ffffff' : '#f6f6fc',  // Photo Avatar는 흰색 배경
  backgroundUrl: '',
  videoPlayStyle: 'loop',
  width: props.isPhotoAvatar ? 720 : 1280,
  height: props.isPhotoAvatar ? 1280 : 720,
  voiceSpeed: 1.0,
  voicePitch: 0,
  voiceEmotion: '',
  voiceLocale: '',
  caption: false,
  // ElevenLabs 설정
  elevenlabsModel: 'eleven_turbo_v2_5',
  elevenLabsSimilarity: 0.75,
  elevenLabsStability: 0.50,
  elevenLabsStyle: 0.00
})

const canGenerate = computed(() => {
  return formData.avatarId && formData.voiceId && formData.script.trim().length > 0
})

const updateResolution = () => {
  const [width, height] = selectedResolution.value.split('x').map(Number)
  formData.width = width
  formData.height = height
}

const generateAvatarVideo = async () => {
  if (!canGenerate.value || isGenerating.value) return

  isGenerating.value = true

  try {
    const payload = {
      project_id: props.projectId, // 프로젝트 ID 추가
      title: formData.title || '아바타 비디오',
      caption: formData.caption,
      dimension: {
        width: formData.width,
        height: formData.height
      },
      video_inputs: [{
        character: props.isPhotoAvatar ? {
          type: 'talking_photo',
          talking_photo_id: formData.avatarId,
          scale: 1.0,
          talking_photo_style: 'natural',  // 원본 형태 유지
          talking_style: 'stable',
          expression: 'default',
          super_resolution: false,
          matting: true  // 배경 분리 활성화
        } : {
          type: 'avatar',
          avatar_id: formData.avatarId,
          scale: 1.0
        },
        voice: {
          type: 'text',
          voice_id: formData.voiceId,
          input_text: formData.script,
          speed: formData.voiceSpeed,
          pitch: formData.voicePitch,
          emotion: formData.voiceEmotion || undefined,
          locale: formData.voiceLocale || undefined,
          elevenlabs_settings: selectedVoice.value?.provider === 'elevenlabs' ? {
            model: formData.elevenlabsModel,
            similarity_boost: formData.elevenLabsSimilarity,
            stability: formData.elevenLabsStability,
            style: formData.elevenLabsStyle
          } : undefined
        },
        voice_model: selectedVoice.value,
        background: getBackgroundConfig()
      }]
    }

    const response = await fetch('/.netlify/functions/generateHeyGenAvatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '아바타 비디오 생성에 실패했습니다.')
    }

    // 생성된 비디오를 스토어에 추가
    await generationStore.addAvatarVideo({
      heygen_video_id: result.video_id,
      title: formData.title || '아바타 비디오',
      status: 'processing',
      avatar_id: formData.avatarId,
      script: formData.script,
      metadata: {
        voice_id: formData.voiceId,
        dimensions: { width: formData.width, height: formData.height },
        background: getBackgroundConfig()
      }
    })

    closeModal()
  } catch (error) {
    console.error('Avatar video generation error:', error)
    alert(error.message || '아바타 비디오 생성 중 오류가 발생했습니다.')
  } finally {
    isGenerating.value = false
  }
}

const getBackgroundConfig = () => {
  switch (formData.backgroundType) {
    case 'color':
      return {
        type: 'color',
        value: formData.backgroundColor
      }
    case 'image':
      return {
        type: 'image',
        url: formData.backgroundUrl
      }
    case 'video':
      return {
        type: 'video',
        url: formData.backgroundUrl,
        play_style: formData.videoPlayStyle
      }
    default:
      return {
        type: 'color',
        value: '#f6f6fc'
      }
  }
}

// API 호출 함수들
const loadAvatars = async () => {
  loadingAvatars.value = true
  avatarsError.value = null
  
  try {
    const response = await fetch('/.netlify/functions/getHeyGenAvatars')
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to load avatars')
    }
    
    // 모든 아바타 타입 합치기
    let allAvatars = [
      ...result.avatars.map(avatar => ({ ...avatar, type: 'avatar' })),
      ...result.talking_photos.map(photo => ({ ...photo, type: 'talking_photo' })),
      ...(result.photo_avatar_groups || []).map(group => ({ ...group, type: 'photo_avatar_group' }))
    ]
    
    // API에서 데이터가 없는 경우 테스트 데이터 사용
    if (allAvatars.length === 0) {
      console.warn('No avatars from HeyGen API, using fallback data')
      allAvatars = getFallbackAvatars()
    }
    
    availableAvatars.value = allAvatars
    
    // 첫 번째 아바타를 기본 선택
    if (allAvatars.length > 0 && !formData.avatarId) {
      formData.avatarId = allAvatars[0].id
      formData.avatarType = allAvatars[0].type
    }
    
    console.log(`Loaded ${allAvatars.length} avatars`)
    
  } catch (error) {
    console.error('Failed to load avatars:', error)
    
    // 에러 발생시 폴백 데이터 사용
    const fallbackAvatars = getFallbackAvatars()
    availableAvatars.value = fallbackAvatars
    
    if (fallbackAvatars.length > 0 && !formData.avatarId) {
      formData.avatarId = fallbackAvatars[0].id
      formData.avatarType = fallbackAvatars[0].type
    }
    
    avatarsError.value = `API 연결 실패 (테스트 데이터 사용): ${error.message}`
  } finally {
    loadingAvatars.value = false
  }
}

const loadVoices = async () => {
  loadingVoices.value = true
  voicesError.value = null
  
  try {
    // 모든 음성 모델 로드 (HeyGen + ElevenLabs)
    const response = await fetch('/.netlify/functions/getVoiceModels?provider=all&language=all')
    const result = await response.json()
    
    console.log('getVoiceModels API response:', result)
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to load voices')
    }
    
    // API 응답에서 voices 배열 확인
    const voices = result.voices || []
    console.log(`API returned ${voices.length} voices`)
    
    if (voices.length === 0) {
      throw new Error('No voices available from API')
    }
    
    availableVoices.value = voices
    voicesByLanguage.value = result.voices_by_language || {}
    availableLanguages.value = result.languages || []
    
    // 첫 번째 음성을 기본 선택 (한국어 우선)
    if (availableVoices.value.length > 0 && !formData.voiceId) {
      const koreanVoices = availableVoices.value.filter(voice => 
        voice.language === 'ko'
      )
      const defaultVoice = koreanVoices.length > 0 ? koreanVoices[0] : availableVoices.value[0]
      formData.voiceId = defaultVoice.voice_id
      formData.voiceProvider = defaultVoice.provider
      
      console.log('Selected default voice:', defaultVoice.voice_name, defaultVoice.voice_id, 'provider:', defaultVoice.provider)
    }
    
    console.log(`Loaded ${availableVoices.value.length} voices in ${availableLanguages.value.length} languages`)
    
  } catch (error) {
    console.error('Failed to load voices:', error)
    voicesError.value = `음성 모델 로드 실패: ${error.message}`
    
    // 최소한의 기본 음성으로 설정 (데이터베이스에 세모지 음성이 있어야 함)
    availableVoices.value = []
    voicesByLanguage.value = {}
    availableLanguages.value = []
  } finally {
    loadingVoices.value = false
  }
}

const getFallbackAvatars = () => {
  return [
    {
      id: 'f9ed7e3d4bc14f209094c8affd6e24d4',
      name: '세상의모든지식',
      type: 'avatar',
      thumbnail: 'https://resource.heygen.com/avatar/v3/f9ed7e3d4bc14f209094c8affd6e24d4/preview.webp',
      premium: false
    },
    {
      id: 'avatar_1',
      name: 'Sarah (테스트)',
      type: 'avatar',
      thumbnail: 'https://images.unsplash.com/photo-1494790108755-2616b612b13c?w=200&h=200&fit=crop&crop=face',
      premium: false
    },
    {
      id: 'avatar_2', 
      name: 'David (테스트)',
      type: 'avatar',
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
      premium: false
    },
    {
      id: 'avatar_3',
      name: 'Lisa (테스트)',
      type: 'avatar',
      thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
      premium: true
    },
    {
      id: 'talking_photo_1',
      name: '토킹 포토 1 (테스트)',
      type: 'talking_photo',
      thumbnail: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
      premium: false
    }
  ]
}

// getFallbackVoices 함수 제거됨 - 이제 voice_models 테이블에서만 음성 데이터를 로드

const handleImageError = (event) => {
  // 이미지 로드 실패 시 기본 이미지나 플레이스홀더 표시
  event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ccircle cx="50" cy="45" r="15" fill="%239ca3af"/%3E%3Cpath d="M25 75 Q50 65 75 75" stroke="%239ca3af" stroke-width="2" fill="none"/%3E%3C/svg%3E'
}

// 아바타 선택 시 추천 음성 자동 설정
const selectAvatar = (avatar) => {
  // 아바타 기본 정보 설정
  formData.avatarId = avatar.id
  formData.avatarType = avatar.type
  
  // 해당 아바타의 추천 음성 가져오기
  const recommendedVoices = getRecommendedVoicesForAvatar(avatar.id)
  
  if (recommendedVoices.length > 0) {
    const firstRecommendedVoiceId = recommendedVoices[0]
    
    // 로드된 음성 목록에서 해당 음성 찾기
    const matchingVoice = availableVoices.value.find(voice => voice.voice_id === firstRecommendedVoiceId)
    
    if (matchingVoice) {
      formData.voiceId = matchingVoice.voice_id
      console.log(`아바타 ${avatar.name} 선택 → 추천 음성 ${matchingVoice.voice_name} (${matchingVoice.voice_id}) 자동 설정`)
    } else {
      console.log(`추천 음성 ${firstRecommendedVoiceId}을 음성 목록에서 찾을 수 없습니다.`)
    }
  }
}

const handlePhotoAvatarComplete = (result) => {
  console.log('Photo avatar workflow completed:', result)
  
  if (result.type === 'photo_avatar' && result.video_url) {
    // 생성된 사진 아바타를 아바타 목록에 추가
    const newAvatar = {
      id: `photo_${Date.now()}`,
      name: result.metadata?.workflow?.step1?.name || 'Custom Photo Avatar',
      type: 'talking_photo',
      thumbnail: result.thumbnail_url || result.video_url, // 썸네일 또는 비디오 URL
      premium: false,
      metadata: result.metadata,
      video_url: result.video_url
    }
    
    availableAvatars.value.unshift(newAvatar)
    
    // 새로 생성된 아바타를 자동 선택
    formData.avatarId = newAvatar.id
    formData.avatarType = 'talking_photo'
  }
  
  showPhotoAvatarModal.value = false
}

const closeModal = () => {
  emit('close')
}

onMounted(async () => {
  // 기본 아바타 ID 설정
  if (props.defaultAvatarId) {
    formData.avatarId = props.defaultAvatarId
    // isPhotoAvatar prop을 기반으로 avatarType 설정
    if (props.isPhotoAvatar) {
      formData.avatarType = 'photo_avatar_group'
    } else {
      formData.avatarType = 'avatar'
    }
    console.log('Set default avatar ID:', props.defaultAvatarId, 'avatarType:', formData.avatarType, 'isPhotoAvatar:', props.isPhotoAvatar)
  }

  // 아바타와 음성 목록을 병렬로 로드
  await Promise.all([
    loadAvatars(),
    loadVoices()
  ])
})
</script>

<style scoped>
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 스크롤바 스타일링 */
.max-h-64::-webkit-scrollbar {
  width: 6px;
}

.max-h-64::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.max-h-64::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.max-h-64::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>