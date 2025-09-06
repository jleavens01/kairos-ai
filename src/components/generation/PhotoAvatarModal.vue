<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal">
    <div class="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">사진으로 아바타 만들기</h2>
        <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <form @submit.prevent="generatePhotoAvatar" class="space-y-4">
        <!-- 아바타 이름 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">아바타 이름</label>
          <input
            v-model="formData.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="아바타 이름을 입력하세요"
          />
        </div>

        <!-- 사진 업로드 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">사진 업로드</label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <input
              type="file"
              ref="fileInput"
              @change="handleFileSelect"
              accept="image/*"
              class="hidden"
            />
            
            <div v-if="!photoPreview" @click="$refs.fileInput.click()" class="cursor-pointer">
              <Upload class="mx-auto mb-2 text-gray-400" :size="32" />
              <p class="text-gray-600">클릭하여 사진을 선택하세요</p>
              <p class="text-xs text-gray-500 mt-1">JPG, PNG, GIF 지원 (최대 10MB)</p>
            </div>
            
            <div v-else class="relative">
              <img :src="photoPreview" alt="Preview" class="max-h-48 mx-auto rounded" />
              <button
                type="button"
                @click="removePhoto"
                class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>

        <!-- 나이 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">나이</label>
          <select
            v-model="formData.age"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Young Adult">청년 (Young Adult)</option>
            <option value="Early Middle Age">중년 초기 (Early Middle Age)</option>
            <option value="Late Middle Age">중년 후기 (Late Middle Age)</option>
            <option value="Senior">시니어 (Senior)</option>
            <option value="Unspecified">지정하지 않음</option>
          </select>
        </div>

        <!-- 성별 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">성별</label>
          <select
            v-model="formData.gender"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Woman">여성 (Woman)</option>
            <option value="Man">남성 (Man)</option>
            <option value="Unspecified">지정하지 않음</option>
          </select>
        </div>

        <!-- 인종 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">인종</label>
          <select
            v-model="formData.ethnicity"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="East Asian">동아시아 (East Asian)</option>
            <option value="Southeast Asian">동남아시아 (Southeast Asian)</option>
            <option value="South Asian">남아시아 (South Asian)</option>
            <option value="Middle Eastern">중동 (Middle Eastern)</option>
            <option value="Latino">라틴 (Latino)</option>
            <option value="Black">흑인 (Black)</option>
            <option value="White">백인 (White)</option>
            <option value="Mixed">혼혈 (Mixed)</option>
            <option value="Unspecified">지정하지 않음</option>
          </select>
        </div>

        <!-- 방향 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">사진 방향</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="formData.orientation = 'square'"
              :class="[
                'px-3 py-2 rounded-md text-sm border',
                formData.orientation === 'square'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              ]"
            >
              정사각형
            </button>
            <button
              type="button"
              @click="formData.orientation = 'horizontal'"
              :class="[
                'px-3 py-2 rounded-md text-sm border',
                formData.orientation === 'horizontal'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              ]"
            >
              가로
            </button>
            <button
              type="button"
              @click="formData.orientation = 'vertical'"
              :class="[
                'px-3 py-2 rounded-md text-sm border',
                formData.orientation === 'vertical'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              ]"
            >
              세로
            </button>
          </div>
        </div>

        <!-- 포즈 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">포즈</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="formData.pose = 'half_body'"
              :class="[
                'px-3 py-2 rounded-md text-sm border',
                formData.pose === 'half_body'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              ]"
            >
              반신
            </button>
            <button
              type="button"
              @click="formData.pose = 'close_up'"
              :class="[
                'px-3 py-2 rounded-md text-sm border',
                formData.pose === 'close_up'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              ]"
            >
              클로즈업
            </button>
            <button
              type="button"
              @click="formData.pose = 'full_body'"
              :class="[
                'px-3 py-2 rounded-md text-sm border',
                formData.pose === 'full_body'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              ]"
            >
              전신
            </button>
          </div>
        </div>

        <!-- 스타일 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">스타일</label>
          <select
            v-model="formData.style"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Realistic">리얼리스틱 (Realistic)</option>
            <option value="Pixar">픽사 (Pixar)</option>
            <option value="Cinematic">시네마틱 (Cinematic)</option>
            <option value="Vintage">빈티지 (Vintage)</option>
            <option value="Noir">느와르 (Noir)</option>
            <option value="Cyberpunk">사이버펑크 (Cyberpunk)</option>
            <option value="Unspecified">지정하지 않음</option>
          </select>
        </div>

        <!-- 외모 설명 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">외모 설명 (선택사항)</label>
          <textarea
            v-model="formData.appearance"
            rows="3"
            maxlength="1000"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="특별한 외모나 스타일을 설명하세요... (예: 안경을 착용한, 긴 머리의, 웃고 있는)"
          />
          <p class="text-sm text-gray-500 mt-1">{{ formData.appearance.length }}/1000 글자</p>
        </div>

        <!-- 생성 버튼 -->
        <div class="flex justify-end space-x-3 pt-4">
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
            <span v-if="isGenerating">아바타 생성 중...</span>
            <span v-else>아바타 생성하기</span>
          </button>
        </div>
      </form>

      <!-- 생성 진행 상황 -->
      <div v-if="generationStatus" class="mt-4 p-4 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">아바타 생성 진행률</span>
          <span class="text-sm text-gray-600">{{ generationStatus.status }}</span>
        </div>
        
        <div v-if="generationStatus.status === 'processing'" class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full animate-pulse" :style="`width: ${generationStatus.progress || 50}%`"></div>
        </div>
        
        <div v-if="generationStatus.status === 'completed'" class="mt-3">
          <p class="text-sm text-green-600 mb-2">아바타가 성공적으로 생성되었습니다!</p>
          <div class="grid grid-cols-2 gap-2">
            <img
              v-for="(url, index) in generationStatus.photo_urls"
              :key="index"
              :src="url"
              :alt="`Generated avatar ${index + 1}`"
              class="w-full aspect-square object-cover rounded-md border"
            />
          </div>
          <button
            @click="useGeneratedAvatar"
            class="mt-2 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
          >
            이 아바타 사용하기
          </button>
        </div>
        
        <div v-if="generationStatus.status === 'failed'" class="mt-3">
          <p class="text-sm text-red-600">{{ generationStatus.error_message || '아바타 생성에 실패했습니다.' }}</p>
          <button
            @click="retryGeneration"
            class="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Upload, X } from 'lucide-vue-next'

const emit = defineEmits(['close', 'avatar-generated'])

const isGenerating = ref(false)
const photoPreview = ref(null)
const selectedFile = ref(null)
const generationStatus = ref(null)
const jobId = ref(null)

const formData = reactive({
  name: '',
  age: 'Young Adult',
  gender: 'Unspecified',
  ethnicity: 'East Asian',
  orientation: 'square',
  pose: 'half_body',
  style: 'Realistic',
  appearance: '자연스러운 표정의 사람' // 기본값 설정 (최소 1글자 이상 필요)
})

const canGenerate = computed(() => {
  return formData.name.trim().length > 0 && selectedFile.value
})

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 파일 크기 체크 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('파일 크기는 10MB 이하여야 합니다.')
    return
  }

  // 파일 타입 체크
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드할 수 있습니다.')
    return
  }

  selectedFile.value = file

  // 미리보기 생성
  const reader = new FileReader()
  reader.onload = (e) => {
    photoPreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const removePhoto = () => {
  photoPreview.value = null
  selectedFile.value = null
}

const generatePhotoAvatar = async () => {
  if (!canGenerate.value || isGenerating.value) return

  isGenerating.value = true
  generationStatus.value = { status: 'processing', progress: 0 }

  try {
    // 파일을 base64로 변환
    const base64 = await fileToBase64(selectedFile.value)

    const payload = {
      name: formData.name,
      age: formData.age,
      gender: formData.gender,
      ethnicity: formData.ethnicity,
      orientation: formData.orientation,
      pose: formData.pose,
      style: formData.style,
      appearance: formData.appearance,
      photo_data: base64,
      callback_id: `photo_avatar_${Date.now()}`
    }

    const response = await fetch('/.netlify/functions/generatePhotoAvatar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    console.log('Photo avatar generation result structure:', JSON.stringify(result, null, 2))
    console.log('Available keys:', Object.keys(result))

    if (!response.ok) {
      throw new Error(result.error || '아바타 생성에 실패했습니다.')
    }

    // result 구조 확인하고 안전하게 접근 (여러 경로 시도)
    const generationId = result.generation_id || 
                        result.data?.generation_id || 
                        result.job_id ||
                        result.data?.job_id ||
                        result.callback_id // 임시로 callback_id 사용
                        
    if (!generationId) {
      console.error('No generation_id found in result:', result)
      console.error('Available keys:', Object.keys(result))
      // 일단 callback_id로도 시도해보기
      if (result.callback_id) {
        console.warn('Using callback_id as fallback:', result.callback_id)
        jobId.value = result.callback_id
      } else {
        throw new Error('Generation ID not found in response')
      }
    } else {
      console.log('Using generation_id:', generationId)
      jobId.value = generationId
    }
    generationStatus.value = {
      status: 'processing',
      progress: 25
    }

    // 상태 폴링 시작
    startStatusPolling()

  } catch (error) {
    console.error('Photo avatar generation error:', error)
    generationStatus.value = {
      status: 'failed',
      error_message: error.message || '아바타 생성 중 오류가 발생했습니다.'
    }
  } finally {
    isGenerating.value = false
  }
}

const startStatusPolling = async () => {
  const maxAttempts = 60 // 5분간 폴링 (5초 간격)
  let attempts = 0

  const pollStatus = async () => {
    if (attempts >= maxAttempts) {
      generationStatus.value = {
        status: 'failed',
        error_message: '생성 시간이 초과되었습니다. 다시 시도해 주세요.'
      }
      return
    }

    try {
      const response = await fetch('/.netlify/functions/checkPhotoAvatarStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ job_id: jobId.value })
      })

      const result = await response.json()
      console.log('Photo avatar status check response:', { 
        status: response.status, 
        ok: response.ok, 
        result 
      })

      if (!response.ok) {
        console.error('Photo avatar status check failed:', result)
        
        // 404는 아직 아바타가 준비되지 않았을 수 있음
        if (response.status === 404) {
          console.warn('Avatar not ready yet, will retry...')
          generationStatus.value = {
            status: 'processing',
            progress: Math.min(25 + (attempts * 3), 80),
            error_message: null
          }
          
          // 잠시 후 다시 시도
          setTimeout(() => checkPhotoAvatarStatus(attempts + 1), 8000)
          return
        }
        
        throw new Error(result.error || result.message || '상태 확인에 실패했습니다.')
      }

      generationStatus.value = {
        status: result.status,
        progress: result.progress || 50 + (attempts * 2),
        photo_urls: result.photo_urls || [],
        error_message: result.error_message
      }

      if (result.status === 'completed') {
        console.log('Photo avatar generation completed:', result.photo_urls)
        return
      }

      if (result.status === 'failed') {
        return
      }

      // 계속 폴링
      attempts++
      setTimeout(pollStatus, 5000)

    } catch (error) {
      console.error('Status polling error:', error)
      generationStatus.value = {
        status: 'failed',
        error_message: error.message || '상태 확인 중 오류가 발생했습니다.'
      }
    }
  }

  // 첫 번째 상태 확인을 3초 후에 시작
  setTimeout(pollStatus, 3000)
}

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

const useGeneratedAvatar = () => {
  // 생성된 아바타 정보를 부모 컴포넌트에 전달
  emit('avatar-generated', {
    name: formData.name,
    photo_urls: generationStatus.value.photo_urls,
    metadata: {
      age: formData.age,
      gender: formData.gender,
      ethnicity: formData.ethnicity,
      style: formData.style
    }
  })
  closeModal()
}

const retryGeneration = () => {
  generationStatus.value = null
  jobId.value = null
  generatePhotoAvatar()
}

const closeModal = () => {
  emit('close')
}
</script>

<style scoped>
/* 애니메이션 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 스크롤바 스타일링 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>