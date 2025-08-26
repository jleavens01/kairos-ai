<template>
  <div v-if="isOpen" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ characterName }} 이미지 선택</h3>
        <button @click="close" class="btn-close">✕</button>
      </div>
      
      <div class="modal-body">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>이미지를 불러오는 중...</p>
        </div>
        
        <div v-else-if="characterImages.length === 0" class="empty-state">
          <p>이 캐릭터의 이미지가 없습니다.</p>
        </div>
        
        <div v-else class="image-grid">
          <div 
            v-for="image in characterImages" 
            :key="image.id"
            class="image-item"
            :class="{ selected: selectedImageId === image.id }"
            @click="selectImage(image)"
          >
            <img 
              :src="image.thumbnail_url || image.storage_image_url || image.result_image_url" 
              :alt="characterName"
            />
            <div class="image-info">
              <span class="date">{{ formatDate(image.created_at) }}</span>
              <span v-if="selectedImageId === image.id" class="selected-badge">✓ 선택됨</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-cancel">취소</button>
        <button @click="confirmSelection" class="btn-confirm" :disabled="!selectedImageId">
          선택 완료
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  characterName: {
    type: String,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  currentImageUrl: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'select'])

const loading = ref(false)
const characterImages = ref([])
const selectedImageId = ref(null)

// 모달이 열릴 때 이미지 로드
watch(() => props.isOpen, async (newValue) => {
  if (newValue) {
    await loadCharacterImages()
  }
})

const loadCharacterImages = async () => {
  loading.value = true
  selectedImageId.value = null
  
  try {
    const { data, error } = await supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('element_name', props.characterName)
      .eq('image_type', 'character')
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    characterImages.value = data || []
    
    // 현재 선택된 이미지 찾기
    if (props.currentImageUrl) {
      const currentImage = characterImages.value.find(img => 
        img.thumbnail_url === props.currentImageUrl ||
        img.storage_image_url === props.currentImageUrl ||
        img.result_image_url === props.currentImageUrl
      )
      if (currentImage) {
        selectedImageId.value = currentImage.id
      }
    }
    
    // 현재 선택된 이미지가 없으면 첫 번째 이미지 선택
    if (!selectedImageId.value && characterImages.value.length > 0) {
      selectedImageId.value = characterImages.value[0].id
    }
  } catch (error) {
    console.error('Failed to load character images:', error)
    characterImages.value = []
  } finally {
    loading.value = false
  }
}

const selectImage = (image) => {
  selectedImageId.value = image.id
}

const confirmSelection = () => {
  const selectedImage = characterImages.value.find(img => img.id === selectedImageId.value)
  if (selectedImage) {
    const imageUrl = selectedImage.thumbnail_url || selectedImage.storage_image_url || selectedImage.result_image_url
    emit('select', {
      characterName: props.characterName,
      imageUrl,
      imageId: selectedImage.id
    })
  }
  close()
}

const close = () => {
  emit('close')
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.btn-close:hover {
  background: var(--bg-secondary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.image-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  background: var(--bg-secondary);
}

.image-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.image-item.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2);
}

.image-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}

.image-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
}

.selected-badge {
  background: var(--primary-color);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--bg-tertiary);
}

.btn-confirm {
  background: var(--primary-color);
  border: none;
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
}
</style>