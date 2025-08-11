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
              <div v-if="video.resolution" class="info-item">
                <span class="label">해상도:</span>
                <span class="value">{{ video.resolution }}</span>
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
                  {{ localFavorite ? '⭐' : '☆' }}
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
                  📋
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
                    📸 현재 프레임
                  </button>
                  <button @click="captureFirstFrame" class="capture-btn" title="첫 프레임 캡처">
                    ⏮️ 첫 프레임
                  </button>
                  <button @click="captureMiddleFrame" class="capture-btn" title="중간 프레임 캡처">
                    ⏸️ 중간 프레임
                  </button>
                  <button @click="captureLastFrame" class="capture-btn" title="마지막 프레임 캡처">
                    ⏭️ 마지막 프레임
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
                          💾
                        </button>
                        <button @click="saveFrameToSupabase(frame)" class="frame-btn" title="저장">
                          ☁️
                        </button>
                        <button @click="removeFrame(index)" class="frame-btn" title="삭제">
                          ❌
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 액션 버튼들 -->
            <div class="action-buttons">
              <button @click="downloadVideo" class="btn-action">
                💾 비디오 다운로드
              </button>
              <button @click="$emit('connect-scene', video)" class="btn-action">
                🔗 씬에 연결
              </button>
              <button v-if="capturedFrames.length > 0" @click="downloadAllFrames" class="btn-action">
                📦 모든 프레임 다운로드
              </button>
              <button v-if="hasChanges" @click="saveChanges" class="btn-action btn-primary">
                💾 변경사항 저장
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

const emit = defineEmits(['close', 'update', 'connect-scene'])

// State
const localFavorite = ref(props.video.is_favorite || false)
const localLinkedSceneId = ref(props.video.production_sheet_id || props.video.linked_scene_id || null)
const currentLinkedSceneNumber = ref(props.video.linked_scene_number || null)
const capturedFrames = ref([])
const capturingFrame = ref(false)
const frameExtractor = ref(null)
const videoElement = ref(null)

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
    'kling2.1': 'Kling AI 2.1',
    'hailou02': 'Hailou 02'
  }
  return modelNames[model] || model
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

const downloadVideo = () => {
  if (props.video.storage_video_url) {
    const link = document.createElement('a')
    link.href = props.video.storage_video_url
    link.download = `video-${props.video.id}.mp4`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
  if (!props.video.storage_video_url) return
  
  try {
    frameExtractor.value = new VideoFrameExtractor(props.video.storage_video_url)
    await frameExtractor.value.initialize()
  } catch (error) {
    console.error('프레임 추출기 초기화 실패:', error)
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
    const fileName = `videos/${props.video.id}/frames/frame-${frame.time.toFixed(1)}s-${Date.now()}.jpg`
    
    const { data, error } = await supabase.storage
      .from('projects')
      .upload(fileName, frame.blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600'
      })
    
    if (error) throw error
    
    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('projects')
      .getPublicUrl(fileName)
    
    alert(`프레임이 저장되었습니다.`)
    console.log('프레임 저장됨:', publicUrl)
    
    // 프레임 객체에 URL 추가
    frame.savedUrl = publicUrl
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
  if (props.show && props.video.storage_video_url) {
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
  if (newShow && props.video.storage_video_url && !frameExtractor.value) {
    initializeFrameExtractor()
  } else if (!newShow && frameExtractor.value) {
    frameExtractor.value.destroy()
    frameExtractor.value = null
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
  padding: 4px 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--bg-secondary);
  transform: scale(1.1);
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
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.favorite-btn:hover {
  transform: scale(1.2);
}

.favorite-btn.active {
  color: #fbbf24;
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
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.btn-action {
  padding: 10px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-action:hover {
  background: var(--bg-tertiary);
  transform: translateX(2px);
}

.btn-action.btn-primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.btn-action.btn-primary:hover {
  background: var(--primary-dark, #4338ca);
  border-color: var(--primary-dark, #4338ca);
}

/* 프레임 캡처 스타일 */
.frame-capture-controls {
  margin-top: 12px;
}

.capture-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.capture-btn {
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
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
  font-size: 0.9rem;
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