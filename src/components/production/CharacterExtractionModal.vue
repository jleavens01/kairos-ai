<template>
  <div v-if="show" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>👥 캐릭터 추출 (2단계)</h2>
        <button class="close-button" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <!-- 씬 선택 영역 -->
        <div class="scene-selection">
          <div class="selection-header">
            <h3>캐릭터 추출할 씬 선택</h3>
            <div class="selection-controls">
              <button @click="selectAll" class="btn-select-all">
                전체 선택
              </button>
              <button @click="deselectAll" class="btn-deselect-all">
                전체 해제
              </button>
            </div>
          </div>
          
          <div class="scene-list">
            <div 
              v-for="scene in scenes" 
              :key="scene.id"
              class="scene-item"
              :class="{ selected: selectedScenes.includes(scene.id) }"
            >
              <input 
                type="checkbox"
                :id="`scene-${scene.id}`"
                :checked="selectedScenes.includes(scene.id)"
                @change="toggleScene(scene.id)"
                :disabled="loading"
              />
              <label :for="`scene-${scene.id}`" class="scene-label">
                <div class="scene-number">씬 {{ scene.scene_number }}</div>
                <div class="scene-text">{{ scene.original_script_text }}</div>
                <div v-if="scene.characters && scene.characters.length > 0" class="existing-characters">
                  <span class="char-badge" v-for="char in scene.characters" :key="char">
                    {{ char }}
                  </span>
                </div>
              </label>
            </div>
          </div>
          
          <div class="selection-info">
            {{ selectedScenes.length }}개 씬 선택됨
          </div>
        </div>
        
        <!-- 기존 캐릭터 리스트 표시 -->
        <div v-if="existingCharacters.length > 0" class="existing-characters-section">
          <h3>기존 캐릭터 리스트</h3>
          <p class="hint-text">아래 캐릭터들이 이미 프로젝트에 등록되어 있습니다. 동일한 캐릭터는 같은 이름으로 추출됩니다.</p>
          <div class="character-grid">
            <div 
              v-for="char in existingCharacters" 
              :key="char.name || char"
              class="character-card"
            >
              <div class="char-name">{{ char.name || char }}</div>
              <div v-if="char.count" class="char-count">{{ char.count }}회 등장</div>
            </div>
          </div>
        </div>
        
        <!-- 로딩 상태 -->
        <div v-if="loading" class="loading-status">
          <div class="loading-spinner"></div>
          <p>{{ statusMessage }}</p>
        </div>
        
        <!-- 에러 메시지 -->
        <div v-if="error" class="error-message">
          <span class="error-icon">⚠️</span>
          {{ error }}
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="handleClose" class="btn-cancel" :disabled="loading">
          취소
        </button>
        <button 
          @click="handleExtract" 
          class="btn-extract"
          :disabled="loading || selectedScenes.length === 0"
        >
          {{ loading ? '추출 중...' : `${selectedScenes.length}개 씬 캐릭터 추출` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductionStore } from '@/stores/production'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: String,
    required: true
  },
  scenes: {
    type: Array,
    default: () => []
  },
  selectedSceneIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'success'])

const productionStore = useProductionStore()

// State
const selectedScenes = ref([])
const existingCharacters = ref([])
const loading = ref(false)
const error = ref('')
const statusMessage = ref('')

// Methods
const handleClose = () => {
  if (!loading.value) {
    emit('close')
    // Reset form
    selectedScenes.value = []
    error.value = ''
    statusMessage.value = ''
  }
}

const toggleScene = (sceneId) => {
  const index = selectedScenes.value.indexOf(sceneId)
  if (index > -1) {
    selectedScenes.value.splice(index, 1)
  } else {
    selectedScenes.value.push(sceneId)
  }
}

const selectAll = () => {
  selectedScenes.value = props.scenes.map(scene => scene.id)
}

const deselectAll = () => {
  selectedScenes.value = []
}

const handleExtract = async () => {
  if (selectedScenes.value.length === 0) {
    error.value = '캐릭터를 추출할 씬을 선택해주세요.'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    // 씬이 많은 경우 배치로 나누어 처리 (한 번에 최대 20개씩)
    const BATCH_SIZE = 20
    const totalScenes = selectedScenes.value.length
    const batches = []
    
    for (let i = 0; i < totalScenes; i += BATCH_SIZE) {
      batches.push(selectedScenes.value.slice(i, i + BATCH_SIZE))
    }
    
    let processedCount = 0
    const allResults = []
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      statusMessage.value = `캐릭터 추출 중... (${processedCount + 1}-${Math.min(processedCount + batch.length, totalScenes)} / ${totalScenes}개 씬)`
      
      const result = await productionStore.extractCharacters(
        props.projectId,
        batch,
        existingCharacters.value
      )
      
      if (result.success) {
        allResults.push(result.data)
        processedCount += batch.length
      } else {
        throw new Error(result.error || `배치 ${i + 1} 처리 중 오류가 발생했습니다.`)
      }
      
      // 다음 배치 처리 전 잠시 대기 (서버 부하 방지)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    statusMessage.value = '캐릭터 추출이 완료되었습니다!'
    setTimeout(() => {
      emit('success', allResults)
    }, 500)
  } catch (err) {
    console.error('캐릭터 추출 실패:', err)
    error.value = err.message || '캐릭터 추출에 실패했습니다. 다시 시도해주세요.'
  } finally {
    loading.value = false
  }
}

// 기존 캐릭터 리스트 로드
onMounted(async () => {
  if (props.projectId) {
    existingCharacters.value = await productionStore.getProjectCharacters(props.projectId)
  }
  
  // 부모 컴포넌트에서 전달받은 선택된 씬들을 사용
  if (props.selectedSceneIds && props.selectedSceneIds.length > 0) {
    selectedScenes.value = [...props.selectedSceneIds]
  } else {
    // 선택된 씬이 없으면 캐릭터가 없는 씬만 기본 선택
    selectedScenes.value = props.scenes
      .filter(scene => !scene.characters || scene.characters.length === 0)
      .map(scene => scene.id)
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
  max-width: 800px;
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
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scene-selection {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selection-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.selection-controls {
  display: flex;
  gap: 10px;
}

.btn-select-all, .btn-deselect-all {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 5px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-select-all:hover, .btn-deselect-all:hover {
  background-color: var(--bg-primary);
  border-color: var(--primary-color);
}

.scene-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 10px;
  background-color: var(--bg-secondary);
}

.scene-item {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background-color: var(--bg-primary);
  transition: all 0.2s;
}

.scene-item.selected {
  background-color: rgba(74, 222, 128, 0.1);
  border-color: var(--primary-color);
}

.scene-item:last-child {
  margin-bottom: 0;
}

.scene-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
  padding-left: 25px;
  position: relative;
}

.scene-item input[type="checkbox"] {
  position: absolute;
  left: 10px;
  top: 15px;
  cursor: pointer;
}

.scene-number {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 0.9rem;
}

.scene-text {
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.4;
}

.existing-characters {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 5px;
}

.char-badge {
  padding: 2px 8px;
  background-color: rgba(74, 222, 128, 0.2);
  color: var(--primary-color);
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: 500;
}

.selection-info {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.existing-characters-section {
  padding: 15px;
  background-color: var(--bg-secondary);
  border-radius: 5px;
}

.existing-characters-section h3 {
  margin: 0 0 10px 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.hint-text {
  margin: 0 0 15px 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.character-card {
  padding: 10px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  text-align: center;
}

.char-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.char-count {
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-top: 3px;
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
  margin: 0;
  font-size: 0.95rem;
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

.btn-cancel, .btn-extract {
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

.btn-extract {
  background: var(--primary-gradient);
  color: white;
}

.btn-extract:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.btn-cancel:disabled, .btn-extract:disabled {
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
  
  .scene-list {
    max-height: 200px;
  }
  
  .character-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>