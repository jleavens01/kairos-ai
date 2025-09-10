<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <!-- 모달 헤더 -->
      <div class="modal-header">
        <div class="project-info">
          <h2>{{ project.name }}</h2>
          <div class="creator-info">
            <div class="creator-avatar">
              <img v-if="project.creator_avatar" :src="project.creator_avatar" :alt="project.creator_name" />
              <div v-else class="avatar-placeholder">
                {{ project.creator_name?.[0]?.toUpperCase() || 'U' }}
              </div>
            </div>
            <div class="creator-details">
              <span class="creator-name">{{ project.creator_name || '익명' }}</span>
              <span class="created-date">{{ formatDate(project.created_at) }}</span>
            </div>
          </div>
        </div>
        <button @click="closeModal" class="close-button">
          <X :size="24" />
        </button>
      </div>

      <!-- 프로젝트 미리보기 -->
      <div class="project-preview">
        <div class="preview-container">
          <img 
            v-if="project.thumbnail_url" 
            :src="project.thumbnail_url" 
            :alt="project.name"
            class="preview-image"
          />
          <div v-else class="preview-placeholder">
            <FolderOpen :size="64" />
            <p>미리보기 이미지가 없습니다</p>
          </div>
        </div>
        
        <!-- 프로젝트 통계 -->
        <div class="project-stats">
          <div class="stat-item">
            <Eye :size="16" />
            <span>{{ project.view_count || 0 }} 조회</span>
          </div>
          <div class="stat-item">
            <Heart :size="16" :class="{ 'liked': isLiked }" @click="toggleLike" />
            <span>{{ project.like_count || 0 }} 좋아요</span>
          </div>
          <div class="stat-item">
            <Share2 :size="16" @click="shareProject" />
            <span>공유</span>
          </div>
        </div>
      </div>

      <!-- 프로젝트 설명 -->
      <div class="project-description">
        <h3>설명</h3>
        <p v-if="project.description">{{ project.description }}</p>
        <p v-else class="no-description">설명이 없습니다.</p>
      </div>

      <!-- 프로젝트 태그 -->
      <div class="project-tags" v-if="project.tags && project.tags.length > 0">
        <h3>태그</h3>
        <div class="tags-list">
          <span v-for="tag in project.tags" :key="tag" class="tag">
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- 프로젝트 에셋 (미리보기) -->
      <div class="project-assets" v-if="projectAssets.length > 0">
        <h3>포함된 에셋</h3>
        <div class="assets-grid">
          <div 
            v-for="asset in projectAssets.slice(0, 6)" 
            :key="asset.id"
            class="asset-item"
            @click="viewAsset(asset)"
          >
            <img v-if="asset.type === 'image'" :src="asset.url" :alt="asset.name" />
            <video v-else-if="asset.type === 'video'" :src="asset.url" muted />
            <div v-else class="asset-placeholder">
              <FileText :size="24" />
            </div>
            <div class="asset-overlay">
              <span class="asset-type">{{ asset.type }}</span>
            </div>
          </div>
        </div>
        <p v-if="projectAssets.length > 6" class="more-assets">
          +{{ projectAssets.length - 6 }}개의 추가 에셋
        </p>
      </div>

      <!-- 액션 버튼 -->
      <div class="modal-actions">
        <button @click="forkProject" class="action-button fork-button">
          <GitBranch :size="16" />
          포크하기
        </button>
        <button @click="bookmarkProject" class="action-button bookmark-button" :class="{ 'bookmarked': isBookmarked }">
          <Bookmark :size="16" />
          {{ isBookmarked ? '북마크됨' : '북마크' }}
        </button>
        <button @click="reportProject" class="action-button report-button">
          <Flag :size="16" />
          신고
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { X, FolderOpen, Eye, Heart, Share2, GitBranch, Bookmark, Flag, FileText } from 'lucide-vue-next'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const authStore = useAuthStore()

// 반응형 상태
const isLiked = ref(false)
const isBookmarked = ref(false)
const projectAssets = ref([])

// 모달 닫기
const closeModal = () => {
  emit('close')
}

// 좋아요 토글
const toggleLike = async () => {
  if (!authStore.isLoggedIn) {
    alert('로그인이 필요합니다.')
    return
  }

  try {
    const response = await fetch(`/api/projects/${props.project.id}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      isLiked.value = !isLiked.value
      // 좋아요 수 업데이트 (부모 컴포넌트에 이벤트 전달 필요)
    }
  } catch (error) {
    console.error('Error toggling like:', error)
  }
}

// 프로젝트 공유
const shareProject = () => {
  const url = `${window.location.origin}/public-gallery/${props.project.id}`
  
  if (navigator.share) {
    navigator.share({
      title: props.project.name,
      text: props.project.description,
      url: url
    })
  } else {
    navigator.clipboard.writeText(url)
    alert('프로젝트 링크가 클립보드에 복사되었습니다.')
  }
}

// 프로젝트 포크
const forkProject = async () => {
  if (!authStore.isLoggedIn) {
    alert('로그인이 필요합니다.')
    return
  }

  try {
    const response = await fetch(`/api/projects/${props.project.id}/fork`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const { projectId } = await response.json()
      alert('프로젝트가 성공적으로 포크되었습니다!')
      // 새 프로젝트로 이동
      window.location.href = `/projects/${projectId}`
    }
  } catch (error) {
    console.error('Error forking project:', error)
    alert('프로젝트 포크에 실패했습니다.')
  }
}

// 북마크 토글
const bookmarkProject = async () => {
  if (!authStore.isLoggedIn) {
    alert('로그인이 필요합니다.')
    return
  }

  try {
    const response = await fetch(`/api/projects/${props.project.id}/bookmark`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      isBookmarked.value = !isBookmarked.value
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error)
  }
}

// 프로젝트 신고
const reportProject = () => {
  const reason = prompt('신고 사유를 입력해주세요:')
  if (!reason) return

  // 신고 API 호출
  fetch(`/api/projects/${props.project.id}/report`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authStore.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  }).then(() => {
    alert('신고가 접수되었습니다.')
  }).catch(error => {
    console.error('Error reporting project:', error)
    alert('신고 접수에 실패했습니다.')
  })
}

// 에셋 보기
const viewAsset = (asset) => {
  // 에셋 상세 보기 (새 창 또는 모달)
  window.open(asset.url, '_blank')
}

// 날짜 포맷팅
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 프로젝트 에셋 로드
const loadProjectAssets = async () => {
  try {
    const response = await fetch(`/api/projects/${props.project.id}/assets`)
    if (response.ok) {
      const data = await response.json()
      projectAssets.value = data.assets || []
    }
  } catch (error) {
    console.error('Error loading project assets:', error)
  }
}

// 사용자 상호작용 상태 로드
const loadUserInteractions = async () => {
  if (!authStore.isLoggedIn) return

  try {
    const response = await fetch(`/api/projects/${props.project.id}/user-status`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      isLiked.value = data.isLiked || false
      isBookmarked.value = data.isBookmarked || false
    }
  } catch (error) {
    console.error('Error loading user interactions:', error)
  }
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  loadProjectAssets()
  loadUserInteractions()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background-color: var(--bg-secondary);
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-primary);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary);
}

.project-info h2 {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.creator-avatar {
  width: 40px;
  height: 40px;
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
  font-weight: 600;
}

.creator-details {
  display: flex;
  flex-direction: column;
}

.creator-name {
  color: var(--text-primary);
  font-weight: 500;
}

.created-date {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.close-button {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.3s;
}

.close-button:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.project-preview {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary);
}

.preview-container {
  margin-bottom: 1rem;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-tertiary);
}

.preview-image {
  width: 100%;
  height: auto;
  display: block;
}

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--text-secondary);
  text-align: center;
}

.project-stats {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5rem;
  border-radius: 6px;
}

.stat-item:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.stat-item.liked {
  color: var(--danger);
}

.project-description,
.project-tags,
.project-assets {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-primary);
}

.project-description h3,
.project-tags h3,
.project-assets h3 {
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.project-description p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.no-description {
  color: var(--text-tertiary);
  font-style: italic;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.asset-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bg-tertiary);
  cursor: pointer;
  transition: all 0.3s;
}

.asset-item:hover {
  transform: scale(1.05);
}

.asset-item img,
.asset-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}

.asset-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  color: white;
  padding: 0.5rem;
  font-size: 0.8rem;
}

.more-assets {
  color: var(--text-secondary);
  font-size: 0.9rem;
  text-align: center;
  margin: 0;
}

.modal-actions {
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  flex: 1;
  min-width: 120px;
  justify-content: center;
}

.fork-button {
  background: var(--primary-gradient);
  color: white;
  border: none;
}

.fork-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.bookmark-button {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
}

.bookmark-button:hover,
.bookmark-button.bookmarked {
  background-color: var(--warning);
  color: white;
  border-color: var(--warning);
}

.report-button {
  background-color: transparent;
  color: var(--danger);
  border: 1px solid var(--danger);
}

.report-button:hover {
  background-color: var(--danger);
  color: white;
}

/* 반응형 */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 1rem;
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-header {
    flex-direction: column;
    gap: 1rem;
  }

  .project-stats {
    flex-direction: column;
    gap: 0.5rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .action-button {
    flex: none;
  }
}
</style>