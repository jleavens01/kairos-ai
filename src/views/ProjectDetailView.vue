<template>
  <div class="project-detail-container">
    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>프로젝트를 불러오는 중...</p>
    </div>

    <!-- 에러 상태 -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>프로젝트를 불러올 수 없습니다</h2>
      <p>{{ error }}</p>
      <router-link to="/projects" class="back-button">프로젝트 목록으로 돌아가기</router-link>
    </div>

    <!-- 프로젝트 내용 -->
    <div v-else-if="project" class="project-content">
      <!-- 메인 콘텐츠 영역 -->
      <div class="project-main">
        <!-- 탭 네비게이션 -->
        <div class="tabs">
          <div class="tabs-left">
            <button 
              v-for="tab in tabs" 
              :key="tab.id"
              @click="changeTab(tab.id)"
              :class="['tab-button', { active: activeTab === tab.id }]"
            >
              {{ isMobile ? tab.mobileLabel : tab.label }}
            </button>
          </div>
          <div class="tabs-right">
            <!-- 스토리보드 탭 액션 버튼 -->
            <button 
              v-if="activeTab === 'production'"
              @click="handleOpenScriptInput" 
              class="tab-action-btn"
            >
              원고 입력
            </button>
            <!-- 이미지 탭 액션 버튼 및 필터 -->
            <button 
              v-if="activeTab === 'generate'"
              @click="handleOpenImageGeneration" 
              class="tab-action-btn"
            >
              새 이미지
            </button>
            <button 
              v-if="activeTab === 'generate'"
              @click="toggleImageKeptView" 
              class="tab-action-btn"
              :class="{ active: showImageKeptOnly }"
            >
              <Archive :size="16" style="margin-right: 4px" />
              {{ showImageKeptOnly ? '보관함' : '전체' }}
            </button>
            <select 
              v-if="activeTab === 'generate' && !showImageKeptOnly"
              v-model="imageFilterCategory" 
              @change="handleImageFilterChange"
              class="filter-select"
            >
              <option value="">전체</option>
              <option value="character">캐릭터</option>
              <option value="background">배경</option>
              <option value="scene">씬</option>
              <option value="object">오브젝트</option>
            </select>
            <!-- 비디오 탭 액션 버튼 및 필터 -->
            <button 
              v-if="activeTab === 'media'"
              @click="handleOpenVideoGeneration" 
              class="tab-action-btn"
            >
              새 비디오
            </button>
            <button 
              v-if="activeTab === 'media'"
              @click="toggleVideoKeptView" 
              class="tab-action-btn"
              :class="{ active: showVideoKeptOnly }"
            >
              <Archive :size="16" style="margin-right: 4px" />
              {{ showVideoKeptOnly ? '보관함' : '전체' }}
            </button>
            <select 
              v-if="activeTab === 'media' && !showVideoKeptOnly"
              v-model="videoFilterModel" 
              @change="handleVideoFilterChange"
              class="filter-select"
            >
              <option value="">모든 모델</option>
              <option value="veo2">Veo 2</option>
              <option value="kling2.1">Kling 2.1</option>
              <option value="hailou02">Hailou 02</option>
              <option value="seedance">SeedDance</option>
            </select>
          </div>
        </div>

        <!-- 탭 콘텐츠 -->
        <div class="tab-content">
          <!-- 스토리보드 탭 -->
          <div v-if="activeTab === 'production'" class="production-section">
            <ProductionSheet 
              ref="productionSheetRef"
              :project-id="projectId"
              @update="handleProductionUpdate"
            />
          </div>

          <!-- 자료 탭 -->
          <div v-if="activeTab === 'reference'" class="reference-section">
            <ReferenceView 
              ref="referenceViewRef"
              :project-id="projectId"
            />
          </div>

          <!-- 이미지 탭 -->
          <div v-if="activeTab === 'generate'" class="generate-section">
            <AIGenerationGallery 
              ref="imageGalleryRef"
              :project-id="projectId" 
            />
          </div>

          <!-- 비디오 탭 -->
          <div v-if="activeTab === 'media'" class="media-section">
            <MediaView 
              ref="mediaViewRef"
              :project-id="projectId" 
            />
          </div>

          <!-- 설정 탭 -->
          <div v-if="activeTab === 'settings'" class="settings-section">
            <h3>프로젝트 설정</h3>
            <div class="settings-form">
              <div class="form-group">
                <label>프로젝트 상태</label>
                <select v-model="project.status" @change="updateStatus">
                  <option value="draft">초안</option>
                  <option value="in_progress">진행 중</option>
                  <option value="completed">완료</option>
                  <option value="archived">보관</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>
                  <input type="checkbox" v-model="project.is_public" @change="updateVisibility">
                  공개 프로젝트로 설정
                </label>
              </div>

              <div v-if="project.share_token" class="share-section">
                <label>공유 링크</label>
                <div class="share-link">
                  <input :value="shareUrl" readonly class="share-input">
                  <button @click="copyShareLink" class="btn-copy">복사</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import ProductionSheet from '@/components/production/ProductionSheet.vue'
import ReferenceView from '@/views/ReferenceView.vue'
import AIGenerationGallery from '@/components/generation/AIGenerationGallery.vue'
import MediaView from '@/components/project/MediaView.vue'
import { Archive } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const project = computed(() => projectsStore.currentProject)
const projectId = computed(() => route.params.id)
const loading = ref(true)
const error = ref('')

// URL 쿼리에서 탭 상태 가져오기 (기본값: production)
const getInitialTab = () => {
  const tabFromQuery = route.query.tab
  const validTabs = ['production', 'reference', 'generate', 'media', 'settings']
  return validTabs.includes(tabFromQuery) ? tabFromQuery : 'production'
}

const activeTab = ref(getInitialTab())
const tabs = [
  { id: 'production', label: '스토리보드', mobileLabel: '스토리보드' },
  { id: 'reference', label: '자료', mobileLabel: '자료' },
  { id: 'generate', label: '이미지', mobileLabel: '이미지' },
  { id: 'media', label: '비디오', mobileLabel: '비디오' },
  { id: 'settings', label: '설정', mobileLabel: '⚙️' }
]

// 모바일 여부 감지
const isMobile = ref(window.innerWidth <= 768)
window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth <= 768
})

// 탭 변경 함수
const changeTab = (tabId) => {
  activeTab.value = tabId
  router.replace({
    path: route.path,
    query: { ...route.query, tab: tabId }
  })
}

// 필터 상태
const imageFilterCategory = ref('')
const videoFilterModel = ref('')
const showImageKeptOnly = ref(false)
const showVideoKeptOnly = ref(false)

// 컴포넌트 refs
const productionSheetRef = ref(null)
const referenceViewRef = ref(null)
const imageGalleryRef = ref(null)
const mediaViewRef = ref(null)

// 프로젝트 로드 함수
const loadProject = async (projectId) => {
  loading.value = true
  error.value = null
  
  if (!projectId) {
    error.value = '프로젝트 ID가 없습니다.'
    loading.value = false
    return
  }

  const result = await projectsStore.getProject(projectId)
  
  if (!result.success) {
    error.value = result.error || '프로젝트를 불러올 수 없습니다.'
  }
  
  loading.value = false
}

// route 변경 감지
watch(() => route.params.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    // URL에서 탭 정보 가져오기 (다른 프로젝트로 이동해도 같은 탭 유지)
    const tabFromQuery = route.query.tab
    const validTabs = ['production', 'reference', 'generate', 'media', 'settings']
    activeTab.value = validTabs.includes(tabFromQuery) ? tabFromQuery : 'production'
    // 새 프로젝트 로드
    await loadProject(newId)
  }
})

// 쿼리 파라미터의 탭 변경 감지 (브라우저 뒤로가기/앞으로가기 지원)
watch(() => route.query.tab, (newTab) => {
  const validTabs = ['production', 'reference', 'generate', 'media', 'settings']
  if (validTabs.includes(newTab) && newTab !== activeTab.value) {
    activeTab.value = newTab
  }
})

onMounted(async () => {
  const id = route.params.id
  await loadProject(id)
})

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusText = (status) => {
  const statusMap = {
    draft: '초안',
    in_progress: '진행 중',
    completed: '완료',
    archived: '보관'
  }
  return statusMap[status] || status
}

const handleProductionUpdate = () => {
  // 스토리보드 업데이트 시 처리
  console.log('스토리보드가 업데이트되었습니다.')
}

const updateStatus = async () => {
  await projectsStore.updateProject(project.value.id, {
    status: project.value.status
  })
}

const updateVisibility = async () => {
  await projectsStore.updateProject(project.value.id, {
    is_public: project.value.is_public
  })
}

const shareUrl = computed(() => {
  if (project.value?.share_token) {
    return `${window.location.origin}/share/${project.value.share_token}`
  }
  return ''
})

const copyShareLink = () => {
  navigator.clipboard.writeText(shareUrl.value)
  alert('공유 링크가 복사되었습니다.')
}

// 탭 액션 버튼 핸들러
const handleOpenScriptInput = () => {
  productionSheetRef.value?.openScriptInput()
}

const handleOpenImageGeneration = () => {
  imageGalleryRef.value?.openGenerationModal()
}

const handleOpenVideoGeneration = () => {
  mediaViewRef.value?.openGenerationModal()
}

// 필터 핸들러
const handleImageFilterChange = () => {
  imageGalleryRef.value?.setFilterCategory(imageFilterCategory.value)
}

const handleVideoFilterChange = () => {
  mediaViewRef.value?.setFilterModel(videoFilterModel.value)
}

// 보관함 토글 함수들
const toggleImageKeptView = () => {
  showImageKeptOnly.value = !showImageKeptOnly.value
  imageGalleryRef.value?.toggleKeptView(showImageKeptOnly.value)
}

const toggleVideoKeptView = () => {
  showVideoKeptOnly.value = !showVideoKeptOnly.value
  mediaViewRef.value?.toggleKeptView(showVideoKeptOnly.value)
}
</script>

<style scoped>
.project-detail-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.project-content {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden; /* 전체 스크롤 방지 */
}

.loading-container, .error-container {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-primary);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.back-button {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 20px;
  background: var(--primary-gradient);
  color: white;
  text-decoration: none;
  border-radius: 5px;
  transition: all 0.3s;
}

.back-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}


/* 메인 콘텐츠 */
.project-main {
  background: var(--bg-primary);
  border-radius: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.tabs {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #2d3748;
  padding-right: 20px;
  flex-shrink: 0; /* 탭 영역이 축소되지 않도록 */
  z-index: 100;
}

.tabs-left {
  display: flex;
}

.tabs-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dark .tabs {
  background-color: #1a1a1a;
}

.tab-button {
  padding: 18px 30px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.tab-button:hover {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.05);
}

.tab-button.active {
  background: transparent;
  color: #4ade80;
  border-bottom-color: #4ade80;
}

.tab-action-btn {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
}

.tab-action-btn:hover {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.tab-action-btn.active {
  background: linear-gradient(to right, #4ade80, #34d399);
  color: #1a1a1a;
}

.filter-select {
  padding: 8px 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-select:hover {
  border-color: var(--primary-color);
  background: var(--bg-tertiary);
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.tab-content {
  padding: 0 1rem;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0; /* flexbox 내에서 올바른 스크롤 동작을 위해 */
}

/* 스토리보드 섹션 */
.production-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 자료 섹션 */
.reference-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 이미지 생성 섹션 */
.generate-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 미디어 섹션 */
.media-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 플레이스홀더 */
.feature-placeholder {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-primary);
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.hint {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-top: 10px;
}

/* 설정 섹션 */
.settings-form {
  max-width: 500px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 1rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.share-section {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid var(--border-color);
}

.share-link {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.share-input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

/* 버튼 스타일 */
.btn-primary, .btn-secondary, .btn-danger, .btn-copy {
  padding: 8px 20px;
  border-radius: 5px;
  border: none;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.btn-secondary {
  background-color: var(--text-secondary);
  color: white;
}

.btn-secondary:hover {
  opacity: 0.9;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}

.btn-copy {
  background-color: var(--success-color);
  color: white;
}

.btn-copy:hover {
  opacity: 0.9;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .project-main {
    position: relative;
    padding-top: 0;
  }

  .tabs {
    position: sticky;
    top: 0;
    z-index: 100;
    flex-direction: column;
    gap: 0;
    padding: 0;
    padding-bottom: 0;
    overflow-x: visible;
    background-color: transparent;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .tabs-left {
    display: flex;
    gap: 0;
    width: 100%;
    justify-content: space-between;
    background-color: #2d3748;
  }

  .dark .tabs-left {
    background-color: #1a1a1a;
  }

  .tabs-right {
    display: flex;
    gap: 6px;
    width: 100%;
    overflow-x: auto;
    padding: 8px;
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  .tab-button {
    padding: 12px 6px;
    font-size: 0.75rem;
    min-width: 0;
    flex: 1;
    white-space: nowrap;
    border-radius: 0;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    position: relative;
  }

  /* 설정 버튼만 아이콘으로 표시 */
  .tab-button:last-child {
    font-size: 1.2rem;
    padding: 12px 8px;
    max-width: 45px;
    flex: 0 0 auto;
  }

  /* 활성 탭 스타일 - 설정 제외 */
  .tab-button.active:not(:last-child) {
    background: transparent;
    color: #4ade80;
    border-bottom-color: #4ade80;
    font-weight: 600;
  }

  /* 설정 버튼 활성화 시 색상만 변경 */
  .tab-button:last-child.active {
    color: #4ade80;
    border-bottom-color: transparent;
  }

  .tab-button:hover {
    color: rgba(255, 255, 255, 0.9);
  }

  .tab-action-btn {
    padding: 8px 12px;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .filter-select {
    padding: 8px 12px;
    font-size: 0.85rem;
  }

  .tab-content {
    padding: 15px 10px;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
  }
}
</style>