<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>커스텀 스타일 생성</h3>
        <button @click="close" class="btn-close"><X :size="20" /></button>
      </div>

      <div class="modal-body">
        <!-- 스타일 정보 입력 -->
        <div class="style-info-section">
          <h4>스타일 정보</h4>
          <div class="form-group">
            <label>스타일 이름 *</label>
            <input 
              v-model="styleName" 
              type="text" 
              class="form-input"
              placeholder="예: 내 회사 로고 스타일"
              maxlength="100"
            />
          </div>
          <div class="form-group">
            <label>설명 (선택사항)</label>
            <textarea 
              v-model="description" 
              class="form-textarea"
              placeholder="스타일에 대한 간단한 설명을 입력하세요"
              rows="3"
              maxlength="500"
            ></textarea>
          </div>
        </div>

        <!-- 이미지 업로드 섹션 -->
        <div class="images-section">
          <h4>참조 이미지 (1-5개)</h4>
          <p class="section-description">
            스타일을 학습할 이미지들을 업로드하세요. 비슷한 스타일의 이미지를 2-5개 업로드하면 더 좋은 결과를 얻을 수 있습니다.
          </p>
          
          <!-- 이미지 업로드 영역 -->
          <div class="upload-area">
            <div 
              v-for="(slot, index) in imageSlots" 
              :key="index"
              class="image-slot"
              :class="{ 'has-image': slot.file, 'is-uploading': slot.uploading }"
            >
              <!-- 이미지가 없는 경우 -->
              <div v-if="!slot.file && !slot.uploading" class="empty-slot">
                <input 
                  :ref="`fileInput${index}`"
                  type="file" 
                  accept="image/*"
                  @change="handleFileSelect($event, index)"
                  class="file-input"
                />
                <div class="upload-placeholder" @click="triggerFileInput(index)">
                  <Upload :size="32" />
                  <span>{{ index === 0 ? '첫 번째 이미지 (필수)' : `이미지 ${index + 1}` }}</span>
                  <small>JPG, PNG 파일</small>
                </div>
              </div>

              <!-- 업로드 중인 경우 -->
              <div v-else-if="slot.uploading" class="uploading-slot">
                <div class="loading-spinner"></div>
                <span>업로드 중...</span>
              </div>

              <!-- 이미지가 있는 경우 -->
              <div v-else class="image-preview">
                <img :src="slot.preview" :alt="`스타일 이미지 ${index + 1}`" />
                <div class="image-overlay">
                  <button @click="removeImage(index)" class="btn-remove">
                    <X :size="16" />
                  </button>
                  <button @click="triggerFileInput(index)" class="btn-replace">
                    <RefreshCw :size="16" />
                  </button>
                </div>
                <div class="image-info">
                  <small>{{ slot.file.name }}</small>
                </div>
              </div>
            </div>
          </div>

          <div class="upload-help">
            <p><strong>팁:</strong></p>
            <ul>
              <li>비슷한 스타일이나 색상 팔레트의 이미지를 사용하세요</li>
              <li>고해상도 이미지일수록 더 좋은 결과를 얻을 수 있습니다</li>
              <li>다양한 각도나 상황의 이미지를 포함하면 범용성이 높아집니다</li>
            </ul>
          </div>
        </div>

        <!-- 스타일 생성 결과 -->
        <div v-if="createdStyle" class="result-section">
          <h4>스타일 생성 완료</h4>
          <div class="style-result">
            <div class="result-info">
              <p><strong>스타일 ID:</strong> {{ createdStyle.style_id }}</p>
              <p><strong>이름:</strong> {{ createdStyle.style_name }}</p>
              <p v-if="createdStyle.description"><strong>설명:</strong> {{ createdStyle.description }}</p>
              <p><strong>사용된 이미지:</strong> {{ createdStyle.image_count }}개</p>
              <p><strong>크레딧 비용:</strong> {{ createdStyle.credit_cost }} 크레딧</p>
            </div>
            <div class="result-actions">
              <button @click="useStyleForGeneration" class="btn-primary">
                <Palette :size="16" /> 이 스타일로 이미지 생성하기
              </button>
              <button @click="copyStyleId" class="btn-secondary">
                <Copy :size="16" /> 스타일 ID 복사
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-secondary">취소</button>
        <button 
          @click="createStyle" 
          class="btn-primary"
          :disabled="!canCreateStyle || processing"
        >
          <span v-if="processing">생성 중...</span>
          <span v-else>스타일 생성하기 (100 크레딧)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { X, Upload, RefreshCw, Copy, Palette } from 'lucide-vue-next'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close', 'style-created', 'use-style'])

// 상태 관리
const processing = ref(false)
const styleName = ref('')
const description = ref('')
const createdStyle = ref(null)

// 이미지 슬롯 (최대 5개)
const imageSlots = ref([
  { file: null, preview: null, uploading: false },
  { file: null, preview: null, uploading: false },
  { file: null, preview: null, uploading: false },
  { file: null, preview: null, uploading: false },
  { file: null, preview: null, uploading: false }
])

// Computed
const canCreateStyle = computed(() => {
  return styleName.value.trim() && 
         imageSlots.value.some(slot => slot.file) && 
         !processing.value
})

const uploadedImages = computed(() => {
  return imageSlots.value.filter(slot => slot.file)
})

// Methods
const close = () => {
  resetForm()
  emit('close')
}

const resetForm = () => {
  styleName.value = ''
  description.value = ''
  createdStyle.value = null
  imageSlots.value.forEach(slot => {
    if (slot.preview && slot.preview.startsWith('blob:')) {
      URL.revokeObjectURL(slot.preview)
    }
    slot.file = null
    slot.preview = null
    slot.uploading = false
  })
}

const triggerFileInput = (index) => {
  const input = document.querySelector(`input[type="file"]:nth-of-type(${index + 1})`)
  if (input) {
    input.click()
  }
}

const handleFileSelect = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return

  // 파일 타입 검증
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드 가능합니다.')
    return
  }

  // 파일 크기 검증 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert('파일 크기는 10MB 이하여야 합니다.')
    return
  }

  imageSlots.value[index].uploading = true

  try {
    // 이미지 미리보기 생성
    const preview = URL.createObjectURL(file)
    
    await nextTick()
    
    imageSlots.value[index] = {
      file: file,
      preview: preview,
      uploading: false
    }

    console.log(`Image ${index + 1} selected:`, file.name)
    
  } catch (error) {
    console.error(`Failed to process image ${index + 1}:`, error)
    alert(`이미지 처리 실패: ${error.message}`)
    imageSlots.value[index].uploading = false
  }

  // 입력 초기화
  event.target.value = ''
}

const removeImage = (index) => {
  const slot = imageSlots.value[index]
  if (slot.preview && slot.preview.startsWith('blob:')) {
    URL.revokeObjectURL(slot.preview)
  }
  imageSlots.value[index] = { file: null, preview: null, uploading: false }
}

const uploadImagesToStorage = async () => {
  const uploadedUrls = []
  
  for (let i = 0; i < imageSlots.value.length; i++) {
    const slot = imageSlots.value[i]
    if (!slot.file) continue

    try {
      const fileName = `style_${Date.now()}_${i + 1}_${slot.file.name}`
      const filePath = `temp_styles/${fileName}`

      const { data, error } = await supabase.storage
        .from('projects')
        .upload(filePath, slot.file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from('projects')
        .getPublicUrl(filePath)

      uploadedUrls.push(urlData.publicUrl)
      console.log(`Image ${i + 1} uploaded:`, urlData.publicUrl)

    } catch (error) {
      console.error(`Failed to upload image ${i + 1}:`, error)
      throw new Error(`이미지 ${i + 1} 업로드 실패: ${error.message}`)
    }
  }

  return uploadedUrls
}

const createStyle = async () => {
  if (!canCreateStyle.value) return

  processing.value = true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }

    console.log('Starting style creation...')
    console.log('Style name:', styleName.value)
    console.log('Images:', uploadedImages.value.length)

    // 이미지들을 Supabase Storage에 업로드
    const imageUrls = await uploadImagesToStorage()

    // Recraft API 호출
    const response = await fetch('/.netlify/functions/createRecraftStyle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        style_name: styleName.value,
        description: description.value || null,
        image_urls: imageUrls
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Style creation failed')
    }

    console.log('Style creation successful:', result)
    createdStyle.value = result

    // 성공 알림
    emit('style-created', result)

  } catch (error) {
    console.error('Style creation error:', error)
    alert(`스타일 생성 실패: ${error.message}`)
  } finally {
    processing.value = false
  }
}

const useStyleForGeneration = () => {
  if (createdStyle.value) {
    emit('use-style', createdStyle.value)
    close()
  }
}

const copyStyleId = async () => {
  if (!createdStyle.value?.style_id) return

  try {
    await navigator.clipboard.writeText(createdStyle.value.style_id)
    alert('스타일 ID가 클립보드에 복사되었습니다.')
  } catch (error) {
    console.error('Copy failed:', error)
    
    // Fallback
    const textArea = document.createElement('textarea')
    textArea.value = createdStyle.value.style_id
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    alert('스타일 ID가 클립보드에 복사되었습니다.')
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
  max-width: 800px;
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

.style-info-section,
.images-section,
.result-section {
  margin-bottom: 24px;
}

.style-info-section h4,
.images-section h4,
.result-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.section-description {
  color: #6b7280;
  font-size: 14px;
  margin: 8px 0 16px 0;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  ring: 2px;
  ring-color: rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.upload-area {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.image-slot {
  aspect-ratio: 1;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
}

.image-slot.has-image {
  border-style: solid;
  border-color: #3b82f6;
}

.file-input {
  display: none;
}

.empty-slot {
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 16px;
  text-align: center;
}

.upload-placeholder:hover {
  background: #f9fafb;
  border-color: #3b82f6;
}

.upload-placeholder span {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.upload-placeholder small {
  font-size: 11px;
  color: #6b7280;
}

.uploading-slot {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f9fafb;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.image-preview {
  width: 100%;
  height: 100%;
  position: relative;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.btn-remove,
.btn-replace {
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-remove:hover {
  background: rgba(239, 68, 68, 0.8);
}

.btn-replace:hover {
  background: rgba(59, 130, 246, 0.8);
}

.image-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-help {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px;
}

.upload-help p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #0f172a;
}

.upload-help ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.upload-help li {
  font-size: 13px;
  color: #475569;
  line-height: 1.4;
  margin-bottom: 4px;
}

.result-section {
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

.btn-primary:hover:not(:disabled) {
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
  
  .upload-area {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
  
  .result-actions {
    flex-direction: column;
  }
  
  .result-actions button {
    width: 100%;
  }
}
</style>