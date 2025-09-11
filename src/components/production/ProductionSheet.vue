<template>
  <div class="production-sheet-container">
    <!-- 원고 입력 영역 -->
    <div v-if="!hasScenes" class="empty-production">
      <div class="empty-icon">📄</div>
      <h4>원고를 입력하여 스토리보드를 생성하세요</h4>
      <p>1단계: AI가 원고를 분석하여 씬을 나눕니다.<br>2단계: 선택된 씬에서 캐릭터를 추출합니다.</p>
      <button v-if="canEdit" @click="handleOpenScriptInput" class="btn-primary-large">
        원고 입력 시작
      </button>
    </div>
    
    <!-- 스토리보드 영역 -->
    <div v-else class="production-content">
      <!-- 스토리보드 테이블 -->
      <ProductionTable 
        :scenes="scenes"
        :selected-scenes="selectedScenes"
        :project-id="projectId"
        :can-edit="canEdit"
        @update:selected="updateSelectedScenes"
        @edit-scene="handleEditScene"
        @add-scene="handleAddScene"
        @delete-scene="handleDeleteScene"
        @update-scene="handleUpdateScene"
        @character-extraction="handleOpenCharacterExtraction"
        @open-news-collector="handleOpenNewsCollector"
      />
    </div>

    <!-- 원고 입력 모달 -->
    <ScriptInputModal
      v-if="showScriptModal"
      :show="showScriptModal"
      :project-id="projectId"
      @close="showScriptModal = false"
      @success="handleScriptAnalyzed"
    />
    
    <!-- 캐릭터 추출 모달 -->
    <CharacterExtractionModal
      v-if="showCharacterModal"
      :show="showCharacterModal"
      :project-id="projectId"
      :scenes="scenes"
      :selected-scene-ids="selectedScenes"
      @close="showCharacterModal = false"
      @success="handleCharactersExtracted"
    />
    
    <!-- AI 뉴스 수집 모달 -->
    <div v-if="showNewsModal" class="modal-overlay" @click.self="showNewsModal = false">
      <div class="modal-container news-collector-modal">
        <div class="modal-header">
          <h2>AI 콘텐츠 제작 시스템</h2>
          <button @click="showNewsModal = false" class="close-btn">
            ✕
          </button>
        </div>
        <div class="modal-body">
          <NewsCollector />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProductionStore } from '@/stores/production'
import ScriptInputModal from './ScriptInputModal.vue'
import ProductionTable from './ProductionTable.vue'
import CharacterExtractionModal from './CharacterExtractionModal.vue'
import NewsCollector from './NewsCollector.vue'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  canEdit: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update'])

const productionStore = useProductionStore()

// State
const showScriptModal = ref(false)
const showCharacterModal = ref(false)
const showNewsModal = ref(false)
const selectedScenes = ref([])

// Computed - store의 데이터를 직접 사용
const scenes = computed(() => productionStore.productionSheets)
const hasScenes = computed(() => scenes.value.length > 0)

// Methods
const handleOpenScriptInput = () => {
  showScriptModal.value = true
}

const handleOpenCharacterExtraction = () => {
  showCharacterModal.value = true
}

const handleOpenNewsCollector = () => {
  showNewsModal.value = true
}

const handleScriptAnalyzed = async (data) => {
  showScriptModal.value = false
  emit('update')
  
  // 스토어 업데이트
  await loadProductionData()
  
  // 1단계 분석이 성공적이므로 캐릭터 추출 모달 자동 표시 제거
  // 필요시 수동으로 캐릭터 추출 가능
}

const handleCharactersExtracted = async (data) => {
  showCharacterModal.value = false
  emit('update')
  
  // 스토어 업데이트
  await loadProductionData()
}

const updateSelectedScenes = (selected) => {
  selectedScenes.value = selected
}

const handleEditScene = (scene) => {
  console.log('씬 편집:', scene)
  // TODO: 씬 편집 로직 구현
}

const handleAddScene = async (scene) => {
  // 씬 추가 후 목록 새로고침
  await loadProductionData()
}

const handleDeleteScene = async (scene) => {
  // 씬 삭제 후 목록 새로고침
  await loadProductionData()
}

const handleUpdateScene = async (scene) => {
  // 씬 업데이트 후 다시 로드
  await loadProductionData()
}

const loadProductionData = async () => {
  if (!props.projectId) return
  
  try {
    await productionStore.fetchProductionSheets(props.projectId)
  } catch (error) {
    console.error('스토리보드 데이터 로드 실패:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadProductionData()
})

// projectId 변경 감지
watch(() => props.projectId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    // 스토어 초기화 및 새 데이터 로드
    productionStore.clearProductionData()
    await loadProductionData()
  }
})

// Expose method for parent component
defineExpose({
  openScriptInput: handleOpenScriptInput
})
</script>

<style scoped>
.production-sheet-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.production-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.production-actions {
  display: flex;
  gap: 10px;
  padding: 0 20px;
}

.btn-secondary {
  padding: 10px 20px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-secondary:hover {
  background-color: var(--bg-primary);
  border-color: var(--primary-color);
}

.btn-primary {
  padding: 10px 20px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-production {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-production h4 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.empty-production p {
  color: var(--text-secondary);
  margin-bottom: 30px;
  max-width: 500px;
}

.btn-primary-large {
  padding: 15px 35px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .btn-primary-large {
    width: 100%;
  }
}

/* 모달 스타일 */
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

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.news-collector-modal {
  width: 90vw;
  max-width: 1400px;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

.close-btn {
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
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.btn-ai-news {
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-ai-news:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>