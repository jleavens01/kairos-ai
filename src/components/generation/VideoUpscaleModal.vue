<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>🎬 비디오 업스케일</h2>
        <button @click="close" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <!-- 원본 비디오 정보 -->
        <div class="video-info">
          <h3>원본 비디오</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">제목:</span>
              <span class="value">{{ video.element_name || '무제' }}</span>
            </div>
            <div class="info-item">
              <span class="label">해상도:</span>
              <span class="value">{{ video.resolution || '알 수 없음' }}</span>
            </div>
            <div class="info-item">
              <span class="label">FPS:</span>
              <span class="value">{{ video.fps || '30' }}</span>
            </div>
            <div class="info-item">
              <span class="label">길이:</span>
              <span class="value">{{ video.duration_seconds || 0 }}초</span>
            </div>
          </div>
        </div>

        <!-- 업스케일 설정 -->
        <div class="settings-section">
          <h3>업스케일 설정</h3>
          
          <!-- 업스케일 배수 -->
          <div class="setting-group">
            <label for="upscale-factor">
              업스케일 배수: <span class="value-display">{{ upscaleFactor }}x</span>
            </label>
            <div class="slider-container">
              <input 
                type="range" 
                id="upscale-factor"
                v-model.number="upscaleFactor"
                min="1"
                max="4"
                step="0.1"
                class="slider"
              />
              <div class="slider-labels">
                <span>1x</span>
                <span>2x</span>
                <span>3x</span>
                <span>4x</span>
              </div>
            </div>
            <div class="setting-help">
              {{ getOriginalResolution() }}에서 {{ upscaleFactor }}배로 업스케일됩니다
            </div>
          </div>

          <!-- 프레임 보간 -->
          <div class="setting-group">
            <label for="frame-interpolation">프레임 보간 (선택)</label>
            <div class="checkbox-group">
              <input 
                type="checkbox" 
                id="enable-interpolation"
                v-model="enableInterpolation"
              />
              <label for="enable-interpolation">프레임 보간 사용</label>
            </div>
            
            <div v-if="enableInterpolation" class="sub-settings">
              <label for="target-fps">
                목표 FPS: <span class="value-display">{{ targetFps }} FPS</span>
              </label>
              <div class="slider-container">
                <input 
                  type="range" 
                  id="target-fps"
                  v-model.number="targetFps"
                  min="16"
                  max="60"
                  step="1"
                  class="slider"
                />
                <div class="slider-labels">
                  <span>16</span>
                  <span>24</span>
                  <span>30</span>
                  <span>48</span>
                  <span>60</span>
                </div>
              </div>
              <div class="setting-help">
                Apollo v8 모델을 사용하여 프레임을 보간합니다 (원본: {{ video.fps || 30 }} FPS)
              </div>
            </div>
          </div>

          <!-- 코덱 설정 -->
          <div class="setting-group">
            <label for="codec">출력 코덱</label>
            <select v-model="useH264" id="codec" class="setting-select">
              <option :value="false">H.265/HEVC (기본, 고효율)</option>
              <option :value="true">H.264/AVC (호환성)</option>
            </select>
            <div class="setting-help">
              H.265는 파일 크기가 작지만 일부 기기에서 재생 불가
            </div>
          </div>

          <!-- 예상 결과 -->
          <div class="estimation">
            <h4>예상 결과</h4>
            <div class="estimation-grid">
              <div class="estimation-item">
                <span class="label">출력 해상도:</span>
                <span class="value">{{ estimatedResolution }}</span>
              </div>
              <div class="estimation-item">
                <span class="label">출력 FPS:</span>
                <span class="value">{{ enableInterpolation ? targetFps : (video.fps || 30) }}</span>
              </div>
              <div class="estimation-item">
                <span class="label">예상 처리 시간:</span>
                <span class="value">{{ estimatedTime }}분</span>
              </div>
              <div class="estimation-item">
                <span class="label">크레딧 비용:</span>
                <span class="value">{{ estimatedCredits }} 크레딧</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 경고 메시지 -->
        <div class="warning-message">
          <span class="warning-icon">⚠️</span>
          <div>
            <strong>주의사항:</strong>
            <ul>
              <li>업스케일 처리는 시간이 오래 걸릴 수 있습니다</li>
              <li>원본 비디오의 품질이 좋을수록 결과가 좋습니다</li>
              <li>8x 업스케일은 매우 높은 처리 시간이 필요합니다</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-cancel">취소</button>
        <button 
          @click="startUpscale" 
          :disabled="processing"
          class="btn-upscale"
        >
          <span v-if="!processing">
            🚀 업스케일 시작 ({{ estimatedCredits }} 크레딧)
          </span>
          <span v-else>
            ⏳ 처리 중...
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  video: {
    type: Object,
    required: true
  },
  projectId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'upscaled'])

// 상태
const isOpen = ref(true)
const processing = ref(false)

// 설정
const upscaleFactor = ref(2.0)
const enableInterpolation = ref(false)
const targetFps = ref(30)
const useH264 = ref(true) // H.264를 기본값으로 설정 (호환성 우선)

// 계산된 속성
const estimatedResolution = computed(() => {
  if (!props.video.resolution) return '알 수 없음'
  
  const [width, height] = props.video.resolution.split('x').map(Number)
  if (!width || !height) return '알 수 없음'
  
  const newWidth = width * upscaleFactor.value
  const newHeight = height * upscaleFactor.value
  
  return `${newWidth}x${newHeight}`
})

const estimatedTime = computed(() => {
  const baseDuration = props.video.duration_seconds || 10
  const factorMultiplier = Math.max(1, upscaleFactor.value / 2)
  const interpolationMultiplier = enableInterpolation.value ? 
    (1 + (targetFps.value - (props.video.fps || 30)) / 100) : 1
  
  return Math.ceil(baseDuration * factorMultiplier * interpolationMultiplier / 60)
})

const estimatedCredits = computed(() => {
  // 기본 비용: 초당 10 크레딧
  const baseCredits = (props.video.duration_seconds || 10) * 10
  
  // 업스케일 배수에 따른 배율 (1x는 비용이 적음)
  const factorMultiplier = Math.pow(upscaleFactor.value, 1.5)
  
  // 프레임 보간 추가 비용 (FPS 증가율에 따라)
  const interpolationMultiplier = enableInterpolation.value ? 
    (1 + (targetFps.value - (props.video.fps || 30)) / 60) : 1
  
  return Math.ceil(baseCredits * factorMultiplier * interpolationMultiplier)
})

// 메서드
const close = () => {
  isOpen.value = false
  emit('close')
}

const getOriginalResolution = () => {
  if (!props.video) return '원본 해상도'
  
  // 이미 resolution이 있으면 사용
  if (props.video.resolution) {
    return props.video.resolution
  }
  
  // 모델별 기본 해상도 추정
  const model = props.video.generation_model?.toLowerCase() || ''
  
  if (model.includes('veo')) {
    if (props.video.aspect_ratio === '9:16') return '720x1280'
    if (props.video.aspect_ratio === '1:1') return '720x720'
    return '1280x720'
  }
  
  if (model.includes('kling')) {
    return '1280x720'
  }
  
  if (model.includes('hailou')) {
    if (model.includes('standard')) return '768P'
    if (model.includes('pro')) return '1280x720'
    return '768P'
  }
  
  if (model.includes('seedance')) {
    if (model.includes('lite')) return '480p'
    if (model.includes('pro')) return '720p'
    return '480p'
  }
  
  return '원본 해상도'
}

const startUpscale = async () => {
  processing.value = true
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('로그인이 필요합니다')
    }
    
    // 비디오 URL 확인
    const videoUrl = props.video.storage_video_url || props.video.result_video_url
    if (!videoUrl) {
      throw new Error('비디오 URL을 찾을 수 없습니다')
    }
    
    // 업스케일 요청
    const response = await fetch('/.netlify/functions/upscaleVideo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        projectId: props.projectId,
        originalVideoId: props.video.id,
        videoUrl: videoUrl,
        upscaleFactor: upscaleFactor.value,
        targetFps: enableInterpolation.value ? targetFps.value : null,
        h264Output: useH264.value,
        metadata: {
          originalResolution: props.video.resolution,
          originalFps: props.video.fps,
          originalDuration: props.video.duration_seconds
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '업스케일 요청 실패')
    }
    
    const result = await response.json()
    
    emit('upscaled', result)
    close()
    
    // 성공 메시지
    alert('업스케일이 시작되었습니다. 처리가 완료되면 알림을 받게 됩니다.')
    
  } catch (error) {
    console.error('업스케일 오류:', error)
    alert(error.message || '업스케일 중 오류가 발생했습니다')
  } finally {
    processing.value = false
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
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
  font-size: 24px;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 30px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary);
}

.modal-body {
  padding: 20px;
}

.video-info {
  background: var(--bg-secondary);
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.video-info h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-item .label {
  color: var(--text-secondary);
  font-size: 14px;
}

.info-item .value {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.settings-section {
  margin-bottom: 20px;
}

.settings-section h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.setting-select {
  width: 100%;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
}

.setting-help {
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-secondary);
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-group label {
  margin: 0;
  cursor: pointer;
  user-select: none;
}

.sub-settings {
  margin-left: 26px;
  padding-left: 15px;
  border-left: 2px solid var(--border-color);
}

/* 슬라이더 스타일 */
.slider-container {
  margin: 15px 0;
}

.slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: var(--bg-tertiary);
  border-radius: 3px;
  outline: none;
  transition: background 0.2s;
}

.slider:hover {
  background: var(--border-color);
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: var(--primary-color);
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 3px 8px rgba(102, 126, 234, 0.4);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: var(--primary-color);
  cursor: pointer;
  border-radius: 50%;
  border: none;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 3px 8px rgba(102, 126, 234, 0.4);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.value-display {
  color: var(--primary-color);
  font-weight: 600;
  font-size: 16px;
  margin-left: 8px;
}

.estimation {
  background: var(--bg-tertiary);
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.estimation h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.estimation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.estimation-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.estimation-item .label {
  color: var(--text-secondary);
}

.estimation-item .value {
  color: var(--primary-color);
  font-weight: 600;
}

.warning-message {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 6px;
  margin-top: 15px;
}

.warning-icon {
  font-size: 20px;
}

.warning-message strong {
  display: block;
  margin-bottom: 5px;
  color: var(--text-primary);
  font-size: 13px;
}

.warning-message ul {
  margin: 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--text-secondary);
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel, .btn-upscale {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--bg-tertiary);
}

.btn-upscale {
  background: var(--primary-color);
  color: white;
}

.btn-upscale:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-1px);
}

.btn-upscale:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 다크 모드 변수 */
:root {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2a2a2a;
  --bg-tertiary: #3a3a3a;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --border-color: #404040;
  --primary-color: #667eea;
  --primary-dark: #5568d3;
}

/* 라이트 모드 */
@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-tertiary: #e9ecef;
    --text-primary: #212529;
    --text-secondary: #6c757d;
    --border-color: #dee2e6;
    --primary-color: #667eea;
    --primary-dark: #5568d3;
  }
}
</style>