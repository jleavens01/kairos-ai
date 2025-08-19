<template>
  <div class="earth-engine-viewer">
    <!-- 메인 뷰어 컨테이너 -->
    <div ref="mapContainer" class="map-container"></div>
    
    <!-- 위성 이미지 오버레이 -->
    <div v-if="currentImageUrl" class="satellite-overlay">
      <img 
        :src="currentImageUrl"
        :alt="currentLocation.address || '위성 이미지'"
        class="satellite-image"
        @load="handleImageLoad"
        @error="handleImageError"
      />
    </div>
    
    <!-- 로딩 오버레이 -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
    
    <!-- 에러 메시지 -->
    <div v-if="error" class="error-overlay">
      <AlertCircle :size="48" />
      <p>{{ error }}</p>
      <button @click="retry" class="retry-btn">다시 시도</button>
    </div>
    
    <!-- 정보 오버레이 -->
    <div v-if="!loading && mapInstance" class="info-overlay">
      <div class="location-info">
        <MapPin :size="16" />
        <span>{{ currentLocation.lat.toFixed(6) }}, {{ currentLocation.lng.toFixed(6) }}</span>
      </div>
      <div class="view-info">
        <Camera :size="16" />
        <span>줌: {{ currentZoom }} | 타입: {{ mapType }}</span>
      </div>
      <div v-if="imageMetadata" class="metadata-info">
        <Calendar :size="16" />
        <span>{{ formatDate(imageMetadata.date) }} | {{ imageMetadata.satellite }}</span>
      </div>
    </div>
    
    <!-- 컨트롤 패널 -->
    <div class="control-panel">
      <!-- 위성 선택 -->
      <div class="satellite-selector">
        <Settings :size="16" />
        <select v-model="selectedSatellite" @change="updateSatellite" class="satellite-select">
          <option v-for="sat in satellites" :key="sat.id" :value="sat.id">
            {{ sat.label }} ({{ sat.resolution }})
          </option>
        </select>
      </div>
      
      <!-- 맵 타입 선택 -->
      <div class="map-type-selector">
        <button
          v-for="type in mapTypes"
          :key="type.id"
          @click="setMapType(type.id)"
          :class="{ active: mapType === type.id }"
          class="type-btn"
          :title="type.description"
        >
          <component :is="type.icon" :size="16" />
          <span>{{ type.label }}</span>
        </button>
      </div>
      
      <!-- 날짜 선택 (역사적 이미지) -->
      <div class="date-selector">
        <Calendar :size="16" />
        <input
          type="date"
          v-model="selectedDate"
          @change="updateImageDate"
          :max="maxDate"
          class="date-input"
        />
      </div>
      
      <!-- 해상도 선택 -->
      <div class="resolution-selector">
        <Settings :size="16" />
        <select v-model="imageResolution" @change="updateResolution" class="resolution-select">
          <option value="low">저해상도 (빠름)</option>
          <option value="medium">중해상도</option>
          <option value="high">고해상도</option>
          <option value="ultra">초고해상도 (느림)</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { AlertCircle, MapPin, Camera, Calendar, Settings, Map, Layers, Globe, Mountain } from 'lucide-vue-next'

const props = defineProps({
  initialLocation: {
    type: Object,
    default: () => ({ lat: 37.7749, lng: -122.4194 })
  },
  initialZoom: {
    type: Number,
    default: 18
  },
  apiKey: {
    type: String,
    required: false
  }
})

const emit = defineEmits(['location-change', 'capture-ready', 'image-captured', 'error'])

// State
const mapContainer = ref(null)
const mapInstance = ref(null)
const currentImageUrl = ref(null)
const earthEngineTileUrl = ref(null)
const loading = ref(true)
const loadingMessage = ref('위성 이미지를 로딩중...')
const error = ref(null)
const currentLocation = ref({ ...props.initialLocation })
const currentZoom = ref(props.initialZoom)
const mapType = ref('satellite')
const selectedDate = ref(null)
const selectedSatellite = ref('sentinel2')
const imageResolution = ref('high')
const imageMetadata = ref(null)

// 현재 날짜
const maxDate = new Date().toISOString().split('T')[0]

// 위성 옵션
const satellites = [
  { id: 'sentinel2', label: 'Sentinel-2', resolution: '10m', startYear: 2015 },
  { id: 'landsat9', label: 'Landsat 9', resolution: '30m', startYear: 2021 },
  { id: 'landsat8', label: 'Landsat 8', resolution: '30m', startYear: 2013 },
  { id: 'modis', label: 'MODIS', resolution: '250m', startYear: 2000 }
]

// 맵 타입 옵션
const mapTypes = [
  { id: 'earthengine', label: 'Earth Engine', icon: Globe, description: 'Google Earth Engine 위성 이미지' },
  { id: 'satellite', label: 'Google 위성', icon: Layers, description: 'Google Maps 위성' },
  { id: 'hybrid', label: '하이브리드', icon: Mountain, description: '위성 + 라벨' },
  { id: 'roadmap', label: '지도', icon: Map, description: '일반 지도' }
]

// 해상도별 설정
const resolutionSettings = {
  low: { scale: 1, size: '640x640' },
  medium: { scale: 1.5, size: '1024x1024' },
  high: { scale: 2, size: '1920x1080' },
  ultra: { scale: 4, size: '3840x2160' }
}

// Google Maps 초기화
const initMap = async () => {
  try {
    loading.value = true
    loadingMessage.value = 'Google Maps를 초기화하는 중...'
    
    // Google Maps API 로드 확인
    if (!window.google || !window.google.maps) {
      await loadGoogleMapsScript()
    }
    
    // 지도 초기화
    mapInstance.value = new google.maps.Map(mapContainer.value, {
      center: currentLocation.value,
      zoom: currentZoom.value,
      mapTypeId: mapType.value,
      disableDefaultUI: false,
      mapTypeControl: false, // 자체 컨트롤 사용
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      scaleControl: true,
      tilt: 0 // 2D 뷰 고정
    })
    
    // 이벤트 리스너 설정
    mapInstance.value.addListener('center_changed', () => {
      const center = mapInstance.value.getCenter()
      currentLocation.value = {
        lat: center.lat(),
        lng: center.lng()
      }
      emit('location-change', currentLocation.value)
    })
    
    mapInstance.value.addListener('zoom_changed', () => {
      currentZoom.value = mapInstance.value.getZoom()
      updateSatelliteImage()
    })
    
    mapInstance.value.addListener('idle', () => {
      // 지도 이동이 끝났을 때 Earth Engine 이미지 로드
      if (mapType.value === 'earthengine') {
        loadEarthEngineImage()
      } else {
        loadHighResolutionImage()
      }
    })
    
    // 초기 Earth Engine 이미지 로드
    await loadEarthEngineImage()
    
    loading.value = false
    emit('capture-ready', true)
    
  } catch (err) {
    console.error('Map initialization error:', err)
    error.value = err.message
    loading.value = false
    emit('error', err)
  }
}

// Google Maps 스크립트 로드
const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }
    
    const apiKey = props.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      reject(new Error('Google Maps API 키가 필요합니다'))
      return
    }
    
    window.initGoogleMaps = () => {
      delete window.initGoogleMaps
      resolve()
    }
    
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMaps&libraries=places&loading=async`
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Google Maps API 로드 실패'))
    
    document.head.appendChild(script)
  })
}

// Earth Engine 위성 이미지 로드
const loadEarthEngineImage = async () => {
  try {
    loadingMessage.value = 'Google Earth Engine 위성 이미지를 가져오는 중...'
    
    const center = mapInstance.value.getCenter()
    const zoom = mapInstance.value.getZoom()
    
    // Earth Engine 서비스 호출
    const response = await fetch('/.netlify/functions/earthEngineService', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getSatelliteImage',
        params: {
          lat: center.lat(),
          lng: center.lng(),
          zoom: zoom,
          date: selectedDate.value,
          resolution: imageResolution.value,
          satellite: selectedSatellite.value
        }
      })
    })
    
    const result = await response.json()
    
    if (result.data && result.data.imageUrl) {
      currentImageUrl.value = result.data.imageUrl
      imageMetadata.value = result.data.metadata
      
      // Earth Engine 메시지 표시
      if (result.message) {
        console.log(result.message)
        loadingMessage.value = 'Google Earth Engine 승인 대기 중 - Google Maps 위성 이미지 사용'
      }
      
      // Earth Engine 타일 레이어 추가 (사용 가능한 경우)
      if (result.success && mapType.value === 'earthengine') {
        await addEarthEngineLayer()
      }
    } else if (result.fallback) {
      // 폴백: Static Maps API
      console.log('Using fallback Static Maps API')
      currentImageUrl.value = result.fallback
    }
    
  } catch (err) {
    console.error('Failed to load Earth Engine image:', err)
    // 폴백: Static Maps API 사용
    currentImageUrl.value = await getSatelliteImageUrl(
      currentLocation.value.lat,
      currentLocation.value.lng,
      currentZoom.value
    )
  }
}

// Earth Engine 타일 레이어 추가
const addEarthEngineLayer = async () => {
  try {
    const response = await fetch('/.netlify/functions/earthEngineService', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getTileUrl',
        params: {
          lat: currentLocation.value.lat,
          lng: currentLocation.value.lng,
          zoom: currentZoom.value,
          satellite: selectedSatellite.value,
          startDate: selectedDate.value ? new Date(selectedDate.value).toISOString() : '2023-01-01',
          endDate: selectedDate.value ? new Date(new Date(selectedDate.value).getTime() + 30*24*60*60*1000).toISOString() : new Date().toISOString()
        }
      })
    })
    
    const result = await response.json()
    
    if (result.success && result.data?.tileUrl) {
      // Earth Engine 타일을 오버레이로 추가
      const eeMapType = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          return result.data.tileUrl
            .replace('{x}', coord.x)
            .replace('{y}', coord.y)
            .replace('{z}', zoom)
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 20,
        minZoom: 0,
        name: 'Earth Engine'
      })
      
      // 기존 오버레이 제거 후 추가
      mapInstance.value.overlayMapTypes.clear()
      mapInstance.value.overlayMapTypes.push(eeMapType)
      
      earthEngineTileUrl.value = result.data.tileUrl
    }
  } catch (err) {
    console.error('Failed to add Earth Engine layer:', err)
  }
}

// 위성 이미지 URL 생성
const getSatelliteImageUrl = async (lat, lng, zoom) => {
  const apiKey = props.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const settings = resolutionSettings[imageResolution.value]
  
  // Static Maps API로 고해상도 위성 이미지 가져오기
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap'
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom,
    size: settings.size,
    scale: settings.scale,
    maptype: mapType.value,
    key: apiKey,
    format: 'png'
  })
  
  // 고급 파라미터 추가 (더 나은 품질)
  if (mapType.value === 'satellite' || mapType.value === 'hybrid') {
    params.append('style', 'feature:all|element:labels|visibility:off') // 라벨 제거 (satellite 모드)
  }
  
  return `${baseUrl}?${params.toString()}`
}

// Earth Engine 타일 서버 접근 (실제 구현 시)
const getEarthEngineTiles = async () => {
  // Earth Engine API는 서버 사이드 인증이 필요합니다
  // 실제 구현 시 백엔드 API를 통해 접근해야 합니다
  
  try {
    const response = await fetch('/.netlify/functions/getEarthEngineImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: currentLocation.value.lat,
        lng: currentLocation.value.lng,
        zoom: currentZoom.value,
        date: selectedDate.value,
        resolution: imageResolution.value
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.imageUrl
    }
  } catch (err) {
    console.error('Earth Engine API error:', err)
    // Static Maps API로 폴백
    return getSatelliteImageUrl(
      currentLocation.value.lat,
      currentLocation.value.lng,
      currentZoom.value
    )
  }
}

// 맵 타입 변경
const setMapType = (type) => {
  mapType.value = type
  if (mapInstance.value) {
    if (type === 'earthengine') {
      // Earth Engine 모드
      mapInstance.value.setMapTypeId('roadmap') // 기본 맵
      loadEarthEngineImage()
    } else {
      // Google Maps 모드
      mapInstance.value.overlayMapTypes.clear() // Earth Engine 레이어 제거
      mapInstance.value.setMapTypeId(type)
      updateSatelliteImage()
    }
  }
}

// 날짜 변경 시 이미지 업데이트
const updateImageDate = () => {
  if (selectedDate.value) {
    loadingMessage.value = `${selectedDate.value} 날짜의 Earth Engine 이미지를 검색중...`
    loadEarthEngineImage()
  }
}

// 해상도 변경
const updateResolution = () => {
  loadEarthEngineImage()
}

// 위성 변경
const updateSatellite = () => {
  loadEarthEngineImage()
}

// 고해상도 위성 이미지 로드 (폴백)
const loadHighResolutionImage = async () => {
  try {
    const center = mapInstance.value.getCenter()
    const zoom = mapInstance.value.getZoom()
    
    currentImageUrl.value = await getSatelliteImageUrl(
      center.lat(),
      center.lng(),
      zoom
    )
  } catch (err) {
    console.error('Failed to load image:', err)
  }
}

// 위성 이미지 업데이트
const updateSatelliteImage = () => {
  // 디바운싱으로 너무 자주 업데이트 방지
  clearTimeout(updateSatelliteImage.timer)
  updateSatelliteImage.timer = setTimeout(() => {
    if (mapType.value === 'earthengine') {
      loadEarthEngineImage()
    } else {
      loadHighResolutionImage()
    }
  }, 500)
}

// 위치로 이동
const flyToLocation = (location) => {
  if (!mapInstance.value) return
  
  mapInstance.value.panTo({
    lat: location.lat,
    lng: location.lng
  })
  
  if (location.zoom) {
    mapInstance.value.setZoom(location.zoom)
  }
  
  currentLocation.value = {
    lat: location.lat,
    lng: location.lng,
    address: location.address
  }
  
  // 새 위치의 이미지 로드
  if (mapType.value === 'earthengine') {
    loadEarthEngineImage()
  } else {
    loadHighResolutionImage()
  }
}

// 현재 뷰 캡처
const captureView = () => {
  // 현재 표시중인 이미지 URL 반환
  const captureData = {
    imageUrl: currentImageUrl.value,
    location: currentLocation.value,
    zoom: currentZoom.value,
    mapType: mapType.value,
    metadata: imageMetadata.value,
    timestamp: new Date().toISOString()
  }
  
  emit('image-captured', captureData)
  return currentImageUrl.value
}

// 카메라 설정 업데이트 (줌 레벨)
const updateCamera = (settings) => {
  if (!mapInstance.value) return
  
  if (settings.zoom !== undefined) {
    mapInstance.value.setZoom(settings.zoom)
  }
  
  if (settings.mapType !== undefined) {
    setMapType(settings.mapType)
  }
}

// 이미지 로드 핸들러
const handleImageLoad = () => {
  console.log('Satellite image loaded successfully')
  loading.value = false
}

// 이미지 에러 핸들러
const handleImageError = (e) => {
  console.error('Image load error:', e)
  // Static Maps API로 폴백
  currentImageUrl.value = getSatelliteImageUrl(
    currentLocation.value.lat,
    currentLocation.value.lng,
    currentZoom.value
  )
}

// 날짜 포맷
const formatDate = (dateStr) => {
  if (!dateStr) return '최신'
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// 재시도
const retry = () => {
  error.value = null
  initMap()
}

// Lifecycle
onMounted(() => {
  initMap()
})

// Public methods
defineExpose({
  flyToLocation,
  captureView,
  updateCamera,
  getCurrentLocation: () => currentLocation.value,
  getMapInstance: () => mapInstance.value
})
</script>

<style scoped>
.earth-engine-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.map-container {
  width: 100%;
  height: 100%;
}

.satellite-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  display: none; /* 기본적으로 숨김, 필요시 표시 */
}

.satellite-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loading-overlay,
.error-overlay {
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
  z-index: 100;
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
  z-index: 10;
  pointer-events: none;
}

.location-info,
.view-info,
.metadata-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.metadata-info {
  margin-bottom: 0;
  opacity: 0.9;
  font-size: 11px;
}

.control-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
}

.map-type-selector {
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.95);
  padding: 4px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn:hover {
  background: var(--bg-secondary);
}

.type-btn.active {
  background: var(--primary-color);
  color: white;
}

.satellite-selector,
.date-selector,
.resolution-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.date-input,
.satellite-select,
.resolution-select {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  background: white;
  min-width: 120px;
}

.date-input:focus,
.satellite-select:focus,
.resolution-select:focus {
  outline: none;
  border-color: var(--primary-color);
}
</style>