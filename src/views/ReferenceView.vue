<template>
  <div class="reference-view">

    <!-- 검색 섹션 -->
    <div class="search-section">
      <ReferenceSearch 
        @search="handleSearch"
        @clear="handleClearSearch"
        :loading="referenceStore.searchLoading"
      />
    </div>

    <!-- 컨텐츠 영역 -->
    <div class="reference-content">
      <!-- 검색 결과가 있을 때 -->
      <div v-if="showSearchResults" class="search-results">
        <div class="results-header">
          <h2 class="results-title">
            '{{ referenceStore.currentSearchQuery }}' 검색 결과
            <span class="results-count">({{ referenceStore.searchResults.length }}개)</span>
          </h2>
          <button @click="handleClearSearch" class="clear-results-btn">
            <X :size="16" />
            검색 결과 지우기
          </button>
        </div>
        
        <ReferenceGallery 
          :materials="searchResultsWithSaveStatus"
          :show-save-button="true"
          @save="handleSaveMaterial"
          @view="handleViewMaterial"
        />
      </div>

      <!-- 저장된 자료들 -->
      <div v-else class="saved-materials">
        <!-- 저장된 자료 갤러리 -->
        <div v-if="referenceStore.loading" class="loading-state">
          <div class="spinner"></div>
          <p>자료를 불러오는 중...</p>
        </div>

        <div v-else-if="referenceStore.materials.length === 0" class="empty-state">
          <FileText :size="64" class="empty-icon" />
          <h3>저장된 자료가 없습니다</h3>
          <p>위의 검색 기능을 사용하여 레퍼런스 자료를 찾아보세요.</p>
        </div>

        <ReferenceGallery 
          v-else
          :materials="referenceStore.materials"
          :show-save-button="false"
          @favorite="handleToggleFavorite"
          @delete="handleDeleteMaterial"
          @view="handleViewMaterial"
        />
      </div>
    </div>

    <!-- 상세보기 모달 -->
    <ReferenceDetailModal 
      v-if="showDetailModal"
      :material="selectedMaterial"
      @close="handleCloseDetail"
      @favorite="handleToggleFavorite"
      @delete="handleDeleteMaterial"
      @save="handleUpdateMaterial"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useReferenceStore } from '@/stores/reference'
import { useProjectsStore } from '@/stores/projects'
import { useRoute } from 'vue-router'
import { X, FileText } from 'lucide-vue-next'

// 컴포넌트 import
import ReferenceSearch from '@/components/reference/ReferenceSearch.vue'
import ReferenceGallery from '@/components/reference/ReferenceGallery.vue'
import ReferenceDetailModal from '@/components/reference/ReferenceDetailModal.vue'

// Props
const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const referenceStore = useReferenceStore()
const projectsStore = useProjectsStore()
const route = useRoute()

// 반응형 데이터
const showDetailModal = ref(false)
const selectedMaterial = ref(null)

// 컴퓨티드
const showSearchResults = computed(() => 
  referenceStore.searchResults.length > 0 || 
  referenceStore.currentSearchQuery.length > 0
)

// 검색 결과에 저장 상태 추가
const searchResultsWithSaveStatus = computed(() => {
  return referenceStore.searchResults.map(result => {
    // 이미 저장된 자료인지 확인 (storage_url로 비교)
    const isSaved = referenceStore.materials.some(saved => 
      saved.storage_url === result.image || saved.storage_url === result.thumbnail
    )
    return {
      ...result,
      isSaved
    }
  })
})

// 메서드
const handleSearch = async (searchData) => {
  const { query, sources } = searchData
  
  // 통합 검색 - 선택된 모든 소스에서 검색
  await referenceStore.searchUnified(query, sources)
}

const handleClearSearch = () => {
  referenceStore.clearSearchResults()
}

const handleSaveMaterial = async (material) => {
  // 프로젝트 ID를 props에서 가져옴
  const projectId = props.projectId
  
  // metadata 객체 구성 (라이선스, 이미지 정보, 속성 등 포함)
  const metadata = {
    license: material.license || null,
    imageMetadata: material.imageMetadata || null,
    attribution: material.attribution || null,
    originalData: {
      pageTitle: material.pageTitle,
      isMainImage: material.isMainImage,
      language: material.language
    }
  }
  
  const materialData = {
    project_id: projectId,
    title: material.title,
    source_type: material.source_type,
    source_url: material.url || material.source_url,
    storage_url: material.image || material.thumbnail,  // image_url 대신 storage_url 사용
    thumbnail_url: material.thumbnail || material.image,
    metadata: metadata,
    is_favorite: false,
    production_sheet_id: null,  // 나중에 스토리보드와 연결 시 사용
    connected_scenes: [],  // 나중에 씬과 연결 시 사용
    connected_characters: [],  // 나중에 캐릭터와 연결 시 사용
    usage_count: 0
  }
  
  const result = await referenceStore.saveMaterial(materialData)
  
  if (result.success) {
    // 저장 성공 후 검색 결과에서 제거하거나 표시 업데이트
    console.log('자료가 저장되었습니다.')
    // 저장된 자료 목록 새로고침
    await referenceStore.fetchMaterials(projectId)
  } else {
    console.error('자료 저장 실패:', result.error)
  }
}

const handleViewMaterial = (material) => {
  selectedMaterial.value = material
  showDetailModal.value = true
}

const handleCloseDetail = () => {
  showDetailModal.value = false
  selectedMaterial.value = null
}

const handleToggleFavorite = async (materialId) => {
  const result = await referenceStore.toggleFavorite(materialId)
  
  if (!result.success) {
    console.error('즐겨찾기 변경 실패:', result.error)
  }
}

const handleDeleteMaterial = async (materialId) => {
  if (confirm('이 자료를 삭제하시겠습니까?')) {
    const result = await referenceStore.deleteMaterial(materialId)
    
    if (result.success) {
      handleCloseDetail()
      console.log('자료가 삭제되었습니다.')
    } else {
      console.error('자료 삭제 실패:', result.error)
    }
  }
}

const handleUpdateMaterial = async (materialOrId, updates) => {
  // 검색 결과를 저장하는 경우 (material 객체가 전달됨)
  if (typeof materialOrId === 'object' && !materialOrId.id) {
    await handleSaveMaterial(materialOrId)
  } 
  // 기존 자료를 업데이트하는 경우 (ID와 updates가 전달됨)
  else if (typeof materialOrId === 'string' || typeof materialOrId === 'number') {
    const result = await referenceStore.updateMaterial(materialOrId, updates)
    
    if (!result.success) {
      console.error('자료 업데이트 실패:', result.error)
    }
  }
}

// 생명주기
onMounted(async () => {
  // props에서 projectId 가져옴
  await referenceStore.fetchMaterials(props.projectId)
})
</script>

<style scoped>
.reference-view {
  padding: 0;
  height: 100%;
  background: var(--bg-primary);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.search-section {
  width: 100%;
  margin-bottom: 1.5rem;
  padding: 1rem;
}

.reference-content {
  width: 100%;
  padding: 0 1rem;
}

/* 검색 결과 */
.search-results {
  margin-bottom: 2rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.results-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.results-count {
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-secondary);
}

.clear-results-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-results-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 필터 탭 */

/* 로딩 상태 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 빈 상태 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  margin-bottom: 1rem;
  color: var(--text-tertiary);
}

.empty-state h3 {
  font-size: 1.25rem;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  max-width: 400px;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .reference-header {
    padding: 2rem 1rem 1.5rem;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .search-section,
  .reference-content {
    padding: 0 1rem;
  }
  
  .results-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
}
</style>