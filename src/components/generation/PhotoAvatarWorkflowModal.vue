<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeModal">
    <div class="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[95vh] overflow-hidden">
      <!-- 헤더 -->
      <div class="flex justify-between items-center p-6 border-b">
        <h2 class="text-xl font-semibold">HeyGen Photo Avatar 생성 워크플로우</h2>
        <button @click="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- 진행 단계 표시 -->
      <div class="px-6 py-4 border-b">
        <div class="flex items-center justify-between">
          <div v-for="(step, index) in steps" :key="index" class="flex items-center">
            <div :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep > index ? 'bg-green-500 text-white' : 
              currentStep === index ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            ]">
              {{ index + 1 }}
            </div>
            <span :class="[
              'ml-2 text-sm',
              currentStep >= index ? 'text-gray-800 font-medium' : 'text-gray-500'
            ]">
              {{ step.name }}
            </span>
            <div v-if="index < steps.length - 1" class="mx-4 h-px bg-gray-300 w-12"></div>
          </div>
        </div>
      </div>

      <!-- 콘텐츠 영역 -->
      <div class="p-6 overflow-y-auto" style="max-height: calc(95vh - 200px)">
        <!-- Step 1: Avatar Group 생성 -->
        <div v-if="currentStep === 0">
          <h3 class="text-lg font-medium mb-4">1단계: Avatar Group 생성</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Avatar Group 이름</label>
              <input
                v-model="workflow.step1.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 내 프로필 아바타"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">설명 (선택사항)</label>
              <textarea
                v-model="workflow.step1.description"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Avatar Group에 대한 설명"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">사진 업로드 (3-10장 권장)</label>
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  ref="photosInput"
                  @change="handlePhotosSelect"
                  accept="image/*"
                  multiple
                  class="hidden"
                />
                
                <div v-if="workflow.step1.photos.length === 0" @click="$refs.photosInput.click()" class="cursor-pointer text-center">
                  <Upload class="mx-auto mb-2 text-gray-400" :size="32" />
                  <p class="text-gray-600">클릭하여 여러 사진을 선택하세요</p>
                  <p class="text-xs text-gray-500 mt-1">JPG, PNG 지원 (각 최대 10MB)</p>
                </div>
                
                <div v-else>
                  <div class="grid grid-cols-3 gap-2 mb-4">
                    <div v-for="(photo, index) in workflow.step1.photos" :key="index" class="relative">
                      <img :src="photo.preview" :alt="`Photo ${index + 1}`" class="w-full h-24 object-cover rounded" />
                      <button
                        type="button"
                        @click="removePhoto(index)"
                        class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X :size="12" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="$refs.photosInput.click()"
                    class="w-full py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    더 많은 사진 추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: 모델 학습 -->
        <div v-else-if="currentStep === 1">
          <h3 class="text-lg font-medium mb-4">2단계: AI 모델 학습</h3>
          <div class="space-y-4">
            <div v-if="!workflow.step2.started">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">품질</label>
                  <select v-model="workflow.step2.quality" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="standard">Standard (빠름)</option>
                    <option value="high">High (권장)</option>
                    <option value="premium">Premium (최고품질)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">스타일</label>
                  <select v-model="workflow.step2.style" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="realistic">Realistic</option>
                    <option value="cartoon">Cartoon</option>
                    <option value="artistic">Artistic</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">학습 스텝</label>
                  <select v-model="workflow.step2.training_steps" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option :value="500">500 (빠름)</option>
                    <option :value="1000">1000 (권장)</option>
                    <option :value="2000">2000 (정밀)</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- 학습 진행 상태 -->
            <div v-if="workflow.step2.started" class="bg-gray-50 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium">모델 학습 진행중...</span>
                <span class="text-sm text-gray-600">{{ workflow.step2.progress }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" :style="{ width: workflow.step2.progress + '%' }"></div>
              </div>
              <p class="text-xs text-gray-500 mt-2">예상 소요 시간: {{ workflow.step2.estimated_time }}</p>
            </div>
          </div>
        </div>

        <!-- Step 3: Look 생성 -->
        <div v-else-if="currentStep === 2">
          <h3 class="text-lg font-medium mb-4">3단계: Avatar Look 생성</h3>
          <div class="space-y-4">
            <div v-if="!workflow.step3.started">
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">스타일</label>
                  <select v-model="workflow.step3.style" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="artistic">Artistic</option>
                    <option value="vintage">Vintage</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">각도</label>
                  <select v-model="workflow.step3.angle" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="front">정면</option>
                    <option value="side">측면</option>
                    <option value="three_quarter">3/4 각도</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">표정</label>
                  <select v-model="workflow.step3.expression" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="neutral">중립</option>
                    <option value="smile">미소</option>
                    <option value="serious">진지함</option>
                    <option value="friendly">친근함</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">생성 개수</label>
                  <select v-model="workflow.step3.generation_count" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option :value="2">2개</option>
                    <option :value="4">4개 (권장)</option>
                    <option :value="6">6개</option>
                    <option :value="8">8개</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Look 생성 결과 -->
            <div v-if="workflow.step3.looks.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-2">생성된 Look 선택</label>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div
                  v-for="(look, index) in workflow.step3.looks"
                  :key="index"
                  @click="workflow.step3.selectedLook = look"
                  :class="[
                    'relative cursor-pointer border-2 rounded-lg p-1',
                    workflow.step3.selectedLook?.url === look.url ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                  ]"
                >
                  <img :src="look.url" :alt="`Look ${index + 1}`" class="w-full h-32 object-cover rounded" />
                  <div v-if="workflow.step3.selectedLook?.url === look.url" class="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: 모션 추가 -->
        <div v-else-if="currentStep === 3">
          <h3 class="text-lg font-medium mb-4">4단계: 모션 추가</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">모션 타입</label>
                <select v-model="workflow.step4.motion_type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="speaking">Speaking</option>
                  <option value="nodding">Nodding</option>
                  <option value="gesturing">Gesturing</option>
                  <option value="blinking">Blinking</option>
                  <option value="breathing">Breathing</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">강도</label>
                <select v-model="workflow.step4.intensity" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">지속 시간 (초)</label>
                <input
                  v-model="workflow.step4.duration"
                  type="number"
                  min="1"
                  max="30"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">해상도</label>
                <select v-model="workflow.step4.resolution" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="720p">720p</option>
                  <option value="1080p">1080p (권장)</option>
                  <option value="4k">4K</option>
                </select>
              </div>
            </div>

            <!-- 음성 설정 (선택사항) -->
            <div class="border-t pt-4">
              <h4 class="text-md font-medium mb-2">음성 설정 (선택사항)</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">음성 ID</label>
                  <input
                    v-model="workflow.step4.voice_id"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="예: elevenlabs_voice_id"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">텍스트</label>
                  <input
                    v-model="workflow.step4.text"
                    type="text"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="말할 텍스트"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 5: 사운드 추가 -->
        <div v-else-if="currentStep === 4">
          <h3 class="text-lg font-medium mb-4">5단계: 사운드 효과 추가 (선택사항)</h3>
          <div class="space-y-4">
            <div class="flex items-center space-x-4 mb-4">
              <label class="flex items-center">
                <input
                  v-model="workflow.step5.add_background_music"
                  type="checkbox"
                  class="mr-2"
                />
                배경 음악 추가
              </label>
              <label class="flex items-center">
                <input
                  v-model="workflow.step5.add_sound_effects"
                  type="checkbox"
                  class="mr-2"
                />
                효과음 추가
              </label>
            </div>

            <!-- 배경 음악 설정 -->
            <div v-if="workflow.step5.add_background_music" class="border rounded-lg p-4">
              <h5 class="font-medium mb-2">배경 음악 설정</h5>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">장르</label>
                  <select v-model="workflow.step5.background_music.genre" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="ambient">Ambient</option>
                    <option value="corporate">Corporate</option>
                    <option value="upbeat">Upbeat</option>
                    <option value="dramatic">Dramatic</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">분위기</label>
                  <select v-model="workflow.step5.background_music.mood" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="neutral">Neutral</option>
                    <option value="happy">Happy</option>
                    <option value="serious">Serious</option>
                    <option value="inspiring">Inspiring</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">템포</label>
                  <select v-model="workflow.step5.background_music.tempo" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="slow">Slow</option>
                    <option value="medium">Medium</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">볼륨</label>
                  <input
                    v-model="workflow.step5.background_music.volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    class="w-full"
                  />
                  <span class="text-xs text-gray-500">{{ workflow.step5.background_music.volume }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 완료 단계 -->
        <div v-else-if="currentStep === 5">
          <h3 class="text-lg font-medium mb-4">생성 완료!</h3>
          <div class="text-center">
            <div v-if="finalResult.video_url">
              <video
                :src="finalResult.video_url"
                controls
                class="mx-auto mb-4 rounded-lg max-w-full max-h-96"
                :poster="finalResult.thumbnail_url"
              />
              <p class="text-gray-600 mb-4">Photo Avatar 생성이 완료되었습니다!</p>
              <div class="flex justify-center space-x-2">
                <button
                  type="button"
                  @click="downloadVideo"
                  class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  다운로드
                </button>
                <button
                  type="button"
                  @click="saveToProject"
                  class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  프로젝트에 저장
                </button>
              </div>
            </div>
            <div v-else class="text-gray-600">
              최종 비디오를 처리하는 중입니다...
            </div>
          </div>
        </div>
      </div>

      <!-- 하단 버튼 -->
      <div class="flex justify-between items-center p-6 border-t bg-gray-50">
        <button
          v-if="currentStep > 0 && currentStep < 5"
          @click="previousStep"
          :disabled="isProcessing"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전 단계
        </button>
        <div></div>
        
        <div class="flex space-x-2">
          <button
            v-if="currentStep < 4"
            @click="nextStep"
            :disabled="!canProceed || isProcessing"
            class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isProcessing ? '처리중...' : '다음 단계' }}
          </button>
          <button
            v-else-if="currentStep === 4"
            @click="finalize"
            :disabled="!canProceed || isProcessing"
            class="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isProcessing ? '생성중...' : '최종 생성' }}
          </button>
          <button
            v-else
            @click="closeModal"
            class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Upload, X } from 'lucide-vue-next'

const emit = defineEmits(['close', 'complete'])

// 워크플로우 단계 정의
const steps = [
  { name: 'Avatar Group 생성', key: 'avatar_group' },
  { name: 'AI 모델 학습', key: 'training' },
  { name: 'Look 생성', key: 'looks' },
  { name: '모션 추가', key: 'motion' },
  { name: '사운드 추가', key: 'sound' },
  { name: '완료', key: 'complete' }
]

const currentStep = ref(0)
const isProcessing = ref(false)
const finalResult = ref({})

// 각 단계별 데이터
const workflow = reactive({
  step1: {
    name: '',
    description: '',
    photos: [],
    group_id: null
  },
  step2: {
    quality: 'high',
    style: 'realistic',
    training_steps: 1000,
    started: false,
    progress: 0,
    training_id: null,
    estimated_time: '10-30 minutes'
  },
  step3: {
    style: 'professional',
    angle: 'front',
    expression: 'neutral',
    generation_count: 4,
    started: false,
    looks: [],
    selectedLook: null,
    look_generation_id: null
  },
  step4: {
    motion_type: 'speaking',
    intensity: 'medium',
    duration: 10,
    resolution: '1080p',
    voice_id: '',
    text: '',
    motion_job_id: null,
    video_url: null
  },
  step5: {
    add_background_music: false,
    add_sound_effects: false,
    background_music: {
      genre: 'ambient',
      mood: 'neutral',
      tempo: 'medium',
      volume: 0.3
    },
    sound_job_id: null
  }
})

// 다음 단계로 진행 가능한지 확인
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0: // Avatar Group 생성
      return workflow.step1.name.trim() && workflow.step1.photos.length >= 3
    case 1: // 모델 학습
      return workflow.step1.group_id && (workflow.step2.progress === 100 || !workflow.step2.started)
    case 2: // Look 생성
      return workflow.step2.training_id && workflow.step3.selectedLook
    case 3: // 모션 추가
      return workflow.step3.selectedLook && workflow.step4.motion_type
    case 4: // 사운드 추가
      return true // 선택사항이므로 항상 가능
    default:
      return false
  }
})

// 사진 선택 처리
const handlePhotosSelect = (event) => {
  const files = Array.from(event.target.files)
  
  files.forEach(file => {
    if (file.size > 10 * 1024 * 1024) {
      alert(`${file.name}은 10MB를 초과합니다.`)
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      workflow.step1.photos.push({
        file: file,
        preview: e.target.result,
        photo_data: e.target.result.split(',')[1] // base64 데이터만
      })
    }
    reader.readAsDataURL(file)
  })
}

// 사진 제거
const removePhoto = (index) => {
  workflow.step1.photos.splice(index, 1)
}

// 다음 단계로 이동
const nextStep = async () => {
  if (isProcessing.value || !canProceed.value) return
  
  isProcessing.value = true
  
  try {
    switch (currentStep.value) {
      case 0: // Avatar Group 생성
        await createAvatarGroup()
        break
      case 1: // 모델 학습
        await startTraining()
        break
      case 2: // Look 생성
        await generateLooks()
        break
      case 3: // 모션 추가
        await addMotion()
        break
    }
    
    currentStep.value++
  } catch (error) {
    console.error('Step processing error:', error)
    alert('단계 처리 중 오류가 발생했습니다: ' + error.message)
  } finally {
    isProcessing.value = false
  }
}

// 이전 단계로 이동
const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Step 1: Avatar Group 생성
const createAvatarGroup = async () => {
  const response = await fetch('/.netlify/functions/createAvatarGroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: workflow.step1.name,
      description: workflow.step1.description,
      photos: workflow.step1.photos.map(photo => ({
        photo_data: photo.photo_data
      }))
    })
  })
  
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.message || 'Avatar Group 생성 실패')
  }
  
  workflow.step1.group_id = result.group_id
}

// Step 2: 모델 학습 시작
const startTraining = async () => {
  if (workflow.step2.started && workflow.step2.progress < 100) {
    // 이미 학습 중인 경우 상태만 확인
    await checkTrainingStatus()
    return
  }
  
  const response = await fetch('/.netlify/functions/trainAvatarGroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      group_id: workflow.step1.group_id,
      quality: workflow.step2.quality,
      style: workflow.step2.style,
      training_steps: workflow.step2.training_steps
    })
  })
  
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.message || '모델 학습 시작 실패')
  }
  
  workflow.step2.training_id = result.training_id
  workflow.step2.started = true
  
  // 학습 상태 주기적 확인 시작
  startTrainingStatusCheck()
}

// 학습 상태 확인
const checkTrainingStatus = async () => {
  const response = await fetch('/.netlify/functions/checkTrainingStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      training_id: workflow.step2.training_id
    })
  })
  
  const result = await response.json()
  if (result.success) {
    workflow.step2.progress = result.progress
    workflow.step2.estimated_time = result.estimated_remaining_time || 'Unknown'
    
    if (result.is_complete) {
      workflow.step2.progress = 100
      return true
    }
  }
  
  return false
}

// 학습 상태 주기적 확인
const startTrainingStatusCheck = () => {
  const checkInterval = setInterval(async () => {
    if (workflow.step2.progress >= 100) {
      clearInterval(checkInterval)
      return
    }
    
    try {
      await checkTrainingStatus()
    } catch (error) {
      console.error('Training status check error:', error)
    }
  }, 10000) // 10초마다 확인
}

// Step 3: Look 생성
const generateLooks = async () => {
  const response = await fetch('/.netlify/functions/generateAvatarLook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      group_id: workflow.step1.group_id,
      style: workflow.step3.style,
      angle: workflow.step3.angle,
      expression: workflow.step3.expression,
      generation_count: workflow.step3.generation_count
    })
  })
  
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.message || 'Look 생성 실패')
  }
  
  workflow.step3.look_generation_id = result.look_generation_id
  workflow.step3.started = true
  
  // Look 생성 상태 확인 시작
  startLookGenerationCheck()
}

// Look 생성 상태 확인
const startLookGenerationCheck = () => {
  const checkInterval = setInterval(async () => {
    try {
      const response = await fetch('/.netlify/functions/checkLookGenerationStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          look_generation_id: workflow.step3.look_generation_id
        })
      })
      
      const result = await response.json()
      if (result.success && result.is_complete && result.look_urls?.length > 0) {
        workflow.step3.looks = result.look_urls.map(url => ({ url }))
        clearInterval(checkInterval)
      }
    } catch (error) {
      console.error('Look generation status check error:', error)
    }
  }, 10000)
}

// Step 4: 모션 추가
const addMotion = async () => {
  const response = await fetch('/.netlify/functions/addAvatarMotion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      look_url: workflow.step3.selectedLook.url,
      motion_type: workflow.step4.motion_type,
      intensity: workflow.step4.intensity,
      duration: workflow.step4.duration,
      resolution: workflow.step4.resolution,
      voice_config: workflow.step4.voice_id ? {
        voice_id: workflow.step4.voice_id,
        text: workflow.step4.text
      } : null
    })
  })
  
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.message || '모션 추가 실패')
  }
  
  workflow.step4.motion_job_id = result.motion_job_id
  
  // 모션 처리 상태 확인 시작
  startMotionStatusCheck()
}

// 모션 상태 확인
const startMotionStatusCheck = () => {
  const checkInterval = setInterval(async () => {
    try {
      const response = await fetch('/.netlify/functions/checkMotionStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motion_job_id: workflow.step4.motion_job_id
        })
      })
      
      const result = await response.json()
      if (result.success && result.is_complete && result.video_url) {
        workflow.step4.video_url = result.video_url
        clearInterval(checkInterval)
      }
    } catch (error) {
      console.error('Motion status check error:', error)
    }
  }, 10000)
}

// 최종 생성 (사운드 추가)
const finalize = async () => {
  isProcessing.value = true
  
  try {
    if (workflow.step5.add_background_music || workflow.step5.add_sound_effects) {
      // 사운드 추가
      const response = await fetch('/.netlify/functions/addAvatarSound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: workflow.step4.video_url,
          audio_type: 'background_music',
          background_music: workflow.step5.add_background_music ? workflow.step5.background_music : null
        })
      })
      
      const result = await response.json()
      if (result.success) {
        workflow.step5.sound_job_id = result.sound_job_id
        
        // 사운드 처리 완료 대기
        await waitForSoundCompletion()
      }
    } else {
      // 사운드 추가 없이 바로 완료
      finalResult.value = {
        video_url: workflow.step4.video_url,
        thumbnail_url: workflow.step4.thumbnail_url
      }
      currentStep.value = 5
    }
  } catch (error) {
    console.error('Finalization error:', error)
    alert('최종 생성 중 오류가 발생했습니다: ' + error.message)
  } finally {
    isProcessing.value = false
  }
}

// 사운드 처리 완료 대기
const waitForSoundCompletion = () => {
  return new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch('/.netlify/functions/checkSoundStatus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sound_job_id: workflow.step5.sound_job_id
          })
        })
        
        const result = await response.json()
        if (result.success && result.is_complete && result.final_video_url) {
          finalResult.value = {
            video_url: result.final_video_url,
            thumbnail_url: result.thumbnail_url
          }
          currentStep.value = 5
          clearInterval(checkInterval)
          resolve()
        }
      } catch (error) {
        console.error('Sound status check error:', error)
      }
    }, 10000)
  })
}

// 비디오 다운로드
const downloadVideo = () => {
  if (finalResult.value.video_url) {
    const a = document.createElement('a')
    a.href = finalResult.value.video_url
    a.download = `photo_avatar_${Date.now()}.mp4`
    a.click()
  }
}

// 프로젝트에 저장
const saveToProject = () => {
  emit('complete', {
    type: 'photo_avatar',
    video_url: finalResult.value.video_url,
    thumbnail_url: finalResult.value.thumbnail_url,
    metadata: {
      workflow: workflow,
      created_at: new Date().toISOString()
    }
  })
  closeModal()
}

// 모달 닫기
const closeModal = () => {
  emit('close')
}
</script>

<style scoped>
/* 추가 스타일은 필요에 따라 */
</style>