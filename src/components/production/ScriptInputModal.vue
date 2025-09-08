<template>
  <div v-if="show" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>📝 원고 입력 및 씬 나누기 (1단계)</h2>
        <button class="close-button" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <div class="script-form">
          <!-- 원고 입력 -->
          <div class="form-group">
            <label class="form-label">원고 내용:</label>
            <textarea 
              v-model="scriptText" 
              placeholder="스크립트를 입력하세요...\n\n예시:\n#1\n장소: 회의실\n시간: 오후\n\n김 대리가 서류를 들고 회의실로 들어온다.\n\n김 대리: 팀장님, 이번 프로젝트 보고서입니다."
              class="script-textarea"
              :disabled="loading"
            ></textarea>
            <div class="char-count">
              {{ scriptText.length }} / 10000 자
            </div>
          </div>
          
          <!-- 로딩 상태 -->
          <div v-if="isAnalyzing" class="loading-status">
            <div class="loading-spinner"></div>
            <p>{{ currentStep || statusMessage }}</p>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <div class="progress-info">
              <span class="progress-text">{{ progress }}%</span>
              <span v-if="remainingTime" class="remaining-time">
                예상 남은 시간: {{ formatTime(remainingTime) }}
              </span>
            </div>
            <div v-if="currentJob?.totalScenes" class="scene-count">
              생성된 씬 수: {{ currentJob.totalScenes }}개
            </div>
          </div>
          
          <!-- 에러 메시지 -->
          <div v-if="error" class="error-message">
            <span class="error-icon">⚠️</span>
            {{ error }}
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="handleClose" class="btn-cancel" :disabled="loading">
          취소
        </button>
        <button 
          @click="handleAnalyze" 
          class="btn-analyze"
          :disabled="isAnalyzing || !scriptText.trim() || scriptText.length > 10000"
        >
          {{ isAnalyzing ? '분석 중...' : '고급 시나리오 분석 시작 (연출가이드 포함)' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProductionStore } from '@/stores/production'
import { useScriptAnalysis } from '@/composables/useScriptAnalysis'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close', 'success'])

const productionStore = useProductionStore()
const {
  isAnalyzing,
  progress,
  currentStep,
  currentJob,
  remainingTime,
  analysisResult,
  error,
  isCompleted,
  startAnalysis,
  resetAnalysis
} = useScriptAnalysis()

// State
const scriptText = ref('')
const loading = ref(false)
const statusMessage = ref('')

// 분석 완료 감지
watch(isCompleted, (completed) => {
  if (completed && analysisResult.value) {
    statusMessage.value = `분석 완료! ${analysisResult.value.totalScenes}개 씬이 생성되었습니다.`
    setTimeout(() => {
      emit('success', analysisResult.value)
      handleClose()
    }, 1000)
  }
})

// Methods
const handleClose = () => {
  if (!isAnalyzing.value) {
    resetAnalysis()
    emit('close')
    // Reset form
    scriptText.value = ''
    statusMessage.value = ''
  }
}

const formatTime = (seconds) => {
  if (seconds < 60) {
    return `${seconds}초`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}분 ${remainingSeconds}초`
}

const handleAnalyze = async () => {
  if (!scriptText.value.trim()) {
    error.value = '원고를 입력해주세요.'
    return
  }
  
  if (scriptText.value.length > 50000) { // 제한 완화
    error.value = '원고는 50,000자를 초과할 수 없습니다.'
    return
  }
  
  try {
    statusMessage.value = '고급 시나리오 분석을 시작합니다...'
    
    await startAnalysis(
      props.projectId,
      scriptText.value,
      'documentary' // 다큐멘터리 분석 타입
    )
    
    statusMessage.value = '분석 작업이 시작되었습니다. 진행상황을 확인하세요.'
    
  } catch (err) {
    console.error('분석 시작 실패:', err)
    // error는 composable에서 자동으로 설정됨
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
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background-color: var(--bg-primary);
  border-radius: 10px;
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px 25px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  transition: all 0.2s;
}

.close-button:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  padding: 25px;
  overflow-y: auto;
}

.script-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.creation-modes {
  display: flex;
  gap: 20px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-primary);
}

.radio-option input[type="radio"] {
  cursor: pointer;
}

.radio-option span {
  font-size: 0.95rem;
}

.script-textarea {
  width: 100%;
  min-height: 300px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  resize: vertical;
  transition: border-color 0.2s;
}

.script-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

.script-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.char-count {
  text-align: right;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.loading-status {
  padding: 20px;
  background-color: var(--bg-secondary);
  border-radius: 5px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-status p {
  color: var(--text-primary);
  margin: 0 0 15px 0;
  font-size: 0.95rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.error-message {
  padding: 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 5px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.error-icon {
  font-size: 1.2rem;
}

.modal-footer {
  padding: 20px 25px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel, .btn-analyze {
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-cancel {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover:not(:disabled) {
  background-color: var(--bg-primary);
}

.btn-analyze {
  background: var(--primary-gradient);
  color: white;
}

.btn-analyze:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.btn-cancel:disabled, .btn-analyze:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .modal-content {
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 15px 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .script-textarea {
    min-height: 200px;
  }
  
  .creation-modes {
    flex-direction: column;
    gap: 12px;
  }
}

/* 새로운 비동기 분석 관련 스타일 */
.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.remaining-time {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

.scene-count {
  margin-top: 10px;
  padding: 8px 12px;
  background-color: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 4px;
  color: #22c55e;
  font-size: 0.9rem;
  font-weight: 500;
}

.loading-status .scene-count {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>