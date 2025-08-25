<template>
  <div class="scene-image-wrapper">
    <!-- 모바일에서만 표시되는 미디어 스위치 (hideSwitch가 false일 때만 표시) -->
    <div v-if="isMobile && !hideSwitch" class="mobile-media-switch">
      <span class="media-label" :class="{ active: localMediaType === 'image' }">이미지</span>
      <label class="media-switch">
        <input 
          type="checkbox" 
          :checked="localMediaType === 'video'"
          @change="switchLocalMediaType"
        >
        <span class="switch-slider"></span>
      </label>
      <span class="media-label" :class="{ active: localMediaType === 'video' }">비디오</span>
    </div>
    
    <div 
      class="scene-image-uploader"
      :class="{ 'drag-over': isDragOver, 'has-media': hasMedia }"
      @drop="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @click="!hasMedia && selectFile"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
    >
    <!-- 이미지 표시 -->
    <img 
      v-if="currentMediaType === 'image' && imageUrl" 
      :src="imageUrl" 
      :alt="`씬 ${sceneNumber} 이미지`"
      class="scene-thumbnail"
      @click.stop="$emit('view-image', imageUrl)"
    />
    
    <!-- 비디오 표시 -->
    <video
      v-else-if="currentMediaType === 'video' && videoUrl"
      ref="videoElement"
      :src="videoUrl"
      class="scene-video"
      :muted="true"
      :loop="true"
      @click.stop="$emit('view-image', videoUrl)"
      @mouseenter="playVideo"
      @mouseleave="pauseVideo"
    ></video>
    
    <!-- 빈 상태 -->
    <div v-else class="empty-placeholder">
      <span class="upload-icon">📷</span>
      <span class="upload-text">클릭 또는 드래그</span>
    </div>
    
    <!-- 미디어 삭제 버튼 -->
    <button 
      v-if="hasMedia"
      @click.stop="removeMedia"
      class="remove-btn"
      :title="currentMediaType === 'image' ? '이미지 삭제' : '비디오 삭제'"
    >
      ✕
    </button>
    
    <!-- 업로드 중 오버레이 -->
    <div v-if="isUploading" class="upload-overlay">
      <div class="spinner"></div>
      <span>업로드 중...</span>
    </div>
    
    <!-- 숨겨진 파일 입력 -->
    <input 
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileSelect"
    />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '@/utils/supabase'

const props = defineProps({
  sceneId: {
    type: String,
    required: true
  },
  sceneNumber: {
    type: Number,
    required: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    default: 'image'
  },
  projectId: {
    type: String,
    required: true
  },
  hideSwitch: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update', 'view-image'])

// State
const isDragOver = ref(false)
const isUploading = ref(false)
const fileInput = ref(null)
const videoElement = ref(null)
const currentMediaType = ref(props.mediaType || 'image')
const hovering = ref(false)

// 모바일 감지
const isMobile = ref(window.innerWidth <= 768)
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
}
window.addEventListener('resize', handleResize)

// 모바일에서는 개별 미디어 타입 사용
const localMediaType = ref(props.mediaType || 'image')

// Watch props changes - 모바일과 데스크탑 모두 적용
watch(() => props.mediaType, (newType) => {
  currentMediaType.value = newType
  localMediaType.value = newType
  console.log(`SceneImageUploader: mediaType changed to ${newType}`)
}, { immediate: true })

// 모바일에서 미디어 타입 전환
const switchLocalMediaType = () => {
  localMediaType.value = localMediaType.value === 'image' ? 'video' : 'image'
}

// Methods
const handleDragOver = (event) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = async (event) => {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    if (file.type.startsWith('image/')) {
      await uploadImage(file)
    } else {
      alert('이미지 파일만 업로드 가능합니다.')
    }
  }
}

const selectFile = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (file) {
    await uploadImage(file)
    // 입력 초기화
    event.target.value = ''
  }
}

const uploadImage = async (file) => {
  try {
    isUploading.value = true
    
    // 현재 사용자 세션 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('로그인이 필요합니다.')
    }
    
    const userId = session.user.id
    
    // 랜덤 파일명 생성
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const fileExt = file.name.split('.').pop()
    const fileName = `scene-${timestamp}-${randomStr}.${fileExt}`
    
    // ref-images 버킷의 RLS 정책: 첫 번째 폴더가 user_id여야 함
    const filePath = `${userId}/scenes/${props.projectId}/${fileName}`
    
    console.log('Uploading to path:', filePath)
    
    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('ref-images') // ref-images 버킷 사용 (user_id 폴더 구조)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }
    
    // Public URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from('ref-images')
      .getPublicUrl(filePath)
    
    console.log('Upload successful, public URL:', publicUrl)
    
    // production_sheets 테이블 업데이트
    const { error: updateError } = await supabase
      .from('production_sheets')
      .update({ scene_image_url: publicUrl })
      .eq('id', props.sceneId)
    
    if (updateError) {
      console.error('Database update error:', updateError)
      throw updateError
    }
    
    // 부모 컴포넌트에 알림
    emit('update', publicUrl)
    
    console.log('이미지 업로드 완료')
  } catch (error) {
    console.error('이미지 업로드 실패:', error)
    if (error.message?.includes('row-level security')) {
      alert('이미지 업로드 권한이 없습니다. 로그인을 확인해주세요.')
    } else {
      alert(`이미지 업로드에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
    }
  } finally {
    isUploading.value = false
  }
}

// Computed
const hasMedia = computed(() => {
  return (currentMediaType.value === 'image' && props.imageUrl) || 
         (currentMediaType.value === 'video' && props.videoUrl)
})

// 비디오 재생/일시정지
const playVideo = () => {
  if (videoElement.value) {
    videoElement.value.play()
  }
}

const pauseVideo = () => {
  if (videoElement.value) {
    videoElement.value.pause()
    videoElement.value.currentTime = 0 // 처음으로 되돌리기
  }
}

const removeMedia = async () => {
  const mediaTypeText = currentMediaType.value === 'image' ? '이미지' : '비디오'
  if (!confirm(`${mediaTypeText}를 삭제하시겠습니까?`)) return
  
  try {
    // production_sheets 테이블에서 미디어 URL 제거
    const updateData = {}
    if (currentMediaType.value === 'image') {
      updateData.scene_image_url = null
      // 비디오만 남은 경우 비디오로 자동 전환
      if (props.videoUrl) {
        updateData.scene_media_type = 'video'
      }
    } else {
      updateData.scene_video_url = null
      // 이미지만 남은 경우 이미지로 자동 전환
      if (props.imageUrl) {
        updateData.scene_media_type = 'image'
      }
    }
    
    const { error } = await supabase
      .from('production_sheets')
      .update(updateData)
      .eq('id', props.sceneId)
    
    if (error) throw error
    
    // 부모 컴포넌트에 알림
    emit('update', null)
    
    // 남은 미디어로 자동 전환
    if (currentMediaType.value === 'image' && props.videoUrl) {
      currentMediaType.value = 'video'
    } else if (currentMediaType.value === 'video' && props.imageUrl) {
      currentMediaType.value = 'image'
    }
    
    console.log(`${mediaTypeText} 삭제 완료`)
  } catch (error) {
    console.error(`${mediaTypeText} 삭제 실패:`, error)
    alert(`${mediaTypeText} 삭제에 실패했습니다.`)
  }
}
</script>

<style scoped>
.scene-image-wrapper {
  width: 100%;
}

/* 모바일 미디어 스위치 */
.mobile-media-switch {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .mobile-media-switch {
    display: flex;
  }
  
  .scene-image-wrapper {
    width: 100% !important;
  }
  
  .scene-image-uploader {
    width: 100% !important;
    height: auto;
    min-height: 150px; /* 200px에서 150px로 감소 */
    max-width: none !important;
    margin: 0 !important;
  }
  
  .scene-thumbnail,
  .scene-video {
    width: 100% !important;
    height: auto;
    max-height: 300px; /* 400px에서 300px로 감소 */
    object-fit: contain;
  }
  
  .empty-placeholder {
    min-height: 150px; /* 빈 상태도 높이 감소 */
    width: 100% !important;
  }
}

.media-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.media-label.active {
  color: var(--primary-color);
  font-weight: 600;
}

.media-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
}

.media-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: 0.3s;
  border-radius: 22px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.media-switch input:checked + .switch-slider {
  background-color: var(--primary-color);
}

.media-switch input:checked + .switch-slider:before {
  transform: translateX(18px);
}
.scene-image-uploader {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 180px;
  min-height: 120px;
  max-height: 240px;
  margin: 0 auto;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  background-color: var(--bg-secondary);
}

.scene-image-uploader.drag-over {
  border: 2px dashed var(--primary-color);
  background-color: rgba(74, 222, 128, 0.1);
}

.scene-thumbnail {
  width: 100%;
  height: auto;
  max-height: 240px;
  object-fit: contain;
  cursor: pointer;
  transition: transform 0.2s;
  background-color: var(--bg-secondary);
}

.scene-thumbnail:hover {
  transform: scale(1.02);
}

.scene-video {
  width: 100%;
  height: auto;
  max-height: 240px;
  object-fit: contain;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: var(--bg-secondary);
}

.scene-video:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 비디오 재생 중 표시 */
.scene-image-uploader:hover .scene-video {
  filter: brightness(1.05);
}

.empty-placeholder {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 0.8rem;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  transition: all 0.2s;
}

.scene-image-uploader:hover .empty-placeholder {
  border-color: var(--primary-color);
  background-color: rgba(74, 222, 128, 0.05);
}

.upload-icon {
  font-size: 1.5rem;
  margin-bottom: 4px;
  opacity: 0.6;
}

.upload-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
  z-index: 10;
}

.scene-image-uploader:hover .remove-btn {
  display: flex;
}

.remove-btn:hover {
  background-color: #dc2626;
  transform: scale(1.1);
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.85rem;
  border-radius: 4px;
  z-index: 20;
}

.upload-overlay .spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>