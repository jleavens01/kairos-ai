<template>
  <div class="video-generation-gallery">
    <!-- 갤러리 섹션 -->
    <div class="gallery-section">
      <!-- 필터는 상위 컴포넌트로 이동 -->

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>비디오를 불러오는 중...</p>
      </div>

      <div v-if="!loading && filteredVideos.length === 0 && processingVideos.length === 0" class="empty-state">
        <div class="empty-icon">🎬</div>
        <p>아직 생성된 비디오가 없습니다.</p>
        <p class="hint">새 비디오 생성 버튼을 눌러 시작하세요.</p>
      </div>

      <!-- Masonry 레이아웃 갤러리 -->
      <div v-else class="video-grid">
        <!-- 처리 중인 비디오 -->
        <div 
          v-for="video in processingVideos" 
          :key="video.id"
          class="gallery-item processing-card"
        >
          <div class="video-wrapper processing-wrapper">
            <div class="processing-animation">
              <div class="spinner"></div>
              <p class="processing-text">{{ video.generation_status === 'pending' ? '대기 중...' : '생성 중...' }}</p>
              <p class="processing-model">{{ video.generation_model }}</p>
            </div>
          </div>
        </div>

        <!-- 생성된 비디오 -->
        <div 
          v-for="video in filteredVideos" 
          :key="video.id"
          class="gallery-item video-card"
          @click="openDetailModal(video)"
          @mouseenter="() => handleVideoHover(video.id, true)"
          @mouseleave="() => handleVideoHover(video.id, false)"
        >
          <div class="video-wrapper">
            <!-- 썸네일 또는 비디오 미리보기 -->
            <div class="video-preview">
              <video 
                v-if="video.storage_video_url"
                :ref="el => setVideoRef(el, video.id)"
                :src="video.storage_video_url"
                :poster="video.thumbnail_url"
                :autoplay="false"
                muted
                loop
                preload="auto"
                playsinline
                webkit-playsinline
                @loadedmetadata="onVideoMetadataLoaded"
                class="preview-video"
              ></video>
              <img 
                v-else-if="video.thumbnail_url"
                :src="video.thumbnail_url"
                :alt="video.description || 'Video thumbnail'"
              />
              <div v-else class="no-preview">
                <span>🎬</span>
              </div>
            </div>

            <!-- 오버레이 정보 -->
            <div class="video-overlay-info">
              <div class="info-top">
                <button 
                  @click.stop="connectToScene(video)"
                  class="btn-scene-link"
                  :class="{ connected: video.production_sheet_id }"
                  title="스토리보드에 연결"
                >
                  🔗
                </button>
                <button 
                  @click.stop="toggleFavorite(video)"
                  class="btn-favorite"
                  :class="{ active: video.is_favorite }"
                >
                  {{ video.is_favorite ? '⭐' : '☆' }}
                </button>
                <button 
                  @click.stop="downloadVideo(video)"
                  class="btn-download"
                  title="다운로드"
                >
                  📥
                </button>
              </div>
              <div class="info-bottom">
                <p class="video-model">{{ getModelName(video.generation_model) }}</p>
                <p class="video-duration">{{ formatDuration(video.duration_seconds) }}</p>
                <p v-if="video.resolution" class="video-resolution">{{ video.resolution }}</p>
                <div v-if="video.tags && video.tags.length > 0" class="video-tags">
                  <span 
                    v-for="(tag, index) in video.tags.slice(0, 3)" 
                    :key="index"
                    class="tag-chip"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 비디오 생성 모달 -->
    <VideoGenerationModal
      v-if="showGenerationModal"
      :show="showGenerationModal"
      :project-id="projectId"
      :initial-prompt="currentPrompt"
      @close="closeGenerationModal"
      @generated="handleGenerationSuccess"
    />

    <!-- 비디오 상세보기 모달 -->
    <VideoDetailModal
      v-if="showDetailModal"
      :show="showDetailModal"
      :video="videoToView"
      @close="showDetailModal = false"
      @update="handleVideoUpdate"
      @connect-scene="connectToSceneFromDetail"
    />

    <!-- 씬 연결 모달 -->
    <SceneConnectionModal
      v-if="showSceneModal"
      :show="showSceneModal"
      :media="videoToConnect"
      :media-type="'video'"
      :project-id="projectId"
      @close="showSceneModal = false"
      @success="handleSceneConnection"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useProductionStore } from '@/stores/production'
import VideoGenerationModal from './VideoGenerationModal.vue'
import VideoDetailModal from './VideoDetailModal.vue'
import SceneConnectionModal from './SceneConnectionModal.vue'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

// Store
const productionStore = useProductionStore()

// State
const loading = ref(false)
const videos = ref([])
const filterModel = ref('')
const showGenerationModal = ref(false)
const showDetailModal = ref(false)
const showSceneModal = ref(false)
const currentPrompt = ref('')
const videoToView = ref(null)
const videoToConnect = ref(null)
// const realtimeChannel = ref(null) - Realtime 제거
const videoRefs = ref({})
let pollingInterval = null

// Computed
const processingVideos = computed(() => {
  return videos.value.filter(
    v => v.generation_status === 'pending' || v.generation_status === 'processing'
  )
})

const filteredVideos = computed(() => {
  let filtered = videos.value.filter(v => v.generation_status === 'completed')
  
  if (filterModel.value) {
    filtered = filtered.filter(v => v.generation_model === filterModel.value)
  }
  
  return filtered
})

// Methods
const fetchVideos = async () => {
  loading.value = true
  
  try {
    const { data, error } = await supabase
      .from('gen_videos')
      .select('*')
      .eq('project_id', props.projectId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    videos.value = data || []
  } catch (error) {
    console.error('비디오 로드 실패:', error)
  } finally {
    loading.value = false
  }
}

const openGenerationModal = () => {
  showGenerationModal.value = true
}

const closeGenerationModal = () => {
  showGenerationModal.value = false
  currentPrompt.value = ''
}

const handleGenerationSuccess = async (result) => {
  console.log('Video generation success:', result)
  closeGenerationModal()
  
  // 즉시 비디오 목록 새로고침
  await fetchVideos()
  
  // 처리 중인 비디오가 있으면 폴링 시작
  if (result.status === 'processing' || result.status === 'pending') {
    console.log('Starting polling for processing video')
    startPolling()
  }
}

const openDetailModal = (video) => {
  // 비디오 재생 중지
  const videoEl = videoRefs.value[video.id]
  if (videoEl) {
    videoEl.pause()
    videoEl.currentTime = 0
  }
  
  videoToView.value = video
  showDetailModal.value = true
}

const handleVideoUpdate = (updatedVideo) => {
  const index = videos.value.findIndex(v => v.id === updatedVideo.id)
  if (index !== -1) {
    videos.value[index] = updatedVideo
  }
}

const toggleFavorite = async (video) => {
  try {
    const { error } = await supabase
      .from('gen_videos')
      .update({ is_favorite: !video.is_favorite })
      .eq('id', video.id)
    
    if (error) throw error
    
    video.is_favorite = !video.is_favorite
  } catch (error) {
    console.error('즐겨찾기 토글 실패:', error)
  }
}

const downloadVideo = async (video) => {
  if (video.storage_video_url) {
    try {
      // 프로젝트 정보 가져오기
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', props.projectId)
        .single()
      
      const projectName = projectData?.name || 'untitled'
      const sceneNumber = video.linked_scene_number || 'no-scene'
      
      // 파일명 생성 (특수문자 제거)
      const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
      const fileName = `video_${sanitizedProjectName}_${sceneNumber}.mp4`
      
      // 비디오 다운로드
      const response = await fetch(video.storage_video_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 메모리 정리
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Video download error:', error)
      // 실패 시 기본 다운로드
      const link = document.createElement('a')
      link.href = video.storage_video_url
      link.download = `video_${video.id}.mp4`
      link.click()
    }
  }
}

// Video ref management
const setVideoRef = (el, videoId) => {
  if (el) {
    videoRefs.value[videoId] = el
  }
}

const onVideoMetadataLoaded = (event) => {
  // 비디오 메타데이터가 로드되면 재생 준비 완료
  const video = event.target
  video.volume = 0 // 음소거 확실히
  video.muted = true
}

const handleVideoHover = async (videoId, isHovering) => {
  const video = videoRefs.value[videoId]
  if (!video) return
  
  if (isHovering) {
    try {
      // 음소거 확실히 설정
      video.muted = true
      video.volume = 0
      
      // 처음부터 재생
      video.currentTime = 0
      
      // 재생 시도
      const playPromise = video.play()
      
      if (playPromise !== undefined) {
        await playPromise
      }
    } catch (error) {
      // 자동 재생이 차단된 경우 조용히 실패
      console.debug('Video autoplay blocked:', error.message)
      // 사용자 상호작용 후 재시도를 위해 플래그 설정
      video.dataset.playOnInteraction = 'true'
    }
  } else {
    try {
      video.pause()
      video.currentTime = 0
    } catch (error) {
      console.debug('Video pause error:', error)
    }
  }
}

const getModelName = (model) => {
  const modelNames = {
    'veo2': 'Veo 2',
    'kling2.1': 'Kling 2.1',
    'hailou02': 'Hailou 02',
    'seedance': 'SeedDance Pro'
  }
  return modelNames[model] || model
}

const formatDuration = (seconds) => {
  if (!seconds) return ''
  return `${seconds}초`
}

// 씬 연결 관련
const connectToScene = async (video) => {
  videoToConnect.value = video
  
  // 스토리보드 데이터 로드 (필요한 경우)
  if (!productionStore.productionSheets.length) {
    await productionStore.fetchProductionSheets(props.projectId)
  }
  
  showSceneModal.value = true
}

const connectToSceneFromDetail = async (video) => {
  showDetailModal.value = false
  await connectToScene(video)
}

const handleSceneConnection = async (result) => {
  // 비디오 업데이트
  const index = videos.value.findIndex(v => v.id === result.mediaId)
  if (index !== -1) {
    videos.value[index].production_sheet_id = result.sceneId
    videos.value[index].linked_scene_number = result.sceneNumber
  }
  
  showSceneModal.value = false
  videoToConnect.value = null
  
  // 피드백
  console.log('비디오가 씬에 연결되었습니다:', result)
}

// 폴링 관련
const startPolling = () => {
  if (pollingInterval) return
  
  // 즉시 한 번 실행
  callPollingWorker()
  
  // 5초마다 폴링
  pollingInterval = setInterval(async () => {
    if (processingVideos.value.length === 0) {
      stopPolling()
      return
    }
    await callPollingWorker()
  }, 5000)
  
  // 5분 후 자동 중지
  setTimeout(() => {
    stopPolling()
  }, 300000) // 비디오는 이미지보다 오래 걸릴 수 있으므로 5분
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

const callPollingWorker = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      stopPolling()
      return
    }
    
    const response = await fetch('/.netlify/functions/processVideoQueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({})
    })
    
    if (response.ok) {
      const result = await response.json()
      
      // 완료된 비디오가 있으면 갤러리 새로고침
      if (result.summary && result.summary.completed > 0) {
        console.log(`${result.summary.completed}개 비디오 생성 완료, 갤러리 새로고침`)
        await fetchVideos() // 갤러리 데이터 새로고침
      }
      
      if (result.summary && result.summary.processing === 0) {
        stopPolling()
      }
    }
  } catch (error) {
    console.error('Polling error:', error)
  }
}

// Realtime 제거 - 폴링으로 대체됨
/* const setupRealtimeSubscription = () => {
  realtimeChannel.value = supabase
    .channel(`gen_videos_${props.projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gen_videos',
        filter: `project_id=eq.${props.projectId}`
      },
      async (payload) => {
        console.log('Realtime event:', payload.eventType, payload)
        
        if (payload.eventType === 'INSERT') {
          // 새 비디오가 추가되면 맨 앞에 추가
          videos.value.unshift(payload.new)
          console.log('New video added to gallery')
        } else if (payload.eventType === 'UPDATE') {
          const index = videos.value.findIndex(v => v.id === payload.new.id)
          if (index !== -1) {
            videos.value[index] = payload.new
            console.log('Video updated in gallery')
          } else {
            // 업데이트인데 목록에 없으면 새로 추가
            videos.value.unshift(payload.new)
            console.log('Updated video added to gallery')
          }
        } else if (payload.eventType === 'DELETE') {
          videos.value = videos.value.filter(v => v.id !== payload.old.id)
          console.log('Video removed from gallery')
        }
      }
    )
    .subscribe()
}

const cleanupRealtimeSubscription = () => {
  if (realtimeChannel.value) {
    supabase.removeChannel(realtimeChannel.value)
    realtimeChannel.value = null
  }
} */

// Lifecycle
onMounted(async () => {
  await fetchVideos()
  // setupRealtimeSubscription() - Realtime 제거, 폴링 사용
  
  if (processingVideos.value.length > 0) {
    startPolling()
  }
})

onUnmounted(() => {
  // cleanupRealtimeSubscription() - Realtime 제거
  stopPolling()
})

// Method to set filter model from parent
const setFilterModel = (model) => {
  filterModel.value = model
}

// Expose method for parent component
defineExpose({
  openGenerationModal,
  setFilterModel,
  filterModel
})
</script>

<style scoped>
.video-generation-gallery {
  padding: 20px;
  padding-top: 10px;
  height: 100%;
  overflow-y: auto;
}

.gallery-section {
  margin-top: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.filter-options {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

/* Masonry 레이아웃 */
.video-grid {
  column-count: 2; /* 모바일: 2열 */
  column-gap: 20px;
  padding: 0;
}

/* 태블릿 */
@media (min-width: 768px) {
  .video-grid {
    column-count: 3; /* 3열 */
  }
}

/* 데스크탑 */
@media (min-width: 1024px) {
  .video-grid {
    column-count: 3; /* 3열 */
  }
}

/* 대형 데스크탑 */
@media (min-width: 1440px) {
  .video-grid {
    column-count: 4; /* 4열 */
  }
}

.gallery-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  break-inside: avoid;
  margin-bottom: 20px;
  display: inline-block;
  width: 100%;
}

.gallery-item.processing-card {
  border: 2px solid var(--primary-color);
  background: var(--bg-secondary);
  animation: pulse 2s ease-in-out infinite;
  cursor: default;
  min-height: auto;
}

.gallery-item.processing-card .video-wrapper {
  aspect-ratio: 16/9;
}

.gallery-item.video-card {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.gallery-item.video-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: scale(1.02);
  z-index: 10;
}

.video-wrapper {
  position: relative;
  width: 100%;
}

.video-preview {
  width: 100%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.video-preview video,
.video-preview img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
}

.preview-video {
  transition: opacity 0.3s;
}

.no-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  opacity: 0.3;
  width: 100%;
  min-height: 150px;
  aspect-ratio: 16/9;
}

.processing-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 150px;
}

.processing-animation {
  text-align: center;
}

.processing-text {
  margin-top: 16px;
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 500;
}

.processing-model {
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 오버레이 정보 */
.video-overlay-info {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, 
    rgba(0,0,0,0.7) 0%, 
    transparent 30%,
    transparent 70%,
    rgba(0,0,0,0.8) 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.gallery-item.video-card:hover .video-overlay-info {
  opacity: 1;
}

.info-top {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.info-bottom {
  color: white;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}

.info-bottom p {
  margin: 4px 0;
  font-size: 0.85rem;
}

.btn-scene-link,
.btn-favorite,
.btn-download {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 1.1rem;
}

.btn-scene-link:hover,
.btn-favorite:hover,
.btn-download:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.btn-favorite.active {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.3);
}

.btn-scene-link.connected {
  color: #4ade80; /* Kairos AI 초록색 */
  background: rgba(74, 222, 128, 0.3);
  border: 1px solid rgba(74, 222, 128, 0.5);
}

/* 태그 */
.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.tag-chip {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  font-size: 0.75rem;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}

/* 로딩 & 빈 상태 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { 
    opacity: 1; 
    border-color: var(--primary-color);
  }
  50% { 
    opacity: 0.7; 
    border-color: var(--border-color);
  }
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.hint {
  font-size: 0.9rem;
  color: var(--text-tertiary);
}
</style>