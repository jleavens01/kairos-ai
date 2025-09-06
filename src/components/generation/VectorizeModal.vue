<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>벡터 변환 (SVG)</h3>
        <button @click="close" class="btn-close"><X :size="20" /></button>
      </div>

      <div class="modal-body">
        <!-- 원본 이미지 표시 -->
        <div class="original-image-section">
          <h4>원본 이미지</h4>
          <div class="image-preview">
            <img 
              v-if="originalImage"
              :src="originalImage" 
              :alt="'원본 이미지'" 
              @error="handleImageError"
              @load="handleImageLoad"
            />
            <div v-else class="no-image">
              이미지를 불러올 수 없습니다.
            </div>
          </div>
          <p class="image-info">
            이 이미지를 SVG 벡터 파일로 변환합니다.
            <br>벡터 파일은 무한 확대가 가능하고 용량이 작습니다.
          </p>
        </div>

        <!-- 변환 옵션 -->
        <div class="options-section">
          <h4>변환 옵션</h4>
          <div class="form-group">
            <label>응답 형식</label>
            <select v-model="responseFormat" class="form-select">
              <option value="url">URL 링크</option>
              <option value="b64_json">Base64 JSON</option>
            </select>
          </div>
        </div>

        <!-- 결과 미리보기 -->
        <div v-if="vectorizedResult" class="result-section">
          <h4>변환 결과</h4>
          <div class="result-preview">
            <img :src="vectorizedResult.svg_url" alt="벡터화된 이미지" />
          </div>
          <div class="result-info">
            <p><strong>형식:</strong> SVG 벡터</p>
            <p><strong>크레딧 비용:</strong> {{ vectorizedResult.credit_cost }} 크레딧</p>
            <div class="result-actions">
              <button @click="downloadSVG" class="btn-primary">
                <Download :size="16" /> SVG 다운로드
              </button>
              <button @click="copySVGUrl" class="btn-secondary">
                <Copy :size="16" /> URL 복사
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-secondary">취소</button>
        <button 
          @click="vectorizeImage" 
          class="btn-primary"
          :disabled="processing"
        >
          <span v-if="processing">변환 중...</span>
          <span v-else>벡터 변환 시작</span>
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
const responseFormat = ref('url')
const vectorizedResult = ref(null)

// Methods
const close = () => {
  emit('close')
}

const handleImageError = (event) => {
  console.error('VectorizeModal - Image load error:', {
    src: event.target.src,
    originalImage: props.originalImage,
    imageId: props.imageId
  })
}

const handleImageLoad = (event) => {
  console.log('VectorizeModal - Image loaded successfully:', {
    src: event.target.src,
    originalImage: props.originalImage,
    imageId: props.imageId
  })
}

const vectorizeImage = async () => {
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

    console.log('Starting vectorization for:', props.originalImage)

    // Recraft 벡터라이즈 API 호출
    const response = await fetch('/.netlify/functions/generateRecraftVectorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        image_url: props.originalImage,
        response_format: responseFormat.value,
        original_image_id: props.imageId
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Vectorization failed')
    }

    console.log('Vectorization successful:', result)
    vectorizedResult.value = result

    // 성공 알림
    emit('success', result)

  } catch (error) {
    console.error('Vectorization error:', error)
    alert(`벡터 변환 실패: ${error.message}`)
  } finally {
    processing.value = false
  }
}

const downloadSVG = async () => {
  if (!vectorizedResult.value?.svg_url) return

  try {
    const response = await fetch(vectorizedResult.value.svg_url)
    const blob = await response.blob()
    
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vectorized_${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    
    console.log('SVG downloaded successfully')
  } catch (error) {
    console.error('Download failed:', error)
    alert('다운로드에 실패했습니다.')
  }
}

const copySVGUrl = async () => {
  if (!vectorizedResult.value?.svg_url) return

  try {
    await navigator.clipboard.writeText(vectorizedResult.value.svg_url)
    alert('SVG URL이 클립보드에 복사되었습니다.')
  } catch (error) {
    console.error('Copy failed:', error)
    
    // Fallback: 텍스트 선택
    const textArea = document.createElement('textarea')
    textArea.value = vectorizedResult.value.svg_url
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    alert('SVG URL이 클립보드에 복사되었습니다.')
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
.result-section {
  margin-bottom: 24px;
}

.original-image-section h4,
.options-section h4,
.result-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
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

.no-image {
  color: #9ca3af;
  font-size: 14px;
  text-align: center;
  padding: 40px 20px;
}

.image-info {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-select {
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

.result-info {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
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
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
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
  
  .result-actions {
    flex-direction: column;
  }
  
  .result-actions button {
    width: 100%;
  }
}
</style>