<template>
  <div class="avatar-video-gallery">

    <!-- 갤러리 섹션 -->
    <div class="gallery-section">
      <!-- 컬럼 컨트롤 -->
      <div v-if="(completedAvatarVideos.length > 0 || processingAvatarVideos.length > 0) && !isMobile" class="gallery-controls">
        <ColumnControl 
          v-model="columnCount"
          :min-columns="2"
          :max-columns="4"
          @change="updateColumnCount"
        />
      </div>
      
      <!-- 로딩 상태 -->
      <div v-if="loading && avatarVideos.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>아바타 비디오를 불러오는 중...</p>
      </div>

      <!-- 빈 상태 -->
      <div v-if="!loading && completedAvatarVideos.length === 0 && processingAvatarVideos.length === 0" class="empty-state">
        <User :size="48" class="empty-icon" />
        <p>아직 생성된 아바타 비디오가 없습니다.</p>
        <p class="hint">아바타 비디오 생성 버튼을 눌러 시작하세요.</p>
      </div>

      <!-- 갤러리 그리드 -->
      <div v-else class="avatar-grid" :style="{ columnCount: columnCount }">
        <!-- 처리 중인 아바타 비디오 -->
        <div 
          v-for="video in processingAvatarVideos" 
          :key="video.id"
          class="gallery-item processing-card"
        >
          <div class="avatar-wrapper processing-wrapper">
            <div class="processing-animation">
              <div class="spinner"></div>
              <p class="processing-text">아바타 생성 중...</p>
              <p class="processing-title">{{ video.title || '제목 없음' }}</p>
            </div>
            <div class="avatar-meta">
              <p class="script-preview">{{ truncateText(video.metadata?.script, 50) }}</p>
            </div>
          </div>
        </div>

        <!-- 완료된 아바타 비디오 -->
        <div 
          v-for="video in completedAvatarVideos" 
          :key="video.id"
          class="gallery-item avatar-card"
          @click="playVideo(video)"
        >
          <div class="avatar-wrapper">
            <video 
              v-if="video.result_url"
              :src="video.result_url"
              :poster="video.metadata?.thumbnail_url"
              class="avatar-video"
              preload="metadata"
              @click.stop="togglePlay($event)"
            >
              <source :src="video.result_url" type="video/mp4">
            </video>
            <div v-else class="video-placeholder">
              <User :size="32" />
              <span>비디오 준비 중...</span>
            </div>
            
            <!-- 재생 버튼 오버레이 -->
            <div class="play-overlay">
              <Play :size="32" fill="white" />
            </div>
          </div>
          
          <div class="avatar-meta">
            <h3 class="avatar-title">{{ video.title || '제목 없음' }}</h3>
            <p class="script-preview">{{ truncateText(video.metadata?.script, 80) }}</p>
            <div class="avatar-info">
              <span class="avatar-id">{{ getAvatarName(video.metadata?.avatar_id) }}</span>
              <span class="created-date">{{ formatDate(video.created_at) }}</span>
            </div>
            
            <!-- 액션 버튼 -->
            <div class="avatar-actions">
              <button 
                @click.stop="downloadVideo(video)"
                class="action-btn"
                title="다운로드"
              >
                <Download :size="16" />
              </button>
              <button 
                @click.stop="copyVideoUrl(video)"
                class="action-btn"
                title="링크 복사"
              >
                <Copy :size="16" />
              </button>
              <button 
                @click.stop="deleteVideo(video)"
                class="action-btn delete"
                title="삭제"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { User, Play, Download, Copy, Trash2 } from 'lucide-vue-next'
import { useGenerationStore } from '@/stores/generation'
import ColumnControl from '@/components/common/ColumnControl.vue'

const generationStore = useGenerationStore()
const columnCount = ref(3)
const isMobile = ref(false)
let pollInterval = null

// Computed properties
const loading = computed(() => generationStore.loading.avatarVideos)
const avatarVideos = computed(() => generationStore.avatarVideos)
const completedAvatarVideos = computed(() => generationStore.completedAvatarVideos)
const processingAvatarVideos = computed(() => generationStore.processingAvatarVideos)

// 아바타 이름 매핑
const avatarNames = {
  'josh_lite3_20230714': 'Josh',
  'susan_lite3_20231128': 'Susan',
  'tyler_front_casual': 'Tyler'
}

// Methods
const updateColumnCount = (count) => {
  columnCount.value = count
}

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const playVideo = (video) => {
  if (video.result_url) {
    window.open(video.result_url, '_blank')
  }
}

const togglePlay = (event) => {
  const video = event.target
  if (video.paused) {
    video.play()
  } else {
    video.pause()
  }
}

const downloadVideo = async (video) => {
  if (!video.result_url) return
  
  try {
    const response = await fetch(video.result_url)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `avatar_video_${video.id}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
    alert('다운로드에 실패했습니다.')
  }
}

const copyVideoUrl = (video) => {
  if (!video.result_url) return
  
  navigator.clipboard.writeText(video.result_url).then(() => {
    alert('비디오 링크가 복사되었습니다.')
  }).catch(() => {
    alert('링크 복사에 실패했습니다.')
  })
}

const deleteVideo = async (video) => {
  if (!confirm('이 아바타 비디오를 삭제하시겠습니까?')) return
  
  try {
    await generationStore.deleteGeneration(video.id, 'avatar_video')
    alert('아바타 비디오가 삭제되었습니다.')
  } catch (error) {
    console.error('Delete failed:', error)
    alert('삭제에 실패했습니다.')
  }
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const getAvatarName = (avatarId) => {
  return avatarNames[avatarId] || avatarId || '알 수 없음'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const startPolling = () => {
  // 처리 중인 비디오가 있을 때만 폴링 시작
  if (processingAvatarVideos.value.length > 0) {
    pollInterval = setInterval(async () => {
      try {
        await generationStore.pollAvatarVideos()
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 10000) // 10초마다 상태 확인
  }
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Lifecycle
onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // 아바타 비디오 로드
  await generationStore.loadGenerations()
  
  // 폴링 시작
  startPolling()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  stopPolling()
})

// 처리 중인 비디오 상태 변화 감지
const unwatchProcessing = computed(() => processingAvatarVideos.value.length)
unwatchProcessing.value // 반응성 활성화

// 처리 중인 비디오가 변경될 때 폴링 재시작
const restartPolling = () => {
  stopPolling()
  if (processingAvatarVideos.value.length > 0) {
    startPolling()
  }
}

// 처리 중인 비디오 변화 감지
let lastProcessingCount = processingAvatarVideos.value.length
setInterval(() => {
  const currentCount = processingAvatarVideos.value.length
  if (currentCount !== lastProcessingCount) {
    lastProcessingCount = currentCount
    restartPolling()
  }
}, 1000)
</script>

<style scoped>
.avatar-video-gallery {
  max-width: 1400px;
  margin: 0 auto;
}


.gallery-controls {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  color: #adb5bd;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 8px 0;
  color: #6c757d;
}

.empty-state .hint {
  font-size: 14px;
  color: #adb5bd;
}

.avatar-grid {
  column-gap: 16px;
}

.gallery-item {
  display: inline-block;
  width: 100%;
  margin-bottom: 16px;
  break-inside: avoid;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.avatar-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.processing-card {
  opacity: 0.8;
}

.avatar-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #f8f9fa;
  overflow: hidden;
}

.processing-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.processing-animation {
  text-align: center;
}

.processing-text {
  margin: 8px 0 4px;
  font-size: 14px;
  color: #6c757d;
}

.processing-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #495057;
}

.avatar-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #adb5bd;
  gap: 8px;
}

.play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.avatar-card:hover .play-overlay {
  opacity: 1;
}

.avatar-meta {
  padding: 16px;
}

.avatar-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
  line-height: 1.4;
}

.script-preview {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #6c757d;
  line-height: 1.4;
}

.avatar-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: #adb5bd;
}

.avatar-id {
  font-weight: 500;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  color: #6c757d;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.action-btn.delete:hover {
  background: #dc3545;
  border-color: #dc3545;
  color: white;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .avatar-grid {
    column-count: 1 !important;
  }
  
  .gallery-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .btn-generate {
    justify-content: center;
  }
}

@media (max-width: 1024px) {
  .avatar-grid {
    column-count: 2 !important;
  }
}
</style>