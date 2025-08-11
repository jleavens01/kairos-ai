<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>🏷️ 태그 편집</h3>
        <button @click="$emit('close')" class="btn-close">✕</button>
      </div>

      <div class="modal-body">
        <!-- 이미지 미리보기 -->
        <div class="image-preview">
          <img 
            :src="image.thumbnail_url || image.storage_image_url" 
            :alt="image.element_name"
          />
        </div>

        <!-- 현재 태그 -->
        <div class="tag-section">
          <h4>현재 태그</h4>
          <div class="tags-container">
            <div 
              v-for="(tag, index) in currentTags" 
              :key="index"
              class="tag-item"
            >
              <span>{{ tag }}</span>
              <button @click="removeTag(index)" class="btn-remove-tag">×</button>
            </div>
            <div v-if="currentTags.length === 0" class="no-tags">
              태그가 없습니다
            </div>
          </div>
        </div>

        <!-- 태그 추가 -->
        <div class="tag-input-section">
          <input 
            v-model="newTag"
            @keydown.enter="addTag"
            type="text"
            placeholder="새 태그 입력 (Enter로 추가)"
            class="tag-input"
          />
          <button @click="addTag" class="btn-add-tag">추가</button>
        </div>

        <!-- AI 태그 추천 -->
        <div class="ai-section">
          <button 
            @click="extractTagsWithAI" 
            :disabled="extracting"
            class="btn-ai-extract"
          >
            {{ extracting ? '분석 중...' : '🤖 AI로 태그 추출' }}
          </button>
          
          <div v-if="suggestedTags.length > 0" class="suggested-tags">
            <h4>AI 추천 태그</h4>
            <div class="tags-container">
              <button 
                v-for="(tag, index) in suggestedTags" 
                :key="index"
                @click="addSuggestedTag(tag)"
                class="suggested-tag"
                :disabled="currentTags.includes(tag)"
              >
                {{ tag }}
                <span v-if="!currentTags.includes(tag)">+</span>
                <span v-else>✓</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="btn-secondary">취소</button>
        <button @click="saveTags" class="btn-primary" :disabled="saving">
          {{ saving ? '저장 중...' : '저장' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  show: Boolean,
  image: Object
})

const emit = defineEmits(['close', 'success'])

// State
const currentTags = ref([...(props.image?.tags || [])])
const newTag = ref('')
const suggestedTags = ref([])
const extracting = ref(false)
const saving = ref(false)

// Methods
const addTag = () => {
  const tag = newTag.value.trim().toLowerCase()
  if (tag && !currentTags.value.includes(tag)) {
    currentTags.value.push(tag)
    newTag.value = ''
  }
}

const removeTag = (index) => {
  currentTags.value.splice(index, 1)
}

const addSuggestedTag = (tag) => {
  if (!currentTags.value.includes(tag)) {
    currentTags.value.push(tag)
  }
}

const extractTagsWithAI = async () => {
  extracting.value = true
  suggestedTags.value = []
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    
    const response = await fetch('/.netlify/functions/extractImageTags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        imageUrl: props.image.storage_image_url || props.image.result_image_url,
        imageId: props.image.id
      })
    })
    
    if (!response.ok) throw new Error('Failed to extract tags')
    
    const result = await response.json()
    if (result.tags && Array.isArray(result.tags)) {
      suggestedTags.value = result.tags.filter(tag => !currentTags.value.includes(tag))
    }
  } catch (error) {
    console.error('태그 추출 실패:', error)
    alert('AI 태그 추출에 실패했습니다.')
  } finally {
    extracting.value = false
  }
}

const saveTags = async () => {
  saving.value = true
  
  try {
    const { error } = await supabase
      .from('gen_images')
      .update({ 
        tags: currentTags.value,
        updated_at: new Date().toISOString()
      })
      .eq('id', props.image.id)
    
    if (error) throw error
    
    emit('success', currentTags.value)
    emit('close')
  } catch (error) {
    console.error('태그 저장 실패:', error)
    alert('태그 저장에 실패했습니다.')
  } finally {
    saving.value = false
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
  z-index: 1000;
  animation: fadeIn 0.2s;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.3s;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.image-preview {
  width: 100%;
  max-height: 200px;
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tag-section {
  margin-bottom: 20px;
}

.tag-section h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.9rem;
}

.btn-remove-tag {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  transition: color 0.2s;
}

.btn-remove-tag:hover {
  color: var(--error);
}

.no-tags {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  font-style: italic;
}

.tag-input-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tag-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.tag-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.btn-add-tag {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-tag:hover {
  background: var(--primary-dark);
}

.ai-section {
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-ai-extract {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.btn-ai-extract:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-ai-extract:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.suggested-tags {
  margin-top: 16px;
}

.suggested-tags h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.suggested-tag {
  padding: 6px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.suggested-tag:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.suggested-tag:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>