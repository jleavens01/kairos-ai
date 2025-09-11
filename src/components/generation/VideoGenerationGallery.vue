<template>
  <div class="video-generation-gallery">
    <!-- 갤러리 섹션 -->
    <div class="gallery-section">
      <!-- 상단 컨트롤 -->
      <div v-if="(filteredVideos.length > 0 || processingVideos.length > 0)" class="gallery-header">
        <!-- 선택 모드 컨트롤 -->
        <div class="selection-controls">
          <button 
            @click="toggleSelectionMode"
            class="btn-selection-toggle"
            :class="{ active: selectionMode }"
          >
            <CheckSquare v-if="selectionMode" :size="16" />
            <Square v-else :size="16" />
            선택 모드
          </button>
          
          <div v-if="selectionMode" class="selection-info">
            <span class="selected-count">{{ selectedVideos.size }}개 선택됨</span>
            <button 
              @click="selectAllVideos"
              class="btn-select-all"
              v-if="selectedVideos.size < filteredVideos.length"
            >
              전체 선택
            </button>
            <button 
              @click="clearSelection"
              class="btn-clear-selection"
              v-else
            >
              선택 해제
            </button>
          </div>
          
          <div v-if="selectionMode && selectedVideos.size > 0" class="batch-actions">
            <button 
              @click="downloadSelectedVideos"
              class="btn-batch-download"
              :disabled="downloadingBatch"
            >
              <Download :size="16" />
              {{ downloadingBatch ? '다운로드 중...' : `선택된 ${selectedVideos.size}개 다운로드` }}
            </button>
            <button 
              v-if="canEdit"
              @click="deleteSelectedVideos"
              class="btn-batch-delete"
            >
              <Trash2 :size="16" />
              선택된 항목 삭제
            </button>
          </div>
        </div>
        
        <!-- 컬럼 컨트롤 (모바일에서는 숨김) -->
        <div v-if="!isMobile" class="column-control-wrapper">
          <ColumnControl 
            v-model="columnCount"
            :min-columns="2"
            :max-columns="6"
            @change="updateColumnCount"
          />
        </div>
      </div>
      
      <!-- 필터는 상위 컴포넌트로 이동 -->

      <div v-if="loading && videos.length === 0" class="loading-state">
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
          :class="{ 
            'failed-card': video.generation_status === 'failed',
            'selected': isMobile && selectedVideo?.id === video.id,
            'selection-mode': selectionMode,
            'video-selected': selectedVideos.has(video.id)
          }"
          @click="handleVideoClick(video)"
          @mouseenter="() => handleVideoHover(video.id, true)"
          @mouseleave="() => handleVideoHover(video.id, false)"
        >
          <div class="video-wrapper">
            <!-- 선택 체크박스 -->
            <div v-if="selectionMode" class="selection-checkbox" @click.stop="toggleVideoSelection(video)">
              <input 
                type="checkbox"
                :checked="selectedVideos.has(video.id)"
                @change="toggleVideoSelection(video)"
              />
            </div>
            <!-- 실패한 비디오 표시 -->
            <div v-if="video.generation_status === 'failed'" class="video-preview failed-preview">
              <div class="failed-content">
                <div class="failed-icon">❌</div>
                <p class="failed-text">생성 실패</p>
                <p class="failed-model">{{ getModelName(video.generation_model) }}</p>
                <p v-if="video.error_message" class="failed-reason">{{ video.error_message }}</p>
              </div>
            </div>
            <!-- 썸네일 기본 표시, 호버 시 비디오 미리보기 -->
            <div v-else class="video-preview">
              <!-- 호버 상태에서만 비디오 로드 -->
              <video 
                v-if="video.storage_video_url && hoveredVideoId === video.id"
                :ref="el => setVideoRef(el, video.id)"
                :src="video.storage_video_url"
                :autoplay="true"
                muted
                loop
                preload="auto"
                playsinline
                webkit-playsinline
                @loadedmetadata="onVideoMetadataLoaded"
                class="preview-video hover-video"
              ></video>
              <!-- 기본 썸네일 이미지 (reference_image_url 사용, 항상 표시) -->
              <LazyImage 
                v-if="video.reference_image_url"
                :src="video.reference_image_url"
                :alt="video.description || 'Video thumbnail'"
                root-margin="200px"
                :class="{ 'thumbnail-hidden': hoveredVideoId === video.id && video.storage_video_url }"
              />
              <div v-else class="no-preview">
                <Video :size="48" />
              </div>
            </div>

            <!-- 업스케일 표시 -->
            <div v-if="video.upscale_status === 'completed'" class="upscale-badge">
              <span class="upscale-icon">⬆</span>
              {{ video.upscale_factor }}x
            </div>
            
            <!-- 업스케일 진행 중 오버레이 -->
            <div v-if="video.upscale_status === 'processing'" class="upscale-processing-overlay">
              <div class="upscale-processing-content">
                <div class="upscale-spinner"></div>
                <p class="upscale-text">업스케일 {{ video.upscale_factor }}x 처리 중...</p>
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
                  v-if="canEdit"
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
                <p v-if="video.file_size || video.upscale_file_size" class="video-file-size" 
                   :class="getFileSizeColorClass(video.upscale_file_size || video.file_size)">
                  {{ formatFileSize(video.upscale_file_size || video.file_size) }}
                  <span v-if="video.upscale_file_size && video.file_size" class="upscaled-badge">업스케일</span>
                </p>
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
      
      <!-- 페이지네이션 컨트롤 -->
      <div v-if="totalPages > 1" class="pagination-controls">
        <button 
          @click="firstPage"
          :disabled="currentPage === 1"
          class="page-btn"
        >
          <ChevronFirst :size="16" />
        </button>
        <button 
          @click="previousPage"
          :disabled="currentPage === 1"
          class="page-btn"
        >
          <ChevronLeft :size="16" />
        </button>
        
        <button
          v-for="page in pageButtons"
          :key="page"
          @click="goToPage(page)"
          :class="['page-btn', { active: page === currentPage }]"
        >
          {{ page }}
        </button>
        
        <button 
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          <ChevronRight :size="16" />
        </button>
        <button 
          @click="lastPage"
          :disabled="currentPage === totalPages"
          class="page-btn"
        >
          <ChevronLast :size="16" />
        </button>
        
        <div class="page-info">
          <span>{{ currentPage }} / {{ totalPages }} 페이지</span>
          <span class="total-count">(총 {{ totalCount }}개)</span>
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
    
    <!-- 다운로드 선택 모달 -->
    <div v-if="showDownloadModal" class="modal-overlay" @click.self="showDownloadModal = false">
      <div class="download-modal">
        <h3 class="modal-title">비디오 다운로드</h3>
        <p class="modal-message">
          {{ videoToDownload?.upscale_video_url ? '다운로드할 버전을 선택하세요:' : '원본 비디오를 다운로드하시겠습니까?' }}
        </p>
        <div class="modal-buttons">
          <button 
            v-if="videoToDownload?.upscale_video_url"
            @click="performDownload('upscaled')"
            class="btn btn-primary"
          >
            업스케일 버전 (고화질)
          </button>
          <button 
            @click="performDownload('original')"
            class="btn"
            :class="videoToDownload?.upscale_video_url ? 'btn-secondary' : 'btn-primary'"
          >
            원본 버전
          </button>
          <button 
            @click="showDownloadModal = false; videoToDownload = null"
            class="btn btn-ghost"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '@/utils/supabase'
import { useProductionStore } from '@/stores/production'
import VideoGenerationModal from './VideoGenerationModal.vue'
import VideoDetailModal from './VideoDetailModal.vue'
import VideoUpscaleModal from './VideoUpscaleModal.vue'
import { Plus, Link, Download, Trash2, Loader, Clock, AlertCircle, Video, Star, Archive, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast, CheckSquare, Square } from 'lucide-vue-next'
import SceneConnectionModal from './SceneConnectionModal.vue'
import ColumnControl from '@/components/common/ColumnControl.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import { formatFileSize, getFileSizeColorClass } from '@/utils/fileSize'

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

// Store
const productionStore = useProductionStore()

// State
const videos = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20) // 페이지당 20개
const totalCount = ref(0)
const filterModel = ref('')
const showKeptOnly = ref(false)
const showGenerationModal = ref(false)
const showDetailModal = ref(false)
const showSceneModal = ref(false)
const showUpscaleModal = ref(false)
const showDownloadModal = ref(false)
const currentPrompt = ref('')
const videoToView = ref(null)
const videoToConnect = ref(null)
const videoToUpscale = ref(null)
const videoToDownload = ref(null)
const selectedVideo = ref(null) // 모바일에서 선택된 비디오 추적
const videoRefs = ref({})
let pollingInterval = null

// 일괄 선택 관련 상태
const selectionMode = ref(false)
const selectedVideos = ref(new Set())
const downloadingBatch = ref(false)

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

watch(showDownloadModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})

// 호버된 비디오 ID
const hoveredVideoId = ref(null)

// 모바일 여부 감지
const isMobile = ref(window.innerWidth <= 768)
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
  // 모바일에서는 컬럼 수를 2로 고정
  if (isMobile.value) {
    columnCount.value = 2
  }
}

// 컬럼 수 상태 (localStorage에 저장)
const savedColumns = localStorage.getItem('videoGenerationGalleryColumns')
const columnCount = ref(isMobile.value ? 2 : (savedColumns ? parseInt(savedColumns) : 3))

const updateColumnCount = (count) => {
  if (!isMobile.value) {
    columnCount.value = count
    localStorage.setItem('videoGenerationGalleryColumns', count.toString())
  }
}

// 페이지 총 개수 계산
const totalPages = computed(() => {
  return Math.ceil(totalCount.value / pageSize.value)
})

// 페이지 이동
const goToPage = async (page) => {
  if (page < 1 || page > totalPages.value || loading.value) return
  currentPage.value = page
  await fetchVideos()
}

// 이전 페이지
const previousPage = () => {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1)
  }
}

// 다음 페이지
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1)
  }
}

// 첫 페이지
const firstPage = () => {
  goToPage(1)
}

// 마지막 페이지
const lastPage = () => {
  goToPage(totalPages.value)
}

// 페이지 버튼 생성 (현재 페이지 주변 5개)
const pageButtons = computed(() => {
  const buttons = []
  const maxButtons = 5
  const halfButtons = Math.floor(maxButtons / 2)
  
  let startPage = Math.max(1, currentPage.value - halfButtons)
  let endPage = Math.min(totalPages.value, startPage + maxButtons - 1)
  
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1)
  }
  
  for (let i = startPage; i <= endPage; i++) {
    buttons.push(i)
  }
  
  return buttons
})

// 삭제된 무한 스크롤 핸들러
// const handleScroll = (event) => {
// }

// 리사이즈 이벤트 리스너 추가
window.addEventListener('resize', handleResize)

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Computed
const processingVideos = computed(() => {
  // 업스케일 중인 비디오는 제외 - 기존 카드에 오버레이로 표시됨
  return videos.value.filter(
    v => v.generation_status === 'pending' || v.generation_status === 'processing'
  )
})

// 업스케일 중인 비디오 추적
const upscalingVideos = computed(() => {
  return videos.value.filter(v => v.upscale_status === 'processing')
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
// 비디오 가져오기
const fetchVideos = async () => {
  loading.value = true
  const from = (currentPage.value - 1) * pageSize.value
  const to = from + pageSize.value - 1
  
  try {
    let query = supabase
      .from('gen_videos')
      .select('*', { count: 'exact' })
      .eq('project_id', props.projectId)
    
    // 보관함 필터링
    if (showKeptOnly.value) {
      query = query.eq('is_kept', true)
    } else {
      query = query.or('is_kept.is.null,is_kept.eq.false')
    }
    
    // 모델 필터링
    if (filterModel.value && filterModel.value !== 'all') {
      query = query.eq('generation_model', filterModel.value)
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
    
    if (error) throw error
    
    videos.value = data || []
    totalCount.value = count || 0
  } catch (error) {
    console.error('Error fetching videos:', error)
    videos.value = []
    totalCount.value = 0
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


const handleVideoClick = (video) => {
  // 선택 모드일 때는 선택 토글
  if (selectionMode.value) {
    toggleVideoSelection(video)
    return
  }
  
  if (isMobile.value) {
    // 모바일에서는 첫 클릭은 선택, 이미 선택된 비디오를 다시 클릭하면 상세보기
    if (selectedVideo.value?.id === video.id) {
      openDetailModal(video)
    } else {
      selectedVideo.value = video
    }
  } else {
    // 데스크톱에서는 바로 상세보기
    openDetailModal(video)
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

const downloadVideo = (video) => {
  if (video.storage_video_url) {
    videoToDownload.value = video
    showDownloadModal.value = true
  }
}

const performDownload = async (downloadType) => {
  const video = videoToDownload.value
  if (!video || !video.storage_video_url) return
  
  showDownloadModal.value = false
  
  try {
    let videoUrl = video.storage_video_url
    let versionSuffix = ''
    
    // 다운로드 타입에 따라 URL 선택
    if (downloadType === 'upscaled' && video.upscale_video_url) {
      videoUrl = video.upscale_video_url
      versionSuffix = '_upscaled'
    } else if (downloadType === 'original') {
      // 원본 사용 (기본값)
      videoUrl = video.storage_video_url
      versionSuffix = ''
    } else {
      // 취소된 경우
      videoToDownload.value = null
      return
    }
    
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
    const fileName = `video_${sanitizedProjectName}_${sceneNumber}${versionSuffix}.mp4`
    
    // 비디오 다운로드
    const response = await fetch(videoUrl)
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
    videoToDownload.value = null
  } catch (error) {
    console.error('Video download error:', error)
    // 실패 시 기본 다운로드
    const link = document.createElement('a')
    link.href = video.storage_video_url
    link.download = `video_${video.id}.mp4`
    link.click()
    videoToDownload.value = null
  }
}

// 일괄 선택 관련 함수들
const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    selectedVideos.value.clear()
  }
}

const toggleVideoSelection = (video) => {
  if (selectedVideos.value.has(video.id)) {
    selectedVideos.value.delete(video.id)
  } else {
    selectedVideos.value.add(video.id)
  }
}

const selectAllVideos = () => {
  filteredVideos.value.forEach(video => {
    if (video.storage_video_url) { // 다운로드 가능한 비디오만 선택
      selectedVideos.value.add(video.id)
    }
  })
}

const clearSelection = () => {
  selectedVideos.value.clear()
}

const downloadSelectedVideos = async () => {
  if (selectedVideos.value.size === 0) return
  
  downloadingBatch.value = true
  
  try {
    // 프로젝트 정보 가져오기
    const { data: projectData } = await supabase
      .from('projects')
      .select('name')
      .eq('id', props.projectId)
      .single()
    
    const projectName = projectData?.name || 'untitled'
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
    
    // 선택된 비디오들 가져오기
    const selectedVideoList = filteredVideos.value.filter(video => 
      selectedVideos.value.has(video.id) && video.storage_video_url
    )
    
    // 순차적으로 다운로드 (브라우저 제한으로 인해)
    for (let i = 0; i < selectedVideoList.length; i++) {
      const video = selectedVideoList[i]
      
      try {
        // 업스케일 버전이 있으면 우선 다운로드
        const videoUrl = video.upscale_video_url || video.storage_video_url
        const versionSuffix = video.upscale_video_url ? '_upscaled' : ''
        const sceneNumber = video.linked_scene_number || `video_${i + 1}`
        
        // 파일명 생성
        const fileName = `${sanitizedProjectName}_${sceneNumber}${versionSuffix}.mp4`
        
        // 비디오 다운로드
        const response = await fetch(videoUrl)
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
        
        // 다운로드 간 잠시 대기 (브라우저 제한 회피)
        if (i < selectedVideoList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Video download error for ${video.id}:`, error)
        // 실패한 경우 기본 다운로드 시도
        const link = document.createElement('a')
        link.href = video.storage_video_url
        link.download = `video_${video.id}.mp4`
        link.click()
      }
    }
    
    // 다운로드 완료 후 선택 해제
    selectedVideos.value.clear()
    selectionMode.value = false
    
    // 성공 메시지 표시
    const successMessage = `${selectedVideoList.length}개의 비디오 다운로드가 완료되었습니다.`
    alert(successMessage)
    
  } catch (error) {
    console.error('Batch download error:', error)
    alert('일괄 다운로드 중 오류가 발생했습니다.')
  } finally {
    downloadingBatch.value = false
  }
}

const deleteSelectedVideos = async () => {
  if (selectedVideos.value.size === 0) return
  
  const confirmMessage = `선택된 ${selectedVideos.value.size}개의 비디오를 삭제하시겠습니까?`
  if (!confirm(confirmMessage)) return
  
  try {
    const selectedIds = Array.from(selectedVideos.value)
    
    // DB에서 삭제 (soft delete)
    const { error } = await supabase
      .from('generated_videos')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', selectedIds)
    
    if (error) throw error
    
    // 로컬 상태에서 제거
    videos.value = videos.value.filter(video => !selectedIds.includes(video.id))
    
    // 선택 해제
    selectedVideos.value.clear()
    selectionMode.value = false
    
    // 성공 메시지
    alert(`${selectedIds.length}개의 비디오가 삭제되었습니다.`)
    
  } catch (error) {
    console.error('Batch delete error:', error)
    alert('비디오 삭제 중 오류가 발생했습니다.')
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
  // 호버 상태 업데이트
  hoveredVideoId.value = isHovering ? videoId : null
  
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

const handleUpscaleSuccess = async (result) => {
  console.log('업스케일 시작됨:', result)
  // 즉시 비디오 목록 새로고침하여 업스케일 상태 표시
  await fetchVideos()
  // 폴링 시작하여 업스케일 진행 상황 추적
  startPolling()
}

// 업스케일 상태 확인
const checkUpscaleStatuses = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    
    for (const video of upscalingVideos.value) {
      // metadata에서 upscale_request_id 확인
      const upscaleRequestId = video.metadata?.upscale_request_id || video.metadata?.fal_request_id
      if (!upscaleRequestId) {
        console.log(`No upscale request ID for video ${video.id}`)
        continue
      }
      
      console.log(`Checking upscale status for video ${video.id}, request: ${upscaleRequestId}`)
      
      try {
        const response = await fetch('/.netlify/functions/checkUpscaleStatus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            requestId: upscaleRequestId,
            videoId: video.id,
            metadata: video.metadata
          })
        })
        
        if (!response.ok) {
          console.error('Failed to check upscale status:', await response.text())
          continue
        }
        
        const result = await response.json()
        console.log('Upscale status result:', result)
        
        // 상태가 변경되면 비디오 목록 새로고침
        if (result.status === 'completed' || result.status === 'failed') {
          await fetchVideos()
        }
      } catch (error) {
        console.error(`Error checking upscale status for video ${video.id}:`, error)
      }
    }
  } catch (error) {
    console.error('Error in checkUpscaleStatuses:', error)
  }
}

// 비디오들을 실패 상태로 표시
const markVideosAsFailed = async (videoIds, errorMessage = '생성 실패') => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from('ai_videos')
      .update({
        generation_status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .in('id', videoIds)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Failed to mark videos as failed:', error)
    } else {
      console.log(`✅ ${videoIds.length}개 비디오를 실패 처리했습니다`)
    }
  } catch (error) {
    console.error('Error marking videos as failed:', error)
  }
}

// 폴링 관련
const startPolling = () => {
  if (pollingInterval) return
  
  // 폴링 시작 시간 기록
  const startTime = Date.now()
  let forceCheckDone = false
  
  // 즉시 한 번 실행
  callPollingWorker()
  
  // 5초마다 폴링
  pollingInterval = setInterval(async () => {
    const elapsedTime = Date.now() - startTime
    
    // 5분(300초) 경과 시 강제로 상태 체크 1회 실행
    if (!forceCheckDone && elapsedTime > 300000) {
      console.log('🔍 비디오 5분 경과 - 강제 상태 체크 실행')
      forceCheckDone = true
      await callPollingWorker()
      
      // 여전히 processing 상태인 비디오들을 failed로 변경
      const stuckVideos = processingVideos.value.filter(video => {
        const videoStartTime = new Date(video.created_at).getTime()
        return Date.now() - videoStartTime > 300000 // 5분 이상 경과
      })
      
      if (stuckVideos.length > 0) {
        console.warn(`⚠️ 5분 초과 비디오 ${stuckVideos.length}개를 실패 처리합니다`)
        stuckVideos.forEach(video => {
          console.warn(`- ${video.prompt} (ID: ${video.id})`)
        })
        await markVideosAsFailed(stuckVideos.map(video => video.id), '생성 시간 초과 (5분)')
        await loadVideos() // 갤러리 새로고침
      }
    }
    
    // 처리 중인 비디오나 업스케일 중인 비디오가 있으면 계속
    if (processingVideos.value.length === 0 && upscalingVideos.value.length === 0) {
      stopPolling()
      return
    }
    await callPollingWorker()
    
    // 업스케일 중인 비디오 상태 확인
    if (upscalingVideos.value.length > 0) {
      await checkUpscaleStatuses()
    }
  }, 5000)
  
  // 7분 후 자동 중지 (5분 강제체크 + 2분 추가)
  setTimeout(() => {
    console.log('⏰ 비디오 폴링 시간 제한 도달')
    stopPolling()
  }, 420000)
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

// 실패 복구 시스템 업데이트 처리
const handleGenerationStatusUpdated = async (event) => {
  const update = event.detail
  console.log('Video generation status updated:', update)
  
  if (update.type === 'recovery') {
    // 실패 복구에 의한 업데이트이므로 갤러리 새로고침
    await fetchVideos()
    console.log('Video gallery refreshed due to recovery system')
  }
}

// Lifecycle
onMounted(async () => {
  await fetchVideos()
  
  // 개발 환경에서는 폴링 사용
  if (import.meta.env.MODE === 'development') {
    if (processingVideos.value.length > 0 || upscalingVideos.value.length > 0) {
      startPolling()
    }
  } else {
    // 프로덕션 환경에서도 폴링 사용 (Realtime 비용 문제로 임시 비활성화)
    // productionStore.setupRealtimeSubscription(props.projectId)
    
    // 프로덕션에서도 처리 중인 비디오가 있으면 폴링
    if (processingVideos.value.length > 0 || upscalingVideos.value.length > 0) {
      console.log(`[Production] Found ${processingVideos.value.length} processing, ${upscalingVideos.value.length} upscaling videos, starting polling...`)
      startPolling()
    }
  }
  
  // 미디어 업데이트 이벤트 리스너 등록
  window.addEventListener('media-update', handleMediaUpdate)
  // 실패 복구 시스템 이벤트 리스너 등록
  window.addEventListener('generation-status-updated', handleGenerationStatusUpdated)
})

onUnmounted(() => {
  // cleanupRealtimeSubscription() - Realtime 제거
  stopPolling()
  
  // 프로덕션 환경에서 Realtime 구독 해제 - 비활성화
  // if (import.meta.env.MODE === 'production') {
  //   productionStore.cleanupRealtimeSubscription()
  // }
  
  // 이벤트 리스너 제거
  window.removeEventListener('media-update', handleMediaUpdate)
  window.removeEventListener('generation-status-updated', handleGenerationStatusUpdated)
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
const setFilterModel = async (model) => {
  filterModel.value = model
  currentPage.value = 1 // 필터 변경 시 첫 페이지로
  await fetchVideos()
}

const toggleKeptView = async (showKept) => {
  showKeptOnly.value = showKept
  currentPage.value = 1 // 필터 변경 시 첫 페이지로
  await fetchVideos()
}

// Expose method for parent component
defineExpose({
  openGenerationModal,
  setFilterModel,
  filterModel,
  toggleKeptView,
  refresh: fetchVideos
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

/* Gallery header */
.gallery-header {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.selection-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-selection-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-selection-toggle:hover {
  background: var(--bg-tertiary);
}

.btn-selection-toggle.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-count {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.btn-select-all, .btn-clear-selection {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-select-all:hover, .btn-clear-selection:hover {
  background: var(--bg-tertiary);
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-batch-download, .btn-batch-delete {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-batch-download {
  background: var(--primary-color);
  color: white;
}

.btn-batch-download:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-batch-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-batch-delete {
  background: #dc3545;
  color: white;
}

.btn-batch-delete:hover {
  background: #c82333;
}

.column-control-wrapper {
  display: flex;
  justify-content: flex-end;
}

/* Gallery controls (기존 호환성 유지) */
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
  min-height: 200px;
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

/* 선택 모드 스타일 */
.gallery-item.selection-mode {
  cursor: pointer;
}

.gallery-item.video-selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
  transform: scale(1.02);
}

.selection-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  padding: 4px;
}

.selection-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

/* 업스케일 배지 */
.upscale-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 4;
}

.upscale-icon {
  font-size: 0.85rem;
}

/* 모바일 선택 상태 */
@media (max-width: 768px) {
  .gallery-item.video-card.selected {
    border-color: var(--primary-color);
    box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
  }
  
  .gallery-item.video-card.selected .video-overlay-info {
    opacity: 1;
  }
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
}

.preview-video {
  transition: opacity 0.3s;
}

/* 호버 시 비디오 전환 효과 */
.hover-video {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  opacity: 1;
  transition: opacity 0.3s ease-in-out;
}

.thumbnail-hidden {
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.no-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
  width: 100%;
  min-height: 200px;
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
  z-index: 3;
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

/* 비디오 파일 크기 스타일 */
.video-file-size {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.upscaled-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
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
.empty-state,
.infinite-scroll-loader,
.no-more-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.infinite-scroll-loader {
  padding: 40px 20px;
}

.no-more-items {
  padding: 30px 20px;
  color: var(--text-secondary);
  font-size: 0.9rem;
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

/* 페이지네이션 스타일 */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px;
  margin-top: 40px;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
}

.page-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.page-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  font-weight: 600;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  margin-left: 16px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.total-count {
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .pagination-controls {
    padding: 15px 10px;
    gap: 4px;
  }
  
  .page-btn {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    font-size: 0.85rem;
  }
  
  .page-info {
    margin-left: 8px;
    font-size: 0.85rem;
    flex-direction: column;
    gap: 2px;
    align-items: flex-start;
  }
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

/* 업스케일 진행 중 오버레이 */
.upscale-processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 12px;
}

.upscale-processing-content {
  text-align: center;
  padding: 20px;
}

.upscale-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.3);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.upscale-text {
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* 다운로드 선택 모달 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

.download-modal {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
  text-align: center;
}

.modal-message {
  color: #666;
  text-align: center;
  margin-bottom: 24px;
  font-size: 0.95rem;
}

.modal-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-buttons .btn {
  width: 100%;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-buttons .btn-primary {
  background: #3b82f6;
  color: white;
}

.modal-buttons .btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.modal-buttons .btn-secondary {
  background: #6b7280;
  color: white;
}

.modal-buttons .btn-secondary:hover {
  background: #4b5563;
  transform: translateY(-1px);
}

.modal-buttons .btn-ghost {
  background: transparent;
  color: #666;
  border: 1px solid #e5e7eb;
}

.modal-buttons .btn-ghost:hover {
  background: #f3f4f6;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 다크 모드 지원 */
@media (prefers-color-scheme: dark) {
  .download-modal {
    background: #1f2937;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  }
  
  .modal-title {
    color: #f3f4f6;
  }
  
  .modal-message {
    color: #9ca3af;
  }
  
  .modal-buttons .btn-ghost {
    color: #9ca3af;
    border-color: #374151;
  }
  
  .modal-buttons .btn-ghost:hover {
    background: #374151;
  }
}
</style>