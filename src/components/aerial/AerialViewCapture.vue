<template>
  <div class="aerial-view-capture">
    <!-- 메인 뷰어 영역 -->
    <div class="viewer-section">
      <!-- Earth Engine 뷰어 -->
      <EarthEngineViewer
        ref="mapViewer"
        :initial-location="currentLocation"
        :initial-zoom="18"
        @location-change="handleLocationChange"
        @capture-ready="captureReady = true"
        @image-captured="handleImageCaptured"
        @error="handleMapError"
      />
      
      <!-- 오버레이 컨트롤 -->
      <div class="overlay-controls">
        <!-- 위치 검색 -->
        <div class="search-wrapper">
          <LocationSearch
            @location-selected="flyToLocation"
            @search-error="handleSearchError"
          />
        </div>
        
        <!-- 캡처 버튼 -->
        <div class="capture-controls">
          <button
            @click="captureView"
            :disabled="!captureReady || capturing"
            class="capture-btn primary"
          >
            <Camera :size="20" />
            <span>{{ capturing ? '캡처 중...' : '캡처' }}</span>
          </button>
          
          <button
            @click="toggleRecording"
            :disabled="!captureReady"
            class="capture-btn secondary"
            :class="{ recording: isRecording }"
          >
            <Video :size="20" />
            <span>{{ isRecording ? '녹화 중지' : '녹화 시작' }}</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 사이드 패널 -->
    <div class="side-panel">
      <!-- 카메라 컨트롤 -->
      <CameraControls
        ref="cameraControls"
        :initial-zoom="18"
        :initial-map-type="'satellite'"
        @update="updateCamera"
        @animate="startAnimation"
      />
      
      <!-- 캡처 갤러리 -->
      <div class="capture-gallery">
        <div class="gallery-header">
          <Images :size="16" />
          <span>캡처 갤러리</span>
          <span class="count">{{ capturedImages.length }}</span>
        </div>
        
        <div v-if="capturedImages.length === 0" class="empty-gallery">
          <p>아직 캡처한 이미지가 없습니다</p>
        </div>
        
        <div v-else class="gallery-grid">
          <div
            v-for="image in capturedImages"
            :key="image.id"
            class="gallery-item"
            @click="viewImage(image)"
          >
            <img :src="image.thumbnail || image.url" :alt="image.location_name" />
            <div class="item-overlay">
              <button @click.stop="deleteImage(image)" class="delete-btn">
                <Trash2 :size="14" />
              </button>
            </div>
            <div class="item-info">
              <span class="location">{{ image.location_name || '위치 정보 없음' }}</span>
              <span class="date">{{ formatDate(image.created_at) }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="capturedImages.length > 0" class="gallery-actions">
          <button @click="saveAllToProject" class="action-btn">
            <Save :size="14" />
            프로젝트에 저장
          </button>
          <button @click="clearGallery" class="action-btn danger">
            <Trash2 :size="14" />
            모두 삭제
          </button>
        </div>
      </div>
    </div>
    
    <!-- 이미지 뷰어 모달 -->
    <div v-if="viewingImage" class="image-viewer-modal" @click="closeImageViewer">
      <div class="modal-content" @click.stop>
        <button @click="closeImageViewer" class="close-btn">
          <X :size="24" />
        </button>
        <img :src="viewingImage.url" :alt="viewingImage.location_name" />
        <div class="image-details">
          <h3>{{ viewingImage.location_name || '항공 사진' }}</h3>
          <div class="details-grid">
            <div class="detail-item">
              <MapPin :size="14" />
              <span>{{ viewingImage.latitude?.toFixed(6) }}, {{ viewingImage.longitude?.toFixed(6) }}</span>
            </div>
            <div class="detail-item">
              <Mountain :size="14" />
              <span>줌: {{ viewingImage.zoom }}</span>
            </div>
            <div class="detail-item">
              <Camera :size="14" />
              <span>타입: {{ viewingImage.mapType }}</span>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="downloadImage(viewingImage)" class="modal-btn">
              <Download :size="16" />
              다운로드
            </button>
            <button @click="useAsReference(viewingImage)" class="modal-btn primary">
              <Wand2 :size="16" />
              AI 생성에 사용
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'
import EarthEngineViewer from './EarthEngineViewer.vue'
import LocationSearch from './LocationSearch.vue'
import CameraControls from './CameraControls.vue'
import { 
  Camera, Video, Images, Trash2, Save, X, Download, 
  MapPin, Mountain, Wand2 
} from 'lucide-vue-next'

const props = defineProps({
  projectId: {
    type: String,
    required: false
  }
})

const emit = defineEmits(['image-captured', 'use-as-reference'])

// Refs
const mapViewer = ref(null)
const cameraControls = ref(null)

// State
const captureReady = ref(false)
const capturing = ref(false)
const isRecording = ref(false)
const capturedImages = ref([])
const viewingImage = ref(null)
const currentLocation = ref({ lat: 37.7749, lng: -122.4194 }) // 샌프란시스코
const currentCamera = ref({
  zoom: 18,
  mapType: 'satellite'
})

// 이미지 캐처 처리
const handleImageCaptured = (imageData) => {
  console.log('위성 이미지 캐처됨:', imageData)
}

// 위치 변경 처리
const handleLocationChange = (location) => {
  currentLocation.value = { ...location }
}

// 위치로 이동
const flyToLocation = (location) => {
  if (mapViewer.value) {
    mapViewer.value.flyToLocation(location)
  }
}

// 카메라 업데이트
const updateCamera = (settings) => {
  if (mapViewer.value) {
    mapViewer.value.updateCamera(settings)
  }
  currentCamera.value = { ...currentCamera.value, ...settings }
}

// 애니메이션 시작
const startAnimation = (animationId) => {
  if (!mapViewer.value) return
  
  const animations = mapViewer.value.animationPresets
  if (animations[animationId]) {
    animations[animationId]()
  }
}

// 뷰 캡처
const captureView = async () => {
  if (!mapViewer.value || capturing.value) return
  
  capturing.value = true
  
  try {
    // 맵 뷰어에서 이미지 데이터 가져오기
    const imageData = mapViewer.value.captureView()
    
    if (!imageData) {
      throw new Error('이미지 캡처 실패')
    }
    
    // 캡처 데이터 생성
    const captureData = {
      id: `capture_${Date.now()}`,
      url: imageData,
      thumbnail: imageData, // 실제로는 썸네일 생성 필요
      location_name: await getLocationName(currentLocation.value),
      latitude: currentLocation.value.lat,
      longitude: currentLocation.value.lng,
      zoom: currentCamera.value.zoom,
      mapType: currentCamera.value.mapType,
      created_at: new Date().toISOString(),
      project_id: props.projectId
    }
    
    // 갤러리에 추가
    capturedImages.value.unshift(captureData)
    
    // 이벤트 발생
    emit('image-captured', captureData)
    
    // 성공 피드백
    console.log('이미지가 캡처되었습니다')
    
  } catch (error) {
    console.error('캡처 실패:', error)
    alert('이미지 캡처에 실패했습니다')
  } finally {
    capturing.value = false
  }
}

// 위치 이름 가져오기 (Reverse Geocoding)
const getLocationName = async (location) => {
  try {
    if (!window.google || !window.google.maps) return '알 수 없는 위치'
    
    const geocoder = new google.maps.Geocoder()
    
    return new Promise((resolve) => {
      geocoder.geocode({ location }, (results, status) => {
        if (status === 'OK' && results[0]) {
          // 주요 지명 추출
          const addressComponents = results[0].address_components
          const locality = addressComponents.find(c => c.types.includes('locality'))
          const sublocality = addressComponents.find(c => c.types.includes('sublocality'))
          
          if (locality) {
            resolve(locality.long_name)
          } else if (sublocality) {
            resolve(sublocality.long_name)
          } else {
            resolve(results[0].formatted_address.split(',')[0])
          }
        } else {
          resolve('알 수 없는 위치')
        }
      })
    })
  } catch (error) {
    console.error('Geocoding error:', error)
    return '알 수 없는 위치'
  }
}

// 녹화 토글
const toggleRecording = () => {
  isRecording.value = !isRecording.value
  
  if (isRecording.value) {
    // 녹화 시작 로직
    console.log('녹화 시작')
    startRecording()
  } else {
    // 녹화 중지 로직
    console.log('녹화 중지')
    stopRecording()
  }
}

// 녹화 시작
const startRecording = () => {
  // 일정 간격으로 캡처
  const recordingInterval = setInterval(() => {
    if (!isRecording.value) {
      clearInterval(recordingInterval)
      return
    }
    captureView()
  }, 1000) // 1초마다 캡처
}

// 녹화 중지
const stopRecording = () => {
  isRecording.value = false
}

// 이미지 보기
const viewImage = (image) => {
  viewingImage.value = image
}

// 이미지 뷰어 닫기
const closeImageViewer = () => {
  viewingImage.value = null
}

// 이미지 삭제
const deleteImage = (image) => {
  if (confirm('이 이미지를 삭제하시겠습니까?')) {
    const index = capturedImages.value.findIndex(img => img.id === image.id)
    if (index > -1) {
      capturedImages.value.splice(index, 1)
    }
  }
}

// 갤러리 비우기
const clearGallery = () => {
  if (confirm('모든 이미지를 삭제하시겠습니까?')) {
    capturedImages.value = []
  }
}

// 프로젝트에 저장
const saveAllToProject = async () => {
  if (!props.projectId) {
    alert('프로젝트 ID가 필요합니다')
    return
  }
  
  try {
    // 각 이미지를 Supabase에 저장
    for (const image of capturedImages.value) {
      // 실제 구현 시 storage에 이미지 업로드 후 DB 저장
      console.log('Saving image to project:', image)
    }
    
    alert('모든 이미지가 프로젝트에 저장되었습니다')
  } catch (error) {
    console.error('저장 실패:', error)
    alert('저장에 실패했습니다')
  }
}

// 이미지 다운로드
const downloadImage = (image) => {
  const link = document.createElement('a')
  link.href = image.url
  link.download = `aerial_${image.id}.png`
  link.click()
}

// AI 생성에 사용
const useAsReference = (image) => {
  emit('use-as-reference', image)
  closeImageViewer()
}

// 에러 처리
const handleMapError = (error) => {
  console.error('Map error:', error)
  alert(`지도 오류: ${error.message}`)
}

const handleSearchError = (error) => {
  console.error('Search error:', error)
  alert(`검색 오류: ${error}`)
}

// 날짜 포맷
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Cleanup
onUnmounted(() => {
  if (cameraControls.value) {
    cameraControls.value.cleanup()
  }
  if (isRecording.value) {
    stopRecording()
  }
})
</script>

<style scoped>
.aerial-view-capture {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
}

.viewer-section {
  flex: 1;
  position: relative;
  min-height: 0;
}

.overlay-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  z-index: 10;
  pointer-events: none;
}

.overlay-controls > * {
  pointer-events: auto;
}

.search-wrapper {
  margin-bottom: 20px;
}

.capture-controls {
  display: flex;
  gap: 12px;
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
}

.capture-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.capture-btn.primary {
  background: var(--primary-color);
  color: white;
}

.capture-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.capture-btn.secondary {
  background: white;
  color: var(--text-primary);
  border: 2px solid var(--border-color);
}

.capture-btn.secondary:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.capture-btn.recording {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.capture-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.side-panel {
  width: 400px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.capture-gallery {
  margin-top: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  margin: 20px;
}

.gallery-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.gallery-header .count {
  margin-left: auto;
  padding: 2px 8px;
  background: var(--primary-color);
  color: white;
  border-radius: 12px;
  font-size: 12px;
}

.empty-gallery {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.gallery-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.gallery-item:hover {
  transform: scale(1.05);
}

.gallery-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.item-overlay {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;
  background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.6));
  opacity: 0;
  transition: opacity 0.2s;
}

.gallery-item:hover .item-overlay {
  opacity: 1;
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 6px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
}

.delete-btn:hover {
  transform: scale(1.1);
}

.item-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gallery-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.action-btn.danger:hover {
  background: #ef4444;
  border-color: #ef4444;
}

/* 이미지 뷰어 모달 */
.image-viewer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  z-index: 1;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.7);
}

.modal-content img {
  width: 100%;
  height: auto;
  max-height: 60vh;
  object-fit: contain;
}

.image-details {
  padding: 20px;
  background: white;
}

.image-details h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn:hover {
  background: var(--bg-tertiary);
}

.modal-btn.primary {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.modal-btn.primary:hover {
  opacity: 0.9;
}
</style>