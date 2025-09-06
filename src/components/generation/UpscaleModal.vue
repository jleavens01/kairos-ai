<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>이미지 업스케일</h3>
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
            이 이미지를 고해상도로 업스케일합니다.
            <br>업스케일하면 이미지가 더 크고 선명해집니다.
          </p>
        </div>

        <!-- 업스케일 옵션 -->
        <div class="options-section">
          <h4>업스케일 설정</h4>
          <div class="form-group">
            <label>업스케일 배수</label>
            <div class="scale-options">
              <label class="scale-option" :class="{ active: upscaleFactor === 2 }">
                <input type="radio" v-model="upscaleFactor" :value="2" />
                <span class="scale-label">
                  <strong>2x</strong>
                  <small>2배 확대 (30 크레딧)</small>
                </span>
              </label>
              
              <label class="scale-option" :class="{ active: upscaleFactor === 4 }">
                <input type="radio" v-model="upscaleFactor" :value="4" />
                <span class="scale-label">
                  <strong>4x</strong>
                  <small>4배 확대 (60 크레딧)</small>
                </span>
              </label>
              
              <label class="scale-option" :class="{ active: upscaleFactor === 8 }">
                <input type="radio" v-model="upscaleFactor" :value="8" />
                <span class="scale-label">
                  <strong>8x</strong>
                  <small>8배 확대 (120 크레딧)</small>
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
                <span class="info-label">업스케일 배수:</span>
                <span class="info-value">{{ upscaleFactor }}x</span>
              </div>
              <div class="info-item">
                <span class="info-label">크레딧 비용:</span>
                <span class="info-value">{{ getCreditCost(upscaleFactor) }} 크레딧</span>
              </div>
              <div class="info-item">
                <span class="info-label">예상 품질:</span>
                <span class="info-value">{{ getQualityDescription(upscaleFactor) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 결과 미리보기 -->
        <div v-if="upscaleResult" class="result-section">
          <h4>업스케일 결과</h4>
          <div class="result-preview">
            <img :src="upscaleResult.upscaled_url" alt="업스케일된 이미지" />
          </div>
          <div class="result-info">
            <p><strong>업스케일 배수:</strong> {{ upscaleResult.upscale_factor }}x</p>
            <p><strong>모델:</strong> {{ upscaleResult.model }}</p>
            <p><strong>크레딧 비용:</strong> {{ upscaleResult.credit_cost }} 크레딧</p>
            <div class="result-actions">
              <button @click="downloadUpscaled" class="btn-primary">
                <Download :size="16" /> 고해상도 다운로드
              </button>
              <button @click="copyUpscaledUrl" class="btn-secondary">
                <Copy :size="16" /> URL 복사
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-secondary">취소</button>
        <button 
          @click="upscaleImage" 
          class="btn-primary"
          :disabled="processing"
        >
          <span v-if="processing">업스케일 중...</span>
          <span v-else>업스케일 시작 ({{ getCreditCost(upscaleFactor) }} 크레딧)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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
const upscaleFactor = ref(4) // 기본값: 4x
const responseFormat = ref('url')
const upscaleResult = ref(null)

// Methods
const close = () => {
  emit('close')
}

const getCreditCost = (factor) => {
  const costs = { 2: 30, 4: 60, 8: 120 }
  return costs[factor] || 60
}

const getQualityDescription = (factor) => {
  const descriptions = {
    2: '좋음',
    4: '매우 좋음', 
    8: '최고 품질'
  }
  return descriptions[factor] || '매우 좋음'
}

const upscaleImage = async () => {
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

    console.log('Starting image upscale...')
    console.log('Original image:', props.originalImage)
    console.log('Upscale factor:', upscaleFactor.value)

    // Recraft 업스케일 API 호출
    const response = await fetch('/.netlify/functions/generateRecraftUpscale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        image_url: props.originalImage,
        upscale_factor: upscaleFactor.value,
        response_format: responseFormat.value,
        original_image_id: props.imageId
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Upscale failed')
    }

    console.log('Upscale successful:', result)
    upscaleResult.value = result

    // 성공 알림
    emit('success', result)

  } catch (error) {
    console.error('Upscale error:', error)
    alert(`이미지 업스케일 실패: ${error.message}`)
  } finally {
    processing.value = false
  }
}

const downloadUpscaled = async () => {
  if (!upscaleResult.value?.upscaled_url) return

  try {
    const response = await fetch(upscaleResult.value.upscaled_url)
    const blob = await response.blob()
    
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `upscaled_${upscaleFactor.value}x_${Date.now()}.jpg`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    console.log('Upscaled image downloaded successfully')
  } catch (error) {
    console.error('Download failed:', error)
    alert('다운로드에 실패했습니다.')
  }
}

const copyUpscaledUrl = async () => {
  if (!upscaleResult.value?.upscaled_url) return

  try {
    await navigator.clipboard.writeText(upscaleResult.value.upscaled_url)
    alert('이미지 URL이 클립보드에 복사되었습니다.')
  } catch (error) {
    console.error('Copy failed:', error)
    
    // Fallback: 텍스트 선택
    const textArea = document.createElement('textarea')
    textArea.value = upscaleResult.value.upscaled_url
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

.image-preview,
.result-preview {
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

.image-preview img,
.result-preview img {
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

.scale-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scale-option {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.scale-option:hover {
  border-color: #6366f1;
  background: #f8fafc;
}

.scale-option.active {
  border-color: #6366f1;
  background: #f0f4ff;
}

.scale-option input[type="radio"] {
  margin-right: 12px;
  width: 16px;
  height: 16px;
}

.scale-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scale-label strong {
  font-size: 16px;
  color: #111827;
}

.scale-label small {
  font-size: 13px;
  color: #6b7280;
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
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
}

.info-card h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
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
  color: #475569;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
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
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
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
  
  .scale-options {
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