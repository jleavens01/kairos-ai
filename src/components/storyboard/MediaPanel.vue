<template>
  <div v-if="!isMobile" :class="['media-panel', { 'panel-open': isOpen }]">
    <!-- 패널 토글 버튼 -->
    <button 
      @click="togglePanel" 
      class="panel-toggle-btn"
      :title="isOpen ? '패널 닫기' : '미디어 갤러리 열기'"
    >
      <span v-if="!isOpen">◀ 갤러리</span>
      <span v-else>▶</span>
    </button>

    <!-- 패널 콘텐츠 -->
    <div v-if="isOpen" class="panel-content">
      <div class="panel-header">
        <h3>미디어 갤러리</h3>
        <div class="panel-controls">
          <select v-model="filterType" class="filter-select">
            <option value="all">모두</option>
            <option value="images">이미지만</option>
            <option value="videos">비디오만</option>
          </select>
          <button @click="refreshMedia" class="btn-refresh" title="새로고침">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 검색 바 -->
      <div class="search-bar">
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="검색..."
          class="search-input"
        />
      </div>
      
      <!-- 사용 안내 -->
      <div class="usage-hint">
        <small>💡 이미지나 비디오를 스토리보드로 드래그하여 연결하세요</small>
      </div>

      <!-- 미디어 그리드 -->
      <div class="media-grid" v-if="!loading">
        <!-- 이미지 섹션 -->
        <div v-if="filterType === 'all' || filterType === 'images'" class="media-section">
          <h4 v-if="filterType === 'all'" class="section-title">이미지</h4>
          <div class="media-items">
            <div 
              v-for="image in filteredImages" 
              :key="image.id"
              class="media-item"
              :draggable="true"
              @dragstart="handleDragStart($event, image, 'image')"
              @dragend="handleDragEnd"
              :title="image.element_name || image.prompt_used"
            >
              <img 
                :src="image.thumbnail_url || image.storage_image_url || image.result_image_url" 
                :alt="image.element_name"
                @error="handleImageError($event)"
              />
              <div class="media-overlay">
                <span class="media-type">IMG</span>
                <span class="media-name">{{ truncateName(image.element_name) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 비디오 섹션 -->
        <div v-if="filterType === 'all' || filterType === 'videos'" class="media-section">
          <h4 v-if="filterType === 'all'" class="section-title">비디오</h4>
          <div class="media-items">
            <div 
              v-for="video in filteredVideos" 
              :key="video.id"
              class="media-item video-item"
              :draggable="true"
              @dragstart="handleDragStart($event, video, 'video')"
              @dragend="handleDragEnd"
              :title="video.element_name || video.prompt_used"
            >
              <div v-if="video.thumbnail_url" class="video-thumbnail">
                <img 
                  :src="video.thumbnail_url" 
                  :alt="video.element_name"
                  @error="handleImageError($event)"
                />
              </div>
              <div v-else class="video-placeholder">
                <span class="video-icon">🎬</span>
              </div>
              <div class="media-overlay">
                <span class="media-type">VID</span>
                <span class="media-name">{{ truncateName(video.element_name) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 로딩 상태 -->
      <div v-else class="loading-state">
        <div class="spinner"></div>
        <p>미디어를 불러오는 중...</p>
      </div>

      <!-- 빈 상태 -->
      <div v-if="!loading && filteredImages.length === 0 && filteredVideos.length === 0" class="empty-state">
        <p>미디어가 없습니다</p>
        <button @click="refreshMedia" class="btn-refresh-empty">새로고침</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['media-drop', 'panel-toggle'])

// 상태
const isOpen = ref(false)
const loading = ref(false)
const filterType = ref('all')
const searchQuery = ref('')
const images = ref([])
const videos = ref([])
const draggedItem = ref(null)

// 모바일 체크
const isMobile = ref(window.innerWidth <= 768)
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
}

// 프로젝트 스토어
const projectStore = useProjectsStore()

// 계산된 속성
const filteredImages = computed(() => {
  if (filterType.value === 'videos') return []
  
  let filtered = images.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(img => 
      img.element_name?.toLowerCase().includes(query) ||
      img.prompt_used?.toLowerCase().includes(query) ||
      img.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }
  return filtered
})

const filteredVideos = computed(() => {
  if (filterType.value === 'images') return []
  
  let filtered = videos.value
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(vid => 
      vid.element_name?.toLowerCase().includes(query) ||
      vid.prompt_used?.toLowerCase().includes(query) ||
      vid.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }
  return filtered
})

// 메서드
const togglePanel = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value && images.value.length === 0 && videos.value.length === 0) {
    loadMedia()
  }
}

const loadMedia = async () => {
  loading.value = true
  try {
    // 이미지 로드 (is_kept가 true가 아닌 것만)
    const { data: imageData, error: imageError } = await supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('generation_status', 'completed')
      .or('is_kept.is.null,is_kept.eq.false')  // is_kept가 null이거나 false인 것만
      .order('created_at', { ascending: false })
      .limit(100)

    if (!imageError && imageData) {
      images.value = imageData
    }

    // 비디오 로드 (is_kept가 true가 아닌 것만)
    const { data: videoData, error: videoError } = await supabase
      .from('gen_videos')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('generation_status', 'completed')
      .or('is_kept.is.null,is_kept.eq.false')  // is_kept가 null이거나 false인 것만
      .order('created_at', { ascending: false })
      .limit(50)

    if (!videoError && videoData) {
      videos.value = videoData
    }
  } catch (error) {
    console.error('Failed to load media:', error)
  } finally {
    loading.value = false
  }
}

const refreshMedia = () => {
  loadMedia()
}

const handleDragStart = (event, item, type) => {
  draggedItem.value = { item, type }
  
  // 드래그 데이터 설정
  const dragData = {
    type: type,
    id: item.id,
    url: type === 'image' 
      ? (item.storage_image_url || item.result_image_url)
      : (item.storage_video_url || item.result_video_url),
    thumbnailUrl: item.thumbnail_url,
    name: item.element_name,
    prompt: item.prompt_used
  }
  
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/json', JSON.stringify(dragData))
  event.dataTransfer.setData('text/plain', dragData.url) // 호환성을 위한 텍스트 데이터
  
  // 드래그 중인 요소 스타일
  event.target.classList.add('dragging')
}

const handleDragEnd = (event) => {
  event.target.classList.remove('dragging')
  draggedItem.value = null
}

const handleImageError = (event) => {
  // 이미지 로드 실패 시 플레이스홀더 표시
  event.target.style.display = 'none'
  const placeholder = document.createElement('div')
  placeholder.className = 'image-error'
  placeholder.textContent = '🖼️'
  event.target.parentElement.appendChild(placeholder)
}

const truncateName = (name) => {
  if (!name) return '무제'
  return name.length > 20 ? name.substring(0, 20) + '...' : name
}

// 생명주기
onMounted(() => {
  // 초기 로드는 패널이 열릴 때 수행
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 패널 상태 변경 시 부모 컴포넌트에 알림
watch(isOpen, (newValue) => {
  emit('panel-toggle', newValue)
})

// 외부에서 호출 가능한 메서드
defineExpose({
  togglePanel,
  refreshMedia,
  isOpen
})
</script>

<style scoped>
.media-panel {
  position: fixed;
  right: 0;
  top: 60px;
  bottom: 0;
  width: 300px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 100;
  display: flex;
}

.media-panel.panel-open {
  transform: translateX(0);
}

.panel-toggle-btn {
  position: absolute;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 80px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-right: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 14px;
  color: var(--text-primary);
  transition: background-color 0.2s;
}

.panel-toggle-btn:hover {
  background: var(--bg-tertiary);
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.panel-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-select {
  padding: 4px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
}

.btn-refresh {
  padding: 4px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-refresh:hover {
  background: var(--bg-tertiary);
}

.search-bar {
  padding: 10px 15px;
  border-bottom: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  padding: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 13px;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.usage-hint {
  padding: 8px 15px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
}

.media-grid {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.media-section {
  margin-bottom: 20px;
}

.media-section h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.section-title {
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.media-items {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.media-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-tertiary);
  cursor: grab;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
}

.media-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border-color: var(--primary-color);
}

.media-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.media-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-thumbnail {
  width: 100%;
  height: 100%;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.video-icon {
  font-size: 32px;
}

.media-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  pointer-events: none;
}

.media-type {
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
}

.media-name {
  color: white;
  font-size: 11px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  flex: 1;
  margin-left: 4px;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  padding: 20px;
  text-align: center;
}

.btn-refresh-empty {
  margin-top: 10px;
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: opacity 0.2s;
}

.btn-refresh-empty:hover {
  opacity: 0.9;
}

.image-error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
}

/* 다크 모드 대응 */
@media (prefers-color-scheme: dark) {
  .media-panel {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2a2a2a;
    --bg-tertiary: #3a3a3a;
    --text-primary: #e0e0e0;
    --text-secondary: #a0a0a0;
    --border-color: #404040;
    --primary-color: #667eea;
  }
}

/* 라이트 모드 대응 */
@media (prefers-color-scheme: light) {
  .media-panel {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-tertiary: #e9ecef;
    --text-primary: #212529;
    --text-secondary: #6c757d;
    --border-color: #dee2e6;
    --primary-color: #667eea;
  }
}
</style>