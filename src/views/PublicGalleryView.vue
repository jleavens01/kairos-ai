<template>
  <div class="public-gallery-container">
    <!-- 헤더 -->
    <div class="gallery-header">
      <div class="header-content">
        <div class="header-left">
          <Globe :size="32" class="header-icon" />
          <div class="header-text">
            <h1>공개 갤러리</h1>
            <p>다른 창작자들의 멋진 프로젝트를 둘러보세요</p>
          </div>
        </div>
        <div class="header-right">
          <div class="search-section">
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="프로젝트 검색..."
              class="search-input"
              @input="handleSearch"
            />
            <Search :size="20" class="search-icon" />
          </div>
          <select v-model="selectedCategory" @change="handleCategoryChange" class="category-filter">
            <option value="">모든 카테고리</option>
            <option value="image">이미지</option>
            <option value="video">비디오</option>
            <option value="avatar">아바타</option>
            <option value="story">스토리</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 통계 정보 -->
    <div class="stats-section">
      <div class="stat-item">
        <span class="stat-number">{{ totalProjects }}</span>
        <span class="stat-label">공개 프로젝트</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ totalCreators }}</span>
        <span class="stat-label">창작자</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ totalViews }}</span>
        <span class="stat-label">총 조회수</span>
      </div>
    </div>

    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>공개 프로젝트를 불러오는 중...</p>
    </div>

    <!-- 에러 상태 -->
    <div v-else-if="error" class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>프로젝트를 불러올 수 없습니다</h2>
      <p>{{ error }}</p>
      <button @click="fetchPublicProjects" class="retry-button">다시 시도</button>
    </div>

    <!-- 프로젝트 그리드 -->
    <div v-else class="projects-grid">
      <!-- 프로젝트 카드 -->
      <div 
        v-for="project in filteredProjects" 
        :key="project.id"
        class="project-card"
        @click="openProjectDetail(project)"
      >
        <div class="project-thumbnail">
          <img 
            v-if="project.thumbnail_url" 
            :src="project.thumbnail_url" 
            :alt="project.name"
            class="thumbnail-image"
          />
          <div v-else class="thumbnail-placeholder">
            <FolderOpen :size="48" />
          </div>
          <div class="project-overlay">
            <div class="overlay-content">
              <Eye :size="16" />
              <span>{{ project.view_count || 0 }}</span>
            </div>
          </div>
        </div>
        
        <div class="project-info">
          <h3 class="project-title">{{ project.name }}</h3>
          <p class="project-description">{{ project.description || '설명이 없습니다.' }}</p>
          
          <div class="project-meta">
            <div class="creator-info">
              <div class="creator-avatar">
                <img v-if="project.creator_avatar" :src="project.creator_avatar" :alt="project.creator_name" />
                <div v-else class="avatar-placeholder">
                  {{ project.creator_name?.[0]?.toUpperCase() || 'U' }}
                </div>
              </div>
              <span class="creator-name">{{ project.creator_name || '익명' }}</span>
            </div>
            
            <div class="project-stats">
              <div class="stat-item">
                <Calendar :size="14" />
                <span>{{ formatDate(project.created_at) }}</span>
              </div>
            </div>
          </div>

          <div class="project-tags" v-if="project.tags && project.tags.length > 0">
            <span v-for="tag in project.tags.slice(0, 3)" :key="tag" class="tag">
              {{ tag }}
            </span>
            <span v-if="project.tags.length > 3" class="more-tags">
              +{{ project.tags.length - 3 }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 빈 상태 -->
    <div v-if="!loading && !error && filteredProjects.length === 0" class="empty-state">
      <Globe :size="64" class="empty-icon" />
      <h2>공개 프로젝트가 없습니다</h2>
      <p>첫 번째 공개 프로젝트를 만들어보세요!</p>
      <router-link to="/projects" class="create-button">
        프로젝트 만들기
      </router-link>
    </div>

    <!-- 더 보기 버튼 -->
    <div v-if="hasMore && !loading" class="load-more-container">
      <button @click="loadMore" class="load-more-button">
        더 보기
      </button>
    </div>
  </div>

  <!-- 프로젝트 상세 모달 -->
  <PublicProjectDetailModal 
    v-if="selectedProject"
    :project="selectedProject"
    @close="closeProjectDetail"
  />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Globe, Search, FolderOpen, Eye, Calendar, User } from 'lucide-vue-next'
import PublicProjectDetailModal from '@/components/gallery/PublicProjectDetailModal.vue'

// 반응형 상태
const loading = ref(false)
const error = ref(null)
const projects = ref([])
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedProject = ref(null)

// 페이지네이션
const currentPage = ref(1)
const pageSize = 12
const hasMore = ref(true)

// 통계
const totalProjects = ref(0)
const totalCreators = ref(0)
const totalViews = ref(0)

// 필터링된 프로젝트
const filteredProjects = computed(() => {
  let filtered = projects.value

  // 검색어 필터링
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(project => 
      project.name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query) ||
      project.creator_name?.toLowerCase().includes(query)
    )
  }

  // 카테고리 필터링
  if (selectedCategory.value) {
    filtered = filtered.filter(project => 
      project.category === selectedCategory.value ||
      project.tags?.includes(selectedCategory.value)
    )
  }

  return filtered
})

// 공개 프로젝트 조회
const fetchPublicProjects = async (reset = true) => {
  if (reset) {
    loading.value = true
    error.value = null
    currentPage.value = 1
    projects.value = []
  }

  try {
    // API 호출
    const response = await fetch('/.netlify/functions/getPublicProjects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: currentPage.value,
        limit: pageSize,
        category: selectedCategory.value,
        search: searchQuery.value
      })
    })

    if (!response.ok) {
      throw new Error('공개 프로젝트를 불러올 수 없습니다.')
    }

    const data = await response.json()
    
    if (reset) {
      projects.value = data.projects || []
    } else {
      projects.value = [...projects.value, ...(data.projects || [])]
    }

    totalProjects.value = data.stats.totalProjects || 0
    totalCreators.value = data.stats.totalCreators || 0
    totalViews.value = data.stats.totalViews || 0
    hasMore.value = data.pagination.hasMore || false

  } catch (err) {
    console.error('Error fetching public projects:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// 더 보기
const loadMore = () => {
  if (!hasMore.value || loading.value) return
  currentPage.value++
  fetchPublicProjects(false)
}

// 검색 핸들러
const handleSearch = () => {
  // 디바운스 적용 (300ms)
  clearTimeout(window.searchTimeout)
  window.searchTimeout = setTimeout(() => {
    fetchPublicProjects()
  }, 300)
}

// 카테고리 변경 핸들러
const handleCategoryChange = () => {
  fetchPublicProjects()
}

// 프로젝트 상세 모달
const openProjectDetail = (project) => {
  selectedProject.value = project
  // 조회수 증가
  incrementViewCount(project.id)
}

const closeProjectDetail = () => {
  selectedProject.value = null
}

// 조회수 증가
const incrementViewCount = async (projectId) => {
  try {
    await fetch(`/api/projects/${projectId}/view`, {
      method: 'POST'
    })
  } catch (err) {
    console.error('Error incrementing view count:', err)
  }
}

// 날짜 포맷팅
const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`
  return `${Math.floor(diffDays / 365)}년 전`
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  fetchPublicProjects()
})

// 검색어나 카테고리 변경 감지
watch([searchQuery, selectedCategory], () => {
  if (searchQuery.value || selectedCategory.value) {
    handleSearch()
  }
})
</script>

<style scoped>
.public-gallery-container {
  min-height: 100vh;
  background-color: var(--bg-primary);
  padding: 2rem;
}

/* 헤더 */
.gallery-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  color: var(--primary);
}

.header-text h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.header-text p {
  color: var(--text-secondary);
  margin: 0.5rem 0 0 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-section {
  position: relative;
}

.search-input {
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  width: 300px;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-alpha-20);
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.category-filter {
  padding: 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

/* 통계 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-item {
  background-color: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--border-primary);
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 프로젝트 그리드 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.project-card {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  transition: all 0.3s;
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-alpha-30);
}

.project-thumbnail {
  position: relative;
  aspect-ratio: 16/9;
  background-color: var(--bg-tertiary);
  overflow: hidden;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.project-overlay {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.overlay-content {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.project-info {
  padding: 1rem;
}

.project-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.project-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  background-color: var(--bg-tertiary);
}

.creator-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: var(--primary);
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
}

.creator-name {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.project-stats {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.more-tags {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* 로딩, 에러, 빈 상태 */
.loading-container,
.error-container,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-primary);
  border-top: 4px solid var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.error-icon,
.empty-icon {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.error-container h2,
.empty-state h2 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.error-container p,
.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.retry-button,
.create-button {
  background: var(--primary-gradient);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s;
}

.retry-button:hover,
.create-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 더 보기 버튼 */
.load-more-container {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

.load-more-button {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.load-more-button:hover {
  background-color: var(--bg-tertiary);
  transform: translateY(-2px);
}

/* 반응형 */
@media (max-width: 768px) {
  .public-gallery-container {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-right {
    flex-direction: column;
  }

  .search-input {
    width: 100%;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>