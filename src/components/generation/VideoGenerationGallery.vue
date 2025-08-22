<template>
  <div class="video-generation-gallery">
    <!-- 갤러리 섹션 -->
    <div class="gallery-section">
      <!-- 컬럼 컨트롤 -->
      <div v-if="filteredVideos.length > 0 || processingVideos.length > 0" class="gallery-controls">
        <ColumnControl 
          v-model="columnCount"
          :min-columns="2"
          :max-columns="6"
          @change="updateColumnCount"
        />
      </div>
      
      <!-- 필터는 상위 컴포넌트로 이동 -->

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>비디오를 불러오는 중...</p>
      </div>

      <div v-if="!loading && filteredVideos.length === 0 && processingVideos.length === 0" class="empty-state">
        <Video :size="48" class="empty-icon" />
        <p>아직 생성된 비디오가 없습니다.</p>
        <p class="hint">새 비디오 생성 버튼을 눌러 시작하세요.</p>
      </div>

      <!-- Masonry 레이아웃 갤러리 -->
      <div v-else class="video-grid" :style="{ columnCount: columnCount }">
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
          :class="{ 'failed-card': video.generation_status === 'failed' }"
          @click="openDetailModal(video)"
          @mouseenter="() => handleVideoHover(video.id, true)"
          @mouseleave="() => handleVideoHover(video.id, false)"
        >
          <div class="video-wrapper">
            <!-- 실패한 비디오 표시 -->
            <div v-if="video.generation_status === 'failed'" class="video-preview failed-preview">
              <div class="failed-content">
                <div class="failed-icon">❌</div>
                <p class="failed-text">생성 실패</p>
                <p class="failed-model">{{ getModelName(video.generation_model) }}</p>
                <p v-if="video.error_message" class="failed-reason">{{ video.error_message }}</p>
              </div>
            </div>
            <!-- 썸네일 또는 비디오 미리보기 -->
            <div v-else class="video-preview">
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
                <Video :size="48" />
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
                  <Link :size="16" />
                </button>
                <button 
                  @click.stop="toggleFavorite(video)"
                  class="btn-favorite"
                  :class="{ active: video.is_favorite }"
                >
                  <Star v-if="video.is_favorite" :size="16" fill="currentColor" />
                  <Star v-else :size="16" />
                </button>
                <button 
                  @click.stop="toggleKeep(video)"
                  class="btn-keep"
                  :class="{ active: video.is_kept }"
                  :title="video.is_kept ? '보관함에서 제거' : '보관함에 추가'"
                >
                  <Archive v-if="video.is_kept" :size="16" fill="currentColor" />
                  <Archive v-else :size="16" />
                </button>
                <button 
                  @click.stop="downloadVideo(video)"
                  class="btn-download"
                  title="다운로드"
                >
                  <Download :size="16" />
                </button>
                <button 
                  @click.stop="deleteVideo(video)"
                  class="btn-delete"
                  title="삭제"
                >
                  <Trash2 :size="16" />
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
      @upscale="openUpscaleModal"
    />
    
    <!-- 업스케일 모달 -->
    <VideoUpscaleModal
      v-if="showUpscaleModal"
      :video="videoToUpscale"
      :project-id="projectId"
      @close="showUpscaleModal = false"
      @upscaled="handleUpscaleSuccess"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '@/utils/supabase'
import { useProductionStore } from '@/stores/production'
import VideoGenerationModal from './VideoGenerationModal.vue'
import VideoDetailModal from './VideoDetailModal.vue'
import VideoUpscaleModal from './VideoUpscaleModal.vue'
import { Plus, Link, Download, Trash2, Loader, Clock, AlertCircle, Video, Star, Archive } from 'lucide-vue-next'
import SceneConnectionModal from './SceneConnectionModal.vue'
import ColumnControl from '@/components/common/ColumnControl.vue'

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
const showKeptOnly = ref(false)
const showGenerationModal = ref(false)
const showDetailModal = ref(false)
const showSceneModal = ref(false)
const showUpscaleModal = ref(false)
const currentPrompt = ref('')
const videoToView = ref(null)
const videoToConnect = ref(null)
const videoToUpscale = ref(null)
// const realtimeChannel = ref(null) - Realtime 제거
const videoRefs = ref({})
let pollingInterval = null

// 모달 상태를 store와 동기화
watch(showGenerationModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})

watch(showDetailModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})

watch(showSceneModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})

watch(showUpscaleModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})

// 컬럼 수 상태 (localStorage에 저장)
const savedColumns = localStorage.getItem('videoGenerationGalleryColumns')
const columnCount = ref(savedColumns ? parseInt(savedColumns) : 3)

const updateColumnCount = (count) => {
  columnCount.value = count
  localStorage.setItem('videoGenerationGalleryColumns', count.toString())
}

// Computed
const processingVideos = computed(() => {
  return videos.value.filter(
    v => v.generation_status === 'pending' || v.generation_status === 'processing'
  )
})

const filteredVideos = computed(() => {
  let filtered = videos.value.filter(v => v.generation_status === 'completed' || v.generation_status === 'failed')
  
  // 보관함 필터링
  if (showKeptOnly.value) {
    filtered = filtered.filter(v => v.is_kept === true)
  } else {
    filtered = filtered.filter(v => !v.is_kept)
  }
  
  // 모델 필터링
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

const toggleKeep = async (video) => {
  try {
    const newKeptStatus = !video.is_kept
    const { error } = await supabase
      .from('gen_videos')
      .update({ is_kept: newKeptStatus })
      .eq('id', video.id)
    
    if (error) throw error
    
    // 로컬 상태 업데이트
    video.is_kept = newKeptStatus
    
    // 갤러리 재로드
    await fetchVideos()
  } catch (error) {
    console.error('보관함 토글 실패:', error)
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

const deleteVideo = async (video) => {
  if (!confirm('이 비디오를 삭제하시겠습니까?')) {
    return
  }
  
  try {
    // Storage에서 비디오 파일 삭제
    if (video.storage_video_url) {
      // Storage URL에서 파일 경로 추출
      const url = new URL(video.storage_video_url)
      const pathParts = url.pathname.split('/storage/v1/object/public/gen-videos/')
      if (pathParts[1]) {
        const { error: storageError } = await supabase.storage
          .from('gen-videos')
          .remove([pathParts[1]])
        
        if (storageError) {
          console.error('Storage 비디오 삭제 실패:', storageError)
        }
      }
    }
    
    // 썸네일도 삭제 (있는 경우)
    if (video.thumbnail_url && video.thumbnail_url.includes('gen-videos')) {
      const thumbUrl = new URL(video.thumbnail_url)
      const thumbParts = thumbUrl.pathname.split('/storage/v1/object/public/gen-videos/')
      if (thumbParts[1]) {
        const { error: thumbError } = await supabase.storage
          .from('gen-videos')
          .remove([thumbParts[1]])
        
        if (thumbError) {
          console.error('썸네일 삭제 실패:', thumbError)
        }
      }
    }
    
    // DB에서 레코드 삭제
    const { error } = await supabase
      .from('gen_videos')
      .delete()
      .eq('id', video.id)
    
    if (error) throw error
    
    // 로컬 상태에서 제거
    const index = videos.value.findIndex(v => v.id === video.id)
    if (index !== -1) {
      videos.value.splice(index, 1)
    }
    
    console.log('비디오가 삭제되었습니다.')
  } catch (error) {
    console.error('비디오 삭제 실패:', error)
    alert('비디오 삭제에 실패했습니다.')
  }
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

const openUpscaleModal = (video) => {
  videoToUpscale.value = video
  showUpscaleModal.value = true
  showDetailModal.value = false
}

const handleUpscaleSuccess = (result) => {
  console.log('업스케일 시작됨:', result)
  // 폴링 시작하여 업스케일 진행 상황 추적
  startPolling()
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
  // 개발 환경에서만 폴링 실행
  if (import.meta.env.MODE !== 'development') {
    console.log('Not in development mode, skipping polling')
    return
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      stopPolling()
      return
    }
    
    // AbortController로 타임아웃 설정 (3초)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const response = await fetch('/.netlify/functions/processVideoQueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({}),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const result = await response.json()
      
      // 항상 갤러리를 새로고침하여 상태 업데이트
      console.log('비디오 큐 처리 결과:', result.summary)
      await fetchVideos() // 갤러리 데이터 새로고침
      
      // 더 이상 처리 중인 비디오가 없으면 폴링 중지
      if (result.summary && result.summary.processing === 0 && result.summary.pending === 0) {
        console.log('모든 비디오 처리 완료, 폴링 중지')
        stopPolling()
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Polling request timed out (expected in dev)')
    } else {
      console.error('Polling error:', error)
    }
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

// 웹훅 업데이트 처리
const handleMediaUpdate = (event) => {
  const update = event.detail
  console.log('Video gallery received media update:', update)
  
  // 비디오 완료 업데이트인 경우
  if (update.event === 'video-completed' && update.project_id === props.projectId) {
    // 갤러리 새로고침
    fetchVideos()
  }
}

// Lifecycle
onMounted(async () => {
  await fetchVideos()
  // setupRealtimeSubscription() - Realtime 제거, 폴링 사용
  
  // 개발 환경에서는 폴링 사용
  if (import.meta.env.MODE === 'development') {
    if (processingVideos.value.length > 0) {
      startPolling()
    }
  } else {
    // 프로덕션 환경에서는 Realtime 구독
    productionStore.setupRealtimeSubscription(props.projectId)
  }
  
  // 미디어 업데이트 이벤트 리스너 등록
  window.addEventListener('media-update', handleMediaUpdate)
})

onUnmounted(() => {
  // cleanupRealtimeSubscription() - Realtime 제거
  stopPolling()
  
  // 프로덕션 환경에서 Realtime 구독 해제
  if (import.meta.env.MODE === 'production') {
    productionStore.cleanupRealtimeSubscription()
  }
  
  // 이벤트 리스너 제거
  window.removeEventListener('media-update', handleMediaUpdate)
})

// projectId 변경 감지
watch(() => props.projectId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    // 비디오 목록 초기화 및 새 데이터 로드
    videos.value = []
    processingVideos.value = []
    loading.value = true
    filterModel.value = 'all'
    await fetchVideos()
  }
})

// Method to set filter model from parent
const setFilterModel = (model) => {
  filterModel.value = model
}

const toggleKeptView = (showKept) => {
  showKeptOnly.value = showKept
}

// Expose method for parent component
defineExpose({
  openGenerationModal,
  setFilterModel,
  filterModel,
  toggleKeptView
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

/* Gallery controls */
.gallery-controls {
  margin-bottom: 1rem;
  display: flex;
  justify-content: flex-end;
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
  column-gap: 20px;
  padding: 0;
  transition: column-count 0.3s ease;
}

/* 반응형 미디어 쿼리는 컬럼 컨트롤이 없을 때만 적용 */
@media (max-width: 1440px) {
  .video-grid:not([style*="column-count"]) {
    column-count: 3;
  }
}

@media (max-width: 900px) {
  .video-grid:not([style*="column-count"]) {
    column-count: 2;
  }
}

@media (max-width: 600px) {
  .video-grid {
    column-count: 1 !important; /* 모바일에서는 항상 1열 */
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
  opacity: 0.3;
  width: 100%;
  min-height: 150px;
  aspect-ratio: 16/9;
  color: var(--text-secondary);
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
.btn-keep,
.btn-download,
.btn-delete {
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

.btn-delete {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.btn-scene-link:hover,
.btn-favorite:hover,
.btn-keep:hover,
.btn-download:hover,
.btn-delete:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.4);
  color: white;
}

.btn-favorite.active {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.3);
}

.btn-keep.active {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.3);
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
  margin-bottom: 16px;
  opacity: 0.5;
  color: var(--text-secondary);
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.hint {
  font-size: 0.9rem;
  color: var(--text-tertiary);
}

/* 실패한 비디오 스타일 */
.failed-card {
  border-color: rgba(239, 68, 68, 0.5) !important;
  background: var(--bg-secondary);
}

.failed-preview {
  background: rgba(239, 68, 68, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.failed-content {
  text-align: center;
  padding: 20px;
}

.failed-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.failed-text {
  font-size: 1rem;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 4px;
}

.failed-model {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.failed-reason {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  max-width: 200px;
  word-wrap: break-word;
  line-height: 1.3;
  margin: 0 auto;
}

/* 모바일 반응형 스타일 */
@media (max-width: 768px) {
  .video-generation-gallery {
    padding: 10px 0;
  }
  
  .gallery-section {
    padding: 0 10px;
  }
  
  .loading-state,
  .processing-item,
  .failed-content {
    padding: 40px 10px;
  }
}

@media (max-width: 480px) {
  .video-generation-gallery {
    padding: 5px 0;
  }
  
  .gallery-section {
    padding: 0 5px;
  }
  
  .loading-state,
  .processing-item,
  .failed-content {
    padding: 30px 5px;
  }
}
</style>