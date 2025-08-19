<template>
  <div class="aerial-view-viewer">
    <!-- 메인 뷰어 컨테이너 -->
    <div ref="viewerContainer" class="viewer-container">
      <!-- 항공 이미지/비디오 표시 -->
      <img 
        v-if="currentView"
        :src="currentView.imageUrl"
        :alt="currentView.address"
        class="aerial-image"
        @load="handleImageLoad"
        @error="handleImageError"
      />
      
      <!-- 비디오 플레이어 (비디오 URL이 있을 때) -->
      <video
        v-if="currentView?.videoUrl"
        ref="videoPlayer"
        :src="currentView.videoUrl"
        class="aerial-video"
        controls
        loop
        @loadedmetadata="handleVideoLoad"
      />
      
      <!-- 로딩 오버레이 -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>
      
      <!-- 에러 메시지 -->
      <div v-if="error && !currentView" class="error-overlay">
        <AlertCircle :size="48" />
        <p>{{ error }}</p>
        <button @click="retry" class="retry-btn">다시 시도</button>
      </div>
      
      <!-- 프로세싱 상태 -->
      <div v-if="processingStatus" class="processing-overlay">
        <Loader :size="48" class="spin" />
        <p>항공 영상 처리 중...</p>
        <p class="processing-hint">몇 분 정도 소요될 수 있습니다</p>
      </div>
    </div>
    
    <!-- 정보 오버레이 -->
    <div v-if="currentView && !loading" class="info-overlay">
      <div class="location-info">
        <MapPin :size="16" />
        <span>{{ currentView.address }}</span>
      </div>
      <div v-if="currentView.metadata" class="metadata-info">
        <Camera :size="16" />
        <span>{{ formatMetadata(currentView.metadata) }}</span>
      </div>
    </div>
    
    <!-- 뷰 타입 스위처 -->
    <div v-if="currentView" class="view-switcher">
      <button 
        @click="viewMode = 'image'"
        :class="{ active: viewMode === 'image' }"
        class="switch-btn"
      >
        <Image :size="16" />
        이미지
      </button>
      <button 
        v-if="currentView.videoUrl"
        @click="viewMode = 'video'"
        :class="{ active: viewMode === 'video' }"
        class="switch-btn"
      >
        <Video :size="16" />
        비디오
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { AlertCircle, MapPin, Camera, Loader, Image, Video } from 'lucide-vue-next'

const props = defineProps({
  apiKey: {
    type: String,
    required: false
  }
})

const emit = defineEmits(['view-ready', 'error', 'capture-ready'])

// State
const viewerContainer = ref(null)
const videoPlayer = ref(null)
const loading = ref(false)
const loadingMessage = ref('항공 영상을 가져오는 중...')
const error = ref(null)
const processingStatus = ref(false)
const currentView = ref(null)
const viewMode = ref('image') // 'image' or 'video'

// Aerial View API 엔드포인트
const AERIAL_VIEW_API = 'https://aerialview.googleapis.com/v1'

// API 키 가져오기
const getApiKey = () => {
  return props.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
}

// 비디오 ID인지 주소인지 판단
const isVideoId = (value) => {
  const videoIdRegex = /^[0-9a-zA-Z-_]{22}$/
  return videoIdRegex.test(value)
}

// 항공 뷰 조회
const lookupAerialView = async (addressOrVideoId) => {
  loading.value = true
  error.value = null
  processingStatus.value = false
  
  try {
    const apiKey = getApiKey()
    if (!apiKey) {
      throw new Error('Google Maps API 키가 필요합니다')
    }
    
    // 파라미터 설정
    const parameterKey = isVideoId(addressOrVideoId) ? 'videoId' : 'address'
    const params = new URLSearchParams()
    params.set(parameterKey, addressOrVideoId)
    params.set('key', apiKey)
    
    // API 호출
    const response = await fetch(`${AERIAL_VIEW_API}/videos:lookupVideo?${params.toString()}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `API 오류: ${response.status}`)
    }
    
    const result = await response.json()
    
    // 상태 확인
    if (result.state === 'PROCESSING') {
      processingStatus.value = true
      loadingMessage.value = '비디오 처리 중... 잠시 후 다시 시도해주세요'
      
      // 30초 후 재시도
      setTimeout(() => {
        lookupAerialView(addressOrVideoId)
      }, 30000)
      
      return
    }
    
    if (result.error && result.error.code === 404) {
      // 비디오가 없으면 생성 요청
      console.log('비디오를 찾을 수 없음. 새로 생성 요청...')
      await renderAerialVideo(addressOrVideoId)
      return
    }
    
    // 성공: 뷰 데이터 설정
    currentView.value = {
      videoId: result.videoId,
      address: result.metadata?.address || addressOrVideoId,
      imageUrl: result.uris?.IMAGE?.landscapeUri || result.uris?.IMAGE?.portraitUri,
      videoUrl: result.uris?.VIDEO?.mp4Uri,
      metadata: result.metadata,
      state: result.state
    }
    
    loading.value = false
    emit('view-ready', currentView.value)
    emit('capture-ready', true)
    
  } catch (err) {
    console.error('Aerial View lookup error:', err)
    error.value = err.message
    loading.value = false
    emit('error', err)
  }
}

// 새 항공 비디오 렌더링 요청
const renderAerialVideo = async (address) => {
  try {
    const apiKey = getApiKey()
    
    loadingMessage.value = '새 항공 영상 생성 요청 중...'
    
    const params = new URLSearchParams()
    params.set('address', address)
    params.set('key', apiKey)
    
    const response = await fetch(`${AERIAL_VIEW_API}/videos:renderVideo?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: address
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `렌더링 요청 실패: ${response.status}`)
    }
    
    const result = await response.json()
    
    if (result.state === 'PROCESSING') {
      processingStatus.value = true
      loadingMessage.value = '항공 영상 생성 중... (2-5분 소요)'
      
      // 비디오 ID로 주기적으로 확인
      const videoId = result.videoId
      if (videoId) {
        checkVideoStatus(videoId)
      }
    }
    
  } catch (err) {
    console.error('Aerial Video render error:', err)
    error.value = `영상 생성 실패: ${err.message}`
    loading.value = false
  }
}

// 비디오 처리 상태 확인
const checkVideoStatus = (videoId) => {
  const checkInterval = setInterval(async () => {
    try {
      const apiKey = getApiKey()
      const params = new URLSearchParams()
      params.set('videoId', videoId)
      params.set('key', apiKey)
      
      const response = await fetch(`${AERIAL_VIEW_API}/videos:lookupVideo?${params.toString()}`)
      const result = await response.json()
      
      if (result.state === 'ACTIVE') {
        clearInterval(checkInterval)
        processingStatus.value = false
        
        // 처리 완료 - 뷰 데이터 설정
        currentView.value = {
          videoId: result.videoId,
          address: result.metadata?.address || '알 수 없는 위치',
          imageUrl: result.uris?.IMAGE?.landscapeUri || result.uris?.IMAGE?.portraitUri,
          videoUrl: result.uris?.VIDEO?.mp4Uri,
          metadata: result.metadata,
          state: result.state
        }
        
        loading.value = false
        emit('view-ready', currentView.value)
        emit('capture-ready', true)
        
      } else if (result.state === 'FAILED') {
        clearInterval(checkInterval)
        error.value = '영상 생성에 실패했습니다'
        processingStatus.value = false
        loading.value = false
      }
      
    } catch (err) {
      console.error('Status check error:', err)
    }
  }, 15000) // 15초마다 확인
  
  // 10분 후 타임아웃
  setTimeout(() => {
    clearInterval(checkInterval)
    if (processingStatus.value) {
      error.value = '영상 생성 시간이 초과되었습니다'
      processingStatus.value = false
      loading.value = false
    }
  }, 600000)
}

// 위치로 이동 (주소로 새 뷰 로드)
const flyToLocation = async (location) => {
  if (location.address) {
    await lookupAerialView(location.address)
  } else if (location.lat && location.lng) {
    // 좌표를 주소로 변환 (Reverse Geocoding)
    const address = await reverseGeocode(location.lat, location.lng)
    if (address) {
      await lookupAerialView(address)
    }
  }
}

// Reverse Geocoding
const reverseGeocode = async (lat, lng) => {
  try {
    const apiKey = getApiKey()
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    )
    
    const data = await response.json()
    if (data.results && data.results[0]) {
      return data.results[0].formatted_address
    }
    
    return null
  } catch (err) {
    console.error('Reverse geocoding error:', err)
    return null
  }
}

// 현재 뷰 캡처
const captureView = () => {
  if (!currentView.value) return null
  
  // 이미지 URL 반환
  return currentView.value.imageUrl
}

// 이미지 로드 핸들러
const handleImageLoad = () => {
  console.log('Aerial image loaded successfully')
}

// 이미지 에러 핸들러
const handleImageError = (e) => {
  console.error('Image load error:', e)
  error.value = '이미지를 로드할 수 없습니다'
}

// 비디오 로드 핸들러
const handleVideoLoad = () => {
  console.log('Aerial video loaded successfully')
}

// 메타데이터 포맷
const formatMetadata = (metadata) => {
  if (!metadata) return ''
  
  const parts = []
  if (metadata.captureDate) {
    parts.push(`촬영일: ${new Date(metadata.captureDate).toLocaleDateString('ko-KR')}`)
  }
  if (metadata.altitude) {
    parts.push(`고도: ${metadata.altitude}m`)
  }
  
  return parts.join(' | ')
}

// 재시도
const retry = () => {
  error.value = null
  if (currentView.value?.address) {
    lookupAerialView(currentView.value.address)
  }
}

// 뷰 모드 변경 감지
watch(viewMode, (newMode) => {
  // 비디오/이미지 전환 처리
  if (newMode === 'video' && videoPlayer.value) {
    videoPlayer.value.play()
  }
})

// Public methods
defineExpose({
  lookupAerialView,
  flyToLocation,
  captureView,
  getCurrentView: () => currentView.value
})
</script>

<style scoped>
.aerial-view-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.viewer-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.aerial-image,
.aerial-video {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.aerial-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.loading-overlay,
.error-overlay,
.processing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.spin {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-overlay {
  color: #ef4444;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.retry-btn:hover {
  opacity: 0.9;
}

.processing-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 8px;
}

.info-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 12px;
  z-index: 5;
}

.location-info,
.metadata-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.metadata-info {
  margin-bottom: 0;
  font-size: 11px;
  opacity: 0.9;
}

.view-switcher {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 4px;
  border-radius: 10px;
  z-index: 5;
}

.switch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.switch-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.switch-btn.active {
  background: var(--primary-color);
}
</style>