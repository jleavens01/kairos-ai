<template>
  <div class="production-sheet-container">
    <!-- 원고 입력 영역 -->
    <div v-if="!hasScenes" class="empty-production">
      <div class="empty-icon">📄</div>
      <h4>원고를 입력하여 스토리보드를 생성하세요</h4>
      <p>AI가 원고를 분석하여 씬을 나누고, 캐릭터와 배경을 추출합니다.</p>
      <button @click="handleOpenScriptInput" class="btn-primary-large">
        원고 입력 시작
      </button>
    </div>
    
    <!-- 스토리보드 테이블 -->
    <ProductionTable 
      v-else 
        :scenes="scenes"
        :selected-scenes="selectedScenes"
        :project-id="projectId"
        @update:selected="updateSelectedScenes"
        @edit-scene="handleEditScene"
        @add-scene="handleAddScene"
        @delete-scene="handleDeleteScene"
        @update-scene="handleUpdateScene"
      />

    <!-- 원고 입력 모달 -->
    <ScriptInputModal
      v-if="showScriptModal"
      :show="showScriptModal"
      :project-id="projectId"
      @close="showScriptModal = false"
      @success="handleScriptAnalyzed"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProductionStore } from '@/stores/production'
import ScriptInputModal from './ScriptInputModal.vue'
import ProductionTable from './ProductionTable.vue'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update'])

const productionStore = useProductionStore()

// State
const showScriptModal = ref(false)
const selectedScenes = ref([])

// Computed - store의 데이터를 직접 사용
const scenes = computed(() => productionStore.productionSheets)
const hasScenes = computed(() => scenes.value.length > 0)

// Methods
const handleOpenScriptInput = () => {
  showScriptModal.value = true
}

const handleScriptAnalyzed = async (data) => {
  showScriptModal.value = false
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
</style>