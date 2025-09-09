<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>🔗 스토리보드 씬에 연결</h3>
        <button @click="close" class="btn-close">✕</button>
      </div>

      <div class="modal-body">
        <div class="media-preview">
          <img 
            v-if="mediaType === 'image'"
            :src="media.thumbnail_url || media.storage_image_url || media.result_image_url || media.image_url" 
            :alt="media.prompt_used || media.prompt" 
          />
          <video 
            v-else-if="mediaType === 'video'"
            :src="media.storage_video_url"
            :poster="media.thumbnail_url"
            controls
            class="preview-video"
          ></video>
        </div>

        <div class="form-group">
          <label>연결할 씬 선택</label>
          <select v-model="selectedSceneId" class="form-select">
            <option value="">씬을 선택하세요...</option>
            <option 
              v-for="scene in scenes" 
              :key="scene.id"
              :value="scene.id"
            >
              씬 {{ scene.scene_number }}: {{ truncateText(scene.original_script_text, 50) }}
            </option>
          </select>
        </div>

        <div v-if="selectedScene" class="scene-preview">
          <h4>선택한 씬 정보</h4>
          <p><strong>씬 번호:</strong> {{ selectedScene.scene_number }}</p>
          <p><strong>스크립트:</strong> {{ selectedScene.original_script_text }}</p>
          <p v-if="selectedScene.characters?.length">
            <strong>등장인물:</strong> {{ selectedScene.characters.join(', ') }}
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn-secondary">취소</button>
        <button 
          @click="connectToScene" 
          class="btn-primary"
          :disabled="!selectedSceneId"
        >
          연결하기
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductionStore } from '@/stores/production'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  media: {
    type: Object,
    required: true
  },
  mediaType: {
    type: String,
    default: 'image',
    validator: (value) => ['image', 'video'].includes(value)
  },
  projectId: {
    type: String,
    required: false
  }
})

const emit = defineEmits(['close', 'success'])

const productionStore = useProductionStore()

// State
const selectedSceneId = ref('')

// Computed
const scenes = computed(() => productionStore.productionSheets)

const selectedScene = computed(() => {
  if (!selectedSceneId.value) return null
  return scenes.value.find(scene => scene.id === selectedSceneId.value)
})

// Methods
const close = () => {
  emit('close')
}

const connectToScene = async () => {
  if (!selectedSceneId.value || !selectedScene.value) return
  
  try {
    // 씬에 미디어 URL 업데이트
    const updateData = {}
    if (props.mediaType === 'image') {
      updateData.scene_image_url = props.media.storage_image_url || props.media.result_image_url || props.media.image_url
      updateData.scene_media_type = 'image'
      console.log('Image URL to update:', {
        storage_image_url: props.media.storage_image_url,
        result_image_url: props.media.result_image_url,
        image_url: props.media.image_url,
        selected: updateData.scene_image_url,
        media: props.media
      })
    } else if (props.mediaType === 'video') {
      updateData.scene_video_url = props.media.storage_video_url
      updateData.scene_media_type = 'video'
    }
    updateData.updated_at = new Date().toISOString()
    
    console.log('Updating production_sheets with:', {
      sceneId: selectedSceneId.value,
      updateData: updateData
    })
    
    const { data: updateResult, error: sceneError } = await supabase
      .from('production_sheets')
      .update(updateData)
      .eq('id', selectedSceneId.value)
      .select()
    
    console.log('Production_sheets update result:', {
      updateResult,
      error: sceneError
    })
    
    if (sceneError) throw sceneError
    
    // 미디어 테이블 업데이트 
    // gen_images는 production_sheet_id 사용
    // gen_videos는 production_sheet_id 사용 (linked_scene_id는 별도 용도)
    const mediaTable = props.mediaType === 'image' ? 'gen_images' : 'gen_videos'
    
    // 1. 먼저 해당 씬에 이미 연결된 다른 미디어들의 production_sheet_id를 null로 업데이트
    const { error: clearError } = await supabase
      .from(mediaTable)
      .update({ 
        production_sheet_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('production_sheet_id', selectedSceneId.value)
      .neq('id', props.media.id) // 현재 연결하려는 미디어는 제외
    
    if (clearError) {
      console.error('기존 연결 해제 실패:', clearError)
      // 에러가 발생해도 계속 진행
    }
    
    // 2. 현재 미디어의 production_sheet_id 업데이트
    console.log('=== 미디어 테이블 업데이트 시작 ===')
    console.log('테이블:', mediaTable)
    console.log('미디어 ID:', props.media.id)
    console.log('씬 ID:', selectedSceneId.value)
    
    const { data: mediaUpdateResult, error: mediaError } = await supabase
      .from(mediaTable)
      .update({
        production_sheet_id: selectedSceneId.value,
        updated_at: new Date().toISOString()
      })
      .eq('id', props.media.id)
      .select()
    
    console.log('미디어 업데이트 결과:', {
      result: mediaUpdateResult,
      error: mediaError
    })
    
    if (mediaError) {
      console.error('미디어 업데이트 실패:', mediaError)
      throw mediaError
    }
    
    // 업데이트 후 확인
    const { data: verifyData } = await supabase
      .from(mediaTable)
      .select('id, production_sheet_id')
      .eq('id', props.media.id)
    
    console.log('업데이트 후 확인:', verifyData)
    
    emit('success', {
      sceneId: selectedSceneId.value,
      sceneNumber: selectedScene.value.scene_number,
      mediaId: props.media.id
    })
  } catch (error) {
    console.error('씬 연결 실패:', error)
    alert('씬 연결에 실패했습니다.')
  }
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Lifecycle
onMounted(async () => {
  // 스토리보드 데이터가 없으면 로드
  if (!productionStore.productionSheets.length) {
    await productionStore.fetchProductionSheets(props.projectId)
  }
})
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
  z-index: 1000;
}

.modal-container {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
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
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.media-preview {
  width: 100%;
  max-height: 300px;
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 20px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-height: 300px;
}

.media-preview .preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-height: 300px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.scene-preview {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.scene-preview h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.scene-preview p {
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.scene-preview strong {
  color: var(--text-primary);
  font-weight: 500;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.95rem;
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
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>