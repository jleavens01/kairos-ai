<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>배경 제거</h3>
        <button @click="close" class="btn-close"><X :size="20" /></button>
      </div>

      <div class="modal-body">
        <!-- 원본 이미지 표시 -->
        <div class="original-image-section">
          <h4>원본 이미지</h4>
          <div class="image-preview">
            <img :src="originalImage" :alt="'원본 이미지'" />
          </div>
          <p class="image-info">
            이 이미지에서 배경을 자동으로 제거합니다.
            <br>주요 객체나 인물만 남기고 배경을 투명하게 만듭니다.
          </p>
        </div>

        <!-- 배경 제거 옵션 -->
        <div class="options-section">
          <h4>제거 설정</h4>
          <div class="form-group">
            <label>제거 모드</label>
            <div class="mode-options">
              <label class="mode-option" :class="{ active: removeMode === 'auto' }">
                <input type="radio" v-model="removeMode" value="auto" />
                <span class="mode-label">
                  <strong>자동 감지</strong>
                  <small>AI가 자동으로 주요 객체를 감지하여 배경 제거</small>
                </span>
              </label>
              
              <label class="mode-option" :class="{ active: removeMode === 'object' }">
                <input type="radio" v-model="removeMode" value="object" />
                <span class="mode-label">
                  <strong>객체 중심</strong>
                  <small>물건이나 제품 이미지에 최적화된 배경 제거</small>
                </span>
              </label>
              
              <label class="mode-option" :class="{ active: removeMode === 'person' }">
                <input type="radio" v-model="removeMode" value="person" />
                <span class="mode-label">
                  <strong>인물 중심</strong>
                  <small>사람이나 동물 이미지에 최적화된 배경 제거</small>
                </span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>응답 형식</label>
            <select v-model="responseFormat" class="form-select">
              <option value="url">URL 링크</option>
              <option value="b64_json">Base64 JSON</option>
            </select>
          </div>
        </div>

        <!-- 예상 결과 정보 -->
        <div class="info-section">
          <div class="info-card">
            <h5>예상 결과</h5>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">제거 모드:</span>
                <span class="info-value">{{ getModeDescription(removeMode) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">크레딧 비용:</span>
                <span class="info-value">40 크레딧</span>
              </div>
              <div class="info-item">
                <span class="info-label">결과 형식:</span>
                <span class="info-value">투명 배경 (PNG)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 결과 미리보기 -->
        <div v-if="removeResult" class="result-section">
          <h4>배경 제거 결과</h4>
          <div class="result-preview">
            <!-- 체크보드 배경으로 투명도 표시 -->
            <div class="transparent-bg">
              <img :src="removeResult.processed_url" alt="배경이 제거된 이미지" />
            </div>
          </div>
          <div class="result-info">
            <p><strong>처리 유형:</strong> {{ removeResult.process_type }}</p>
            <p><strong>모델:</strong> {{ removeResult.model }}</p>
            <p><strong>모드:</strong> {{ removeResult.mode }}</p>
            <p><strong>크레딧 비용:</strong> {{ removeResult.credit_cost }} 크레딧</p>
            <div class="result-actions">
              <button @click="downloadProcessed" class="btn-primary">
                <Download :size="16" /> PNG 다운로드
              </button>
              <button @click="copyProcessedUrl" class="btn-secondary">
                <Copy :size="16" /> URL 복사
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-secondary">취소</button>
        <button 
          @click="removeBackground" 
          class="btn-primary"
          :disabled="processing"
        >
          <span v-if="processing">배경 제거 중...</span>
          <span v-else>배경 제거 시작 (40 크레딧)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { X, Download, Copy } from 'lucide-vue-next'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  show: Boolean,
  originalImage: String, // 원본 이미지 URL
  imageId: String // 이미지 ID (선택사항)
})

const emit = defineEmits(['close', 'success'])

// 상태 관리
const processing = ref(false)
const removeMode = ref('auto') // 기본값: 자동 감지
const responseFormat = ref('url')
const removeResult = ref(null)

// Methods
const close = () => {
  emit('close')
}

const getModeDescription = (mode) => {
  const descriptions = {
    'auto': '자동 감지',
    'object': '객체 중심',
    'person': '인물 중심'
  }
  return descriptions[mode] || '자동 감지'
}

const removeBackground = async () => {
  if (!props.originalImage) {
    alert('원본 이미지가 필요합니다.')
    return
  }

  processing.value = true
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }

    console.log('Starting background removal...')
    console.log('Original image:', props.originalImage)
    console.log('Remove mode:', removeMode.value)

    // Recraft 배경 제거 API 호출
    const response = await fetch('/.netlify/functions/generateRecraftRemoveBackground', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        image_url: props.originalImage,
        mode: removeMode.value,
        response_format: responseFormat.value,
        original_image_id: props.imageId
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Background removal failed')
    }

    console.log('Background removal successful:', result)
    removeResult.value = result

    // 성공 알림
    emit('success', result)

  } catch (error) {
    console.error('Background removal error:', error)
    alert(`배경 제거 실패: ${error.message}`)
  } finally {
    processing.value = false
  }
}

const downloadProcessed = async () => {
  if (!removeResult.value?.processed_url) return

  try {
    const response = await fetch(removeResult.value.processed_url)
    const blob = await response.blob()
    
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `background_removed_${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    console.log('Background removed image downloaded successfully')
  } catch (error) {
    console.error('Download failed:', error)
    alert('다운로드에 실패했습니다.')
  }
}

const copyProcessedUrl = async () => {
  if (!removeResult.value?.processed_url) return

  try {
    await navigator.clipboard.writeText(removeResult.value.processed_url)
    alert('이미지 URL이 클립보드에 복사되었습니다.')
  } catch (error) {
    console.error('Copy failed:', error)
    
    // Fallback: 텍스트 선택
    const textArea = document.createElement('textarea')
    textArea.value = removeResult.value.processed_url
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    alert('이미지 URL이 클립보드에 복사되었습니다.')
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.btn-close {
  padding: 6px;
  border: none;
  background: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.original-image-section,
.options-section,
.info-section,
.result-section {
  margin-bottom: 24px;
}

.original-image-section h4,
.options-section h4,
.info-section h4,
.result-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.image-preview {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #f9fafb;
  margin-bottom: 12px;
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-info {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  margin: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.mode-option:hover {
  border-color: #ef4444;
  background: #fef2f2;
}

.mode-option.active {
  border-color: #ef4444;
  background: #fef2f2;
}

.mode-option input[type="radio"] {
  margin-right: 12px;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  flex-shrink: 0;
}

.mode-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mode-label strong {
  font-size: 16px;
  color: #111827;
}

.mode-label small {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: rgba(59, 130, 246, 0.1);
}

.info-card {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
}

.info-card h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #7c2d12;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #a16207;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #7c2d12;
}

.result-preview {
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: #f0fdf4;
  margin-bottom: 12px;
}

.transparent-bg {
  background-image: 
    linear-gradient(45deg, #ccc 25%, transparent 25%), 
    linear-gradient(-45deg, #ccc 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #ccc 75%), 
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transparent-bg img {
  max-width: 100%;
  max-height: 280px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.result-info {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 16px;
}

.result-info p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #0f172a;
}

.result-info p:last-child {
  margin-bottom: 0;
}

.result-actions {
  margin-top: 16px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  min-width: 120px;
  justify-content: center;
}

.btn-primary {
  background: #ef4444;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #dc2626;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

@media (max-width: 640px) {
  .modal-container {
    width: 95%;
    margin: 20px;
  }
  
  .mode-options {
    gap: 12px;
  }
  
  .result-actions {
    flex-direction: column;
  }
  
  .result-actions button {
    width: 100%;
  }
}
</style>