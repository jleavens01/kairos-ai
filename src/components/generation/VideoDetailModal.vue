<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container" @click.stop>
        <!-- 헤더 -->
        <div class="modal-header">
          <div class="header-info">
            <h3>🎬 비디오 상세보기</h3>
            <span v-if="video.generation_model" class="video-model">{{ getModelName(video.generation_model) }}</span>
          </div>
          <button @click="$emit('close')" class="close-btn">✕</button>
        </div>

        <!-- 메인 콘텐츠 -->
        <div class="modal-content">
          <!-- 비디오 영역 -->
          <div class="video-section">
            <video 
              v-if="video.storage_video_url"
              ref="videoElement"
              :src="video.storage_video_url"
              :poster="video.thumbnail_url"
              controls
              autoplay
              class="detail-video"
            ></video>
            <div v-else class="no-video">
              <span>🎬</span>
              <p>비디오를 불러올 수 없습니다</p>
            </div>
          </div>

          <!-- 정보 영역 -->
          <div class="info-section">
            <!-- 기본 정보 -->
            <div class="info-group">
              <h4>기본 정보</h4>
              <div class="info-item">
                <span class="label">모델:</span>
                <span class="value">{{ getModelName(video.generation_model) }}</span>
              </div>
              <div v-if="video.duration_seconds" class="info-item">
                <span class="label">길이:</span>
                <span class="value">{{ video.duration_seconds }}초</span>
              </div>
              <div class="info-item">
                <span class="label">해상도:</span>
                <span class="value">{{ video.resolution || getDefaultResolution(video) }}</span>
              </div>
              <div v-if="video.fps" class="info-item">
                <span class="label">FPS:</span>
                <span class="value">{{ video.fps }}</span>
              </div>
              <div v-if="video.aspect_ratio" class="info-item">
                <span class="label">비율:</span>
                <span class="value">{{ video.aspect_ratio }}</span>
              </div>
              <div class="info-item">
                <span class="label">생성일:</span>
                <span class="value">{{ formatDate(video.created_at) }}</span>
              </div>
              <div class="info-item">
                <span class="label">즐겨찾기:</span>
                <button 
                  @click="toggleFavorite"
                  class="favorite-btn"
                  :class="{ active: localFavorite }"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" :fill="localFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 프롬프트 -->
            <div class="info-group">
              <div class="group-header">
                <h4>프롬프트</h4>
                <button 
                  @click="copyPrompt" 
                  class="copy-btn"
                  title="프롬프트 복사"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
              </div>
              <div class="prompt-text">
                {{ video.prompt_used || video.custom_prompt || '프롬프트 정보 없음' }}
              </div>
            </div>

            <!-- 씬 연결 정보 -->
            <div v-if="localLinkedSceneId" class="info-group">
              <h4>씬 연결</h4>
              <div class="scene-link-info">
                <span class="scene-badge">씬 {{ currentLinkedSceneNumber }}</span>
                <button @click="unlinkFromScene" class="unlink-btn" title="연결 해제">
                  ✕
                </button>
              </div>
            </div>

            <!-- 프레임 캡처 섹션 -->
            <div class="info-group">
              <h4>프레임 캡처</h4>
              <div class="frame-capture-controls">
                <div class="capture-buttons">
                  <button @click="captureCurrentFrame" class="capture-btn" title="현재 프레임 캡처">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span>현재</span>
                  </button>
                  <button @click="captureFirstFrame" class="capture-btn" title="첫 프레임 캡처">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="11 19 2 12 11 5 11 19"/>
                      <line x1="22" y1="5" x2="22" y2="19"/>
                    </svg>
                    <span>첫 프레임</span>
                  </button>
                  <button @click="captureMiddleFrame" class="capture-btn" title="중간 프레임 캡처">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                    <span>중간</span>
                  </button>
                  <button @click="captureLastFrame" class="capture-btn" title="마지막 프레임 캡처">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="13 5 22 12 13 19 13 5"/>
                      <line x1="2" y1="5" x2="2" y2="19"/>
                    </svg>
                    <span>마지막</span>
                  </button>
                </div>
                <div v-if="capturingFrame" class="capturing-indicator">
                  캡처 중...
                </div>
              </div>
              
              <!-- 캡처된 프레임 미리보기 -->
              <div v-if="capturedFrames.length > 0" class="captured-frames">
                <h5>캡처된 프레임 ({{ capturedFrames.length }})</h5>
                <div class="frames-grid">
                  <div v-for="(frame, index) in capturedFrames" :key="index" class="frame-item">
                    <img :src="frame.dataUrl" :alt="`Frame at ${frame.time}s`" />
                    <div class="frame-info">
                      <span>{{ frame.time.toFixed(1) }}초</span>
                      <div class="frame-actions">
                        <button @click="downloadFrame(frame)" class="frame-btn" title="다운로드">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                        <button @click="saveFrameToSupabase(frame)" class="frame-btn" title="저장">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        </button>
                        <button @click="removeFrame(index)" class="frame-btn" title="삭제">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 액션 버튼들 -->
            <div class="action-buttons">
              <!-- 다운로드 버튼 (업스케일 버전이 있으면 드롭다운) -->
              <div v-if="video.upscale_status === 'completed'" class="download-dropdown">
                <button @click="toggleDownloadMenu" class="icon-btn" title="비디오 다운로드">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <div v-if="showDownloadMenu" class="download-menu">
                  <button @click="downloadVideo('original')" class="menu-item">
                    원본 다운로드
                  </button>
                  <button @click="downloadVideo('upscaled')" class="menu-item">
                    업스케일 {{ video.upscale_factor }}x 다운로드
                  </button>
                </div>
              </div>
              <button v-else @click="downloadVideo('original')" class="icon-btn" title="비디오 다운로드">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              <button @click="openUpscaleModal" class="icon-btn upscale-btn" title="비디오 업스케일">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 3l-6 6m6-6v5m0-5h-5"/>
                  <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>
                </svg>
              </button>
              <button @click="$emit('connect-scene', video)" class="icon-btn" title="씬에 연결">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
              <button v-if="capturedFrames.length > 0" @click="downloadAllFrames" class="icon-btn" title="모든 프레임 다운로드">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 3l-4 4-4-4"/>
                </svg>
              </button>
              <button v-if="hasChanges" @click="saveChanges" class="icon-btn btn-primary" title="변경사항 저장">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { VideoFrameExtractor } from '@/utils/videoFrameExtractor'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  video: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'update', 'connect-scene', 'upscale'])

// State
const localFavorite = ref(props.video.is_favorite || false)
const localLinkedSceneId = ref(props.video.production_sheet_id || props.video.linked_scene_id || null)
const currentLinkedSceneNumber = ref(props.video.linked_scene_number || null)
const capturedFrames = ref([])
const capturingFrame = ref(false)
const frameExtractor = ref(null)
const videoElement = ref(null)
const showUpscaleModal = ref(false)
const showDownloadMenu = ref(false)

// Computed
const hasChanges = computed(() => {
  const favChanged = localFavorite.value !== (props.video.is_favorite || false)
  const sceneChanged = localLinkedSceneId.value !== (props.video.linked_scene_id || null)
  return favChanged || sceneChanged
})

// Watch for video prop changes
watch(() => props.video, (newVideo) => {
  localFavorite.value = newVideo.is_favorite || false
  localLinkedSceneId.value = newVideo.production_sheet_id || newVideo.linked_scene_id || null
  currentLinkedSceneNumber.value = newVideo.linked_scene_number || null
})

// Methods
const handleOverlayClick = () => {
  emit('close')
}

const getModelName = (model) => {
  const modelNames = {
    'veo2': 'Google Veo 2',
    'veo-2': 'Google Veo 2',
    'veo3': 'Google Veo 3',
    'veo-3': 'Google Veo 3',
    'veo3-preview': 'Google Veo 3 Preview',
    'veo3-fast': 'Google Veo 3 Fast',
    'kling2.1': 'Kling AI 2.1',
    'kling-2.1': 'Kling AI 2.1',
    'hailou02': 'Hailou 02',
    'hailou-02-standard': 'Hailou 02 Standard',
    'hailou-02-pro': 'Hailou 02 Pro',
    'seedance-v1-pro': 'SeedDance v1 Pro',
    'seedance-v1-lite': 'SeedDance v1 Lite',
    'topaz-upscale': 'Topaz Video AI'
  }
  return modelNames[model] || model
}

const getDefaultResolution = (video) => {
  // 모델별 기본 해상도
  if (!video.generation_model) return '알 수 없음'
  
  const model = video.generation_model.toLowerCase()
  
  // Veo 모델들
  if (model.includes('veo')) {
    if (video.aspect_ratio === '9:16') return '720x1280'
    if (video.aspect_ratio === '1:1') return '720x720'
    return '1280x720' // 기본 16:9
  }
  
  // Kling 모델
  if (model.includes('kling')) {
    return '1280x720'
  }
  
  // Hailou 모델
  if (model.includes('hailou')) {
    if (model.includes('standard')) return '768P'
    if (model.includes('pro')) return '1280x720'
    return '768P'
  }
  
  // SeedDance 모델
  if (model.includes('seedance')) {
    if (model.includes('lite')) return '480p'
    if (model.includes('pro')) return '720p'
    return '480p'
  }
  
  // 업스케일된 비디오
  if (model.includes('topaz') || video.is_upscaled) {
    return '업스케일됨'
  }
  
  return '알 수 없음'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toggleFavorite = () => {
  localFavorite.value = !localFavorite.value
}

const openUpscaleModal = () => {
  // 프레임 추출기 정리
  if (frameExtractor.value) {
    frameExtractor.value.destroy()
    frameExtractor.value = null
  }
  capturedFrames.value = []
  
  emit('upscale', props.video)
  emit('close')
}

const toggleDownloadMenu = () => {
  showDownloadMenu.value = !showDownloadMenu.value
}

const downloadVideo = async (version = 'original') => {
  showDownloadMenu.value = false // 메뉴 닫기
  
  // 다운로드할 URL 선택
  const videoUrl = version === 'upscaled' && props.video.upscale_video_url 
    ? props.video.upscale_video_url 
    : props.video.storage_video_url
  
  if (videoUrl) {
    // 프로젝트 이름 가져오기
    let projectName = 'project'
    if (props.video.project_id) {
      try {
        const { data } = await supabase
          .from('projects')
          .select('name')
          .eq('id', props.video.project_id)
          .single()
        if (data && data.name) {
          projectName = data.name.replace(/[^a-zA-Z0-9가-힣]/g, '_')
        }
      } catch (error) {
        console.error('프로젝트 이름 가져오기 실패:', error)
      }
    }
    
    // 씬 번호 가져오기
    let sceneNumber = ''
    if (props.video.production_sheet_id || props.video.linked_scene_id) {
      const sheetId = props.video.production_sheet_id || props.video.linked_scene_id
      try {
        const { data } = await supabase
          .from('production_sheets')
          .select('scene_number')
          .eq('id', sheetId)
          .single()
        if (data && data.scene_number) {
          sceneNumber = `_${data.scene_number}`
        }
      } catch (error) {
        console.error('씬 번호 가져오기 실패:', error)
      }
    } else if (props.video.linked_scene_number) {
      sceneNumber = `_${props.video.linked_scene_number}`
    }
    
    try {
      // 타임스탬프와 버전 정보 추가
      const timestamp = new Date().getTime()
      const versionSuffix = version === 'upscaled' ? `_${props.video.upscale_factor}x` : ''
      const fileName = `video_${projectName}${sceneNumber}${versionSuffix}_${timestamp}.mp4`
      
      // 비디오 다운로드 (CORS 문제 회피를 위해 fetch 사용)
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
    } catch (error) {
      console.error('비디오 다운로드 오류:', error)
      // CORS 오류 시 기본 다운로드 시도
      const link = document.createElement('a')
      link.href = props.video.storage_video_url
      link.download = `video_${projectName}${sceneNumber}.mp4`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}

const copyPrompt = async () => {
  try {
    const promptText = props.video.prompt_used || props.video.custom_prompt || ''
    await navigator.clipboard.writeText(promptText)
    // 간단한 피드백
    const btn = document.querySelector('.copy-btn')
    if (btn) {
      const originalText = btn.textContent
      btn.textContent = '✅'
      setTimeout(() => {
        btn.textContent = originalText
      }, 1000)
    }
  } catch (error) {
    console.error('복사 실패:', error)
    alert('프롬프트 복사에 실패했습니다.')
  }
}

const unlinkFromScene = async () => {
  // 이전 씬에서 비디오 URL 제거
  if (localLinkedSceneId.value) {
    try {
      await supabase
        .from('production_sheets')
        .update({ 
          scene_video_url: null,
          scene_media_type: 'image',
          updated_at: new Date().toISOString()
        })
        .eq('id', localLinkedSceneId.value)
    } catch (error) {
      console.error('씬 업데이트 실패:', error)
    }
  }
  
  localLinkedSceneId.value = null
  currentLinkedSceneNumber.value = null
}

const saveChanges = async () => {
  try {
    const updates = {
      is_favorite: localFavorite.value,
      production_sheet_id: localLinkedSceneId.value,  // production_sheet_id 사용
      linked_scene_number: currentLinkedSceneNumber.value,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('gen_videos')
      .update(updates)
      .eq('id', props.video.id)

    if (error) throw error

    // 부모 컴포넌트에 업데이트 알림
    emit('update', {
      ...props.video,
      ...updates
    })

    // 피드백
    const btn = document.querySelector('.btn-primary')
    if (btn) {
      const originalText = btn.textContent
      btn.textContent = '✅ 저장됨'
      setTimeout(() => {
        btn.textContent = originalText
      }, 1500)
    }
  } catch (error) {
    console.error('저장 실패:', error)
    alert('저장에 실패했습니다.')
  }
}

// 프레임 캡처 메서드들
const initializeFrameExtractor = async () => {
  if (!props.video || !props.video.storage_video_url) return
  
  // 기존 추출기가 있으면 먼저 정리
  if (frameExtractor.value) {
    try {
      frameExtractor.value.destroy()
    } catch (e) {
      console.warn('프레임 추출기 정리 중 오류:', e)
    }
    frameExtractor.value = null
  }
  
  const videoUrl = props.video?.storage_video_url || props.video?.result_video_url
  if (!videoUrl) {
    console.warn('비디오 URL을 찾을 수 없습니다')
    return
  }
  
  try {
    frameExtractor.value = new VideoFrameExtractor(videoUrl)
    await frameExtractor.value.initialize()
  } catch (error) {
    console.error('프레임 추출기 초기화 실패:', error)
    frameExtractor.value = null
  }
}

const captureCurrentFrame = async () => {
  if (!videoElement.value) return
  
  capturingFrame.value = true
  try {
    const currentTime = videoElement.value.currentTime
    const frame = await captureFrameAtTime(currentTime)
    if (frame) {
      capturedFrames.value.push(frame)
    }
  } catch (error) {
    console.error('현재 프레임 캡처 실패:', error)
    alert('프레임 캡처에 실패했습니다.')
  } finally {
    capturingFrame.value = false
  }
}

const captureFirstFrame = async () => {
  capturingFrame.value = true
  try {
    const frame = await captureFrameAtTime(0.1)
    if (frame) {
      capturedFrames.value.push(frame)
    }
  } catch (error) {
    console.error('첫 프레임 캡처 실패:', error)
    alert('첫 프레임 캡처에 실패했습니다.')
  } finally {
    capturingFrame.value = false
  }
}

const captureMiddleFrame = async () => {
  if (!videoElement.value) return
  
  capturingFrame.value = true
  try {
    const duration = videoElement.value.duration
    const frame = await captureFrameAtTime(duration / 2)
    if (frame) {
      capturedFrames.value.push(frame)
    }
  } catch (error) {
    console.error('중간 프레임 캡처 실패:', error)
    alert('중간 프레임 캡처에 실패했습니다.')
  } finally {
    capturingFrame.value = false
  }
}

const captureLastFrame = async () => {
  if (!videoElement.value) return
  
  capturingFrame.value = true
  try {
    const duration = videoElement.value.duration
    const frame = await captureFrameAtTime(Math.max(0, duration - 0.1))
    if (frame) {
      capturedFrames.value.push(frame)
    }
  } catch (error) {
    console.error('마지막 프레임 캡처 실패:', error)
    alert('마지막 프레임 캡처에 실패했습니다.')
  } finally {
    capturingFrame.value = false
  }
}

const captureFrameAtTime = async (time) => {
  if (!frameExtractor.value) {
    await initializeFrameExtractor()
  }
  
  if (!frameExtractor.value) {
    alert('프레임 추출기를 초기화할 수 없습니다.')
    return null
  }
  
  capturingFrame.value = true
  try {
    const dataUrl = await frameExtractor.value.captureFrame(time, 'dataUrl', 0.95)
    const blob = await frameExtractor.value.captureFrame(time, 'blob', 0.95)
    
    return {
      time,
      dataUrl,
      blob,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('프레임 캡처 실패:', error)
    alert('프레임 캡처에 실패했습니다.')
    return null
  } finally {
    capturingFrame.value = false
  }
}

const downloadFrame = (frame) => {
  const link = document.createElement('a')
  link.href = frame.dataUrl
  link.download = `frame-${props.video.id}-${frame.time.toFixed(1)}s.jpg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const downloadAllFrames = async () => {
  for (let i = 0; i < capturedFrames.value.length; i++) {
    const frame = capturedFrames.value[i]
    downloadFrame(frame)
    // 각 다운로드 사이에 짧은 지연을 추가
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

const saveFrameToSupabase = async (frame) => {
  try {
    // Blob을 Base64로 변환
    const reader = new FileReader()
    const base64Promise = new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(frame.blob)
    })
    const imageBase64 = await base64Promise
    
    // Netlify 함수를 통해 저장
    const response = await fetch('/.netlify/functions/saveVideoFrame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoId: props.video.id,
        projectId: props.video.project_id,
        productionSheetId: props.video.production_sheet_id || props.video.linked_scene_id,
        frameTime: frame.time.toFixed(1),
        frameTimestamp: frame.timestamp,
        videoDuration: videoElement.value?.duration || 0,
        videoModel: props.video.generation_model,
        videoPrompt: props.video.prompt_used || props.video.custom_prompt,
        imageBase64: imageBase64
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save frame')
    }
    
    const result = await response.json()
    
    alert(result.message || '프레임이 이미지 갤러리에 저장되었습니다.')
    console.log('프레임 저장됨:', result)
    
    // 프레임 객체에 URL과 ID 추가
    frame.savedUrl = result.publicUrl
    frame.imageId = result.imageId
    
    // 부모 컴포넌트에 알림 (필요시)
    emit('frame-saved', {
      id: result.imageId,
      storage_image_url: result.publicUrl
    })
    
  } catch (error) {
    console.error('프레임 저장 실패:', error)
    alert('프레임 저장에 실패했습니다.')
  }
}

const removeFrame = (index) => {
  capturedFrames.value.splice(index, 1)
}

// Lifecycle
onMounted(() => {
  if (props.show && props.video && props.video.storage_video_url) {
    // 모달이 열리면 프레임 추출기 초기화
    initializeFrameExtractor()
  }
})

onUnmounted(() => {
  // 정리
  if (frameExtractor.value) {
    frameExtractor.value.destroy()
    frameExtractor.value = null
  }
  capturedFrames.value = []
})

// Watch for modal open/close
watch(() => props.show, (newShow) => {
  if (newShow && props.video && props.video.storage_video_url) {
    // 모달이 열릴 때 프레임 추출기 초기화
    initializeFrameExtractor()
  } else if (!newShow) {
    // 모달이 닫힐 때 정리
    if (frameExtractor.value) {
      try {
        frameExtractor.value.destroy()
      } catch (error) {
        console.warn('프레임 추출기 정리 중 오류:', error)
      }
      frameExtractor.value = null
    }
    capturedFrames.value = []
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 1400px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.video-model {
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  transform: scale(1.1);
}

.modal-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 비디오 섹션 */
.video-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #000;
  overflow: auto;
  padding: 0;
}

.detail-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-video {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.no-video span {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* 정보 섹션 */
.info-section {
  width: 400px;
  padding: 24px;
  overflow-y: auto;
  border-left: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.info-group {
  margin-bottom: 24px;
}

.info-group h4 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.group-header h4 {
  margin: 0;
}

.copy-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover {
  background: var(--bg-secondary);
  transform: scale(1.1);
}

.copy-btn svg {
  width: 16px;
  height: 16px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.info-item .label {
  width: 80px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.info-item .value {
  color: var(--text-primary);
  flex: 1;
}

.favorite-btn {
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-btn:hover {
  transform: scale(1.2);
}

.favorite-btn.active {
  color: #fbbf24;
}

.favorite-btn svg {
  width: 20px;
  height: 20px;
}

.prompt-text {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-primary);
  max-height: 150px;
  overflow-y: auto;
}

/* 씬 연결 정보 */
.scene-link-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 3px solid var(--primary-color);
}

.scene-badge {
  flex: 1;
  color: var(--text-primary);
  font-weight: 500;
}

.unlink-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 0.8rem;
}

.unlink-btn:hover {
  background: var(--error-color);
  color: white;
  border-color: var(--error-color);
  transform: scale(1.1);
}

/* 액션 버튼들 */
.action-buttons {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
  justify-content: flex-start;
}

/* 다운로드 드롭다운 */
.download-dropdown {
  position: relative;
}

.download-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 160px;
}

.download-menu .menu-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  text-align: left;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}

.download-menu .menu-item:hover {
  background: var(--bg-secondary);
}

.download-menu .menu-item:first-child {
  border-radius: 7px 7px 0 0;
}

.download-menu .menu-item:last-child {
  border-radius: 0 0 7px 7px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--bg-tertiary);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.upscale-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.upscale-btn:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f90 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.icon-btn.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.icon-btn.btn-primary:hover {
  background: var(--primary-dark, #4338ca);
  border-color: var(--primary-dark, #4338ca);
  box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}

/* 프레임 캡처 스타일 */
.frame-capture-controls {
  margin-top: 12px;
}

.capture-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.capture-btn {
  padding: 6px 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 50px;
}

.capture-btn svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.capture-btn span {
  font-size: 0.7rem;
  line-height: 1;
  text-align: center;
}

.capture-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.capturing-indicator {
  text-align: center;
  color: var(--primary-color);
  font-size: 0.9rem;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 6px;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 캡처된 프레임 */
.captured-frames {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.captured-frames h5 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 12px 0;
}

.frames-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.frame-item {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.frame-item img {
  width: 100%;
  height: auto;
  display: block;
}

.frame-info {
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
}

.frame-info span {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.frame-actions {
  display: flex;
  gap: 4px;
}

.frame-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.frame-btn svg {
  width: 14px;
  height: 14px;
}

.frame-btn:hover {
  background: var(--bg-tertiary);
  transform: scale(1.1);
}

.frame-btn:last-child:hover {
  background: var(--error-color);
  border-color: var(--error-color);
}

/* 반응형 */
@media (max-width: 768px) {
  .modal-content {
    flex-direction: column;
  }

  .info-section {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border-color);
  }

  .video-section {
    min-height: 300px;
  }
}
</style>