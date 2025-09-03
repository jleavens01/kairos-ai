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
              @click="formData.avatarId = avatar.id; formData.avatarType = avatar.type"
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
                    : 'bg-blue-100 text-blue-800'
                ]">
                  {{ avatar.type === 'talking_photo' ? 'Photo' : 'Avatar' }}
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
                  :key="voice.id" 
                  :value="voice.id"
                >
                  {{ voice.name }} ({{ voice.gender }})
                  {{ voice.emotion_support ? '🎭' : '' }}
                  {{ voice.support_pause ? '⏸️' : '' }}
                </option>
              </optgroup>
            </select>
            
            <!-- 선택된 음성 미리듣기 -->
            <div v-if="selectedVoice && selectedVoice.preview_audio" class="mt-2">
              <audio controls class="w-full">
                <source :src="selectedVoice.preview_audio" type="audio/mpeg">
                Your browser does not support the audio element.
              </audio>
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
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="1280x720">1280x720 (HD)</option>
              <option value="720x1280">720x1280 (모바일 세로)</option>
              <option value="1080x1920">1080x1920 (모바일 세로 HD)</option>
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
    <PhotoAvatarModal
      v-if="showPhotoAvatarModal"
      @close="showPhotoAvatarModal = false"
      @avatar-generated="handleAvatarGenerated"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useGenerationStore } from '@/stores/generation'
import { Plus } from 'lucide-vue-next'
import PhotoAvatarModal from './PhotoAvatarModal.vue'

const emit = defineEmits(['close'])
const generationStore = useGenerationStore()

const isGenerating = ref(false)
const selectedResolution = ref('1280x720')
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
  return availableVoices.value.find(voice => voice.id === formData.voiceId)
})

const formData = reactive({
  title: '',
  avatarId: '',
  avatarType: 'avatar',
  voiceId: '',
  script: '',
  backgroundType: 'color',
  backgroundColor: '#f6f6fc',
  backgroundUrl: '',
  videoPlayStyle: 'loop',
  width: 1280,
  height: 720,
  voiceSpeed: 1.0,
  caption: false
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
      title: formData.title || '아바타 비디오',
      caption: formData.caption,
      dimension: {
        width: formData.width,
        height: formData.height
      },
      video_inputs: [{
        character: {
          type: 'avatar',
          avatar_id: formData.avatarId,
          scale: 1.0
        },
        voice: {
          type: 'text',
          voice_id: formData.voiceId,
          input_text: formData.script,
          speed: formData.voiceSpeed
        },
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
    
    // 아바타와 토킹 포토 합치기
    let allAvatars = [
      ...result.avatars.map(avatar => ({ ...avatar, type: 'avatar' })),
      ...result.talking_photos.map(photo => ({ ...photo, type: 'talking_photo' }))
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
    const response = await fetch('/.netlify/functions/getHeyGenVoices')
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to load voices')
    }
    
    // API에서 데이터가 없는 경우 테스트 데이터 사용
    if (result.voices.length === 0) {
      console.warn('No voices from HeyGen API, using fallback data')
      const fallbackData = getFallbackVoices()
      availableVoices.value = fallbackData.voices
      voicesByLanguage.value = fallbackData.voices_by_language
      availableLanguages.value = fallbackData.languages
    } else {
      availableVoices.value = result.voices
      voicesByLanguage.value = result.voices_by_language
      availableLanguages.value = result.languages
    }
    
    // 첫 번째 음성을 기본 선택 (한국어 우선)
    if (availableVoices.value.length > 0 && !formData.voiceId) {
      const koreanVoices = availableVoices.value.filter(voice => 
        voice.language.includes('Korean') || voice.language.includes('한국')
      )
      formData.voiceId = koreanVoices.length > 0 ? koreanVoices[0].id : availableVoices.value[0].id
    }
    
    console.log(`Loaded ${availableVoices.value.length} voices in ${availableLanguages.value.length} languages`)
    
  } catch (error) {
    console.error('Failed to load voices:', error)
    
    // 에러 발생시 폴백 데이터 사용
    const fallbackData = getFallbackVoices()
    availableVoices.value = fallbackData.voices
    voicesByLanguage.value = fallbackData.voices_by_language
    availableLanguages.value = fallbackData.languages
    
    if (fallbackData.voices.length > 0 && !formData.voiceId) {
      const koreanVoices = fallbackData.voices.filter(voice => 
        voice.language.includes('Korean') || voice.language.includes('한국')
      )
      formData.voiceId = koreanVoices.length > 0 ? koreanVoices[0].id : fallbackData.voices[0].id
    }
    
    voicesError.value = `API 연결 실패 (테스트 데이터 사용): ${error.message}`
  } finally {
    loadingVoices.value = false
  }
}

const getFallbackAvatars = () => {
  return [
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

const getFallbackVoices = () => {
  const voices = [
    {
      id: 'voice_ko_1',
      name: '지수 (여성)',
      language: 'Korean',
      gender: 'Female',
      preview_audio: null,
      support_pause: true,
      emotion_support: true
    },
    {
      id: 'voice_ko_2', 
      name: '민호 (남성)',
      language: 'Korean',
      gender: 'Male',
      preview_audio: null,
      support_pause: true,
      emotion_support: false
    },
    {
      id: 'voice_en_1',
      name: 'Emma (Female)',
      language: 'English',
      gender: 'Female',
      preview_audio: null,
      support_pause: true,
      emotion_support: true
    },
    {
      id: 'voice_en_2',
      name: 'James (Male)', 
      language: 'English',
      gender: 'Male',
      preview_audio: null,
      support_pause: false,
      emotion_support: false
    }
  ]

  const voicesByLanguage = {
    'Korean': voices.filter(v => v.language === 'Korean'),
    'English': voices.filter(v => v.language === 'English')
  }

  return {
    voices,
    voices_by_language: voicesByLanguage,
    languages: ['Korean', 'English']
  }
}

const handleImageError = (event) => {
  // 이미지 로드 실패 시 기본 이미지나 플레이스홀더 표시
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCA3MEM2MS4wNDU3IDcwIDcwIDYxLjA0NTcgNzAgNTBDNzAgMzguOTU0MyA2MS4wNDU3IDMwIDUwIDMwQzM4Ljk1NDMgMzAgMzAgMzguOTU0MyAzMCA1MEMzMCA2MS4wNDU3IDM4Ljk1NDMgNzAgNTAgNzBaIiBmaWxsPSIjOTCA5N0FEIi8+Cjwvc3ZnPg=='
}

const handleAvatarGenerated = (avatarData) => {
  console.log('Avatar generated:', avatarData)
  
  // 생성된 사진 아바타를 아바타 목록에 추가
  const newAvatar = {
    id: `photo_${Date.now()}`,
    name: avatarData.name,
    type: 'talking_photo',
    thumbnail: avatarData.photo_urls[0], // 첫 번째 이미지를 썸네일로 사용
    premium: false,
    metadata: avatarData.metadata
  }
  
  availableAvatars.value.unshift(newAvatar)
  
  // 새로 생성된 아바타를 자동 선택
  formData.avatarId = newAvatar.id
  formData.avatarType = 'talking_photo'
  
  showPhotoAvatarModal.value = false
}

const closeModal = () => {
  emit('close')
}

onMounted(async () => {
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