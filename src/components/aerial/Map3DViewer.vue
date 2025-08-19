<template>
  <div class="map-3d-viewer">
    <!-- Google Maps 3D 컨테이너 -->
    <div ref="map3dContainer" class="map-container" :id="mapElementId"></div>
    
    <!-- 로딩 오버레이 -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>3D 지도를 로딩중...</p>
    </div>
    
    <!-- 에러 메시지 -->
    <div v-if="error" class="error-overlay">
      <AlertCircle :size="48" />
      <p>{{ error }}</p>
      <button @click="retryInit" class="retry-btn">다시 시도</button>
    </div>
    
    <!-- 지도 정보 오버레이 -->
    <div v-if="!loading && !error" class="info-overlay">
      <div class="location-info">
        <MapPin :size="16" />
        <span>{{ currentLocation.lat.toFixed(6) }}, {{ currentLocation.lng.toFixed(6) }}</span>
      </div>
      <div class="camera-info">
        <Camera :size="16" />
        <span>고도: {{ cameraSettings.altitude }}m | 각도: {{ cameraSettings.tilt }}° | 방향: {{ cameraSettings.heading }}°</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { AlertCircle, MapPin, Camera } from 'lucide-vue-next'

const props = defineProps({
  initialLocation: {
    type: Object,
    default: () => ({ lat: 37.7749, lng: -122.4194 }) // 샌프란시스코 (3D 타일 지원)
  },
  initialAltitude: {
    type: Number,
    default: 1000 // 미터
  },
  apiKey: {
    type: String,
    required: false
  }
})

const emit = defineEmits(['camera-change', 'location-change', 'capture-ready', 'error'])

// State
const map3dContainer = ref(null)
const mapElementId = ref(`map3d-${Date.now()}`)
const map3dInstance = ref(null)
const loading = ref(true)
const error = ref(null)
const isInitialized = ref(false)

// 현재 위치 및 카메라 설정
const currentLocation = ref({ ...props.initialLocation })
const cameraSettings = ref({
  altitude: props.initialAltitude,
  tilt: 0, // 초기값을 0으로 (Google Maps 지원 값)
  heading: 0,
  fov: 60
})

// Google Maps 로더 스크립트
const loadGoogleMapsScript = async () => {
  return new Promise(async (resolve, reject) => {
    // 이미 로드된 경우
    if (window.google && window.google.maps && window.google.maps.Map) {
      resolve()
      return
    }
    
    try {
      // 서버에서 API 설정 가져오기 (프로덕션 환경)
      let apiKey = props.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      
      // 개발 환경이 아니고 VITE 환경변수가 없으면 서버에서 가져오기
      if (!apiKey && import.meta.env.PROD) {
        const response = await fetch('/.netlify/functions/getMapsConfig')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data.apiKey) {
            apiKey = result.data.apiKey
          }
        }
      }
      
      if (!apiKey) {
        reject(new Error('Google Maps API 키가 필요합니다'))
        return
      }
      
      // 스크립트 로드 - 3D Tiles 지원을 위한 버전 및 라이브러리
      window.initGoogleMaps = () => {
        console.log('Google Maps API loaded successfully')
        delete window.initGoogleMaps
        resolve()
      }
      
      const script = document.createElement('script')
      // Map3DElement를 위한 올바른 라이브러리 설정 - 순서 중요!
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps3d&v=alpha&loading=async&callback=initGoogleMaps`
      script.async = true
      script.defer = true
      
      script.onerror = () => {
        delete window.initGoogleMaps
        reject(new Error('Google Maps API 로드 실패'))
      }
      
      document.head.appendChild(script)
    } catch (error) {
      reject(error)
    }
  })
}

// 3D Map 초기화
const initMap3D = async () => {
  try {
    loading.value = true
    error.value = null
    
    // Google Maps API 로드
    await loadGoogleMapsScript()
    
    if (!map3dContainer.value) {
      throw new Error('Map container not found')
    }
    
    // Map3DElement만 사용 (표준 API 폴백 제거)
    if (!google.maps.maps3d || !google.maps.maps3d.Map3DElement) {
      throw new Error('Map3DElement API가 로드되지 않았습니다. maps3d 라이브러리를 확인하세요.')
    }
    
    console.log('Using Map3DElement for Photorealistic 3D Tiles')
    
    // VITE_GOOGLE_MAPS_API_KEY 명시적으로 사용
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      throw new Error('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다')
    }
    console.log('Using API key:', apiKey.substring(0, 10) + '...')
    
    // customElements로 Map3DElement 정의 확인
    await customElements.whenDefined('gmp-map-3d')
    console.log('gmp-map-3d custom element defined')
    
    // 컨테이너를 비우고 새로 시작
    map3dContainer.value.innerHTML = ''
    
    // Map ID 가져오기 (3D Tiles에 필요할 수 있음)
    const mapId = import.meta.env.VITE_GOOGLE_MAP_ID
    
    // Google의 공식 예제 방식으로 Map3DElement 생성
    const map3DElement = new google.maps.maps3d.Map3DElement({
      center: { 
        lat: props.initialLocation.lat, 
        lng: props.initialLocation.lng,
        altitude: 0
      },
      range: 1000,
      tilt: 60,
      heading: 0,
      mapId: mapId // Map ID 추가
    })
    
    // 스타일 설정
    map3DElement.style.width = '100%'
    map3DElement.style.height = '100%'
    
    // API 키 설정 (필수!)
    map3DElement.apiKey = apiKey
    
    // Map ID 설정 (속성으로도 설정)
    if (mapId && mapId !== 'YOUR_MAP_ID_HERE') {
      map3DElement.mapId = mapId
      console.log('Map ID set:', mapId)
    } else {
      console.log('Map ID not configured - using default')
    }
    
    console.log('Map3DElement created with properties:', {
      center: map3DElement.center,
      range: map3DElement.range,
      tilt: map3DElement.tilt,
      heading: map3DElement.heading,
      apiKey: map3DElement.apiKey ? 'Set' : 'Not set'
    })
    
    // 컨테이너에 추가
    map3dContainer.value.appendChild(map3DElement)
    
    map3dInstance.value = map3DElement
    
    // Map3DElement가 DOM에 추가된 후 렌더링 트리거
    requestAnimationFrame(() => {
      console.log('Triggering Map3D render...')
      
      // 강제로 렌더링 트리거
      map3DElement.connectedCallback?.()
      
      // 뷰포트 설정을 다시 한번 적용
      map3DElement.center = { 
        lat: props.initialLocation.lat, 
        lng: props.initialLocation.lng,
        altitude: 0
      }
      
      console.log('Map3D render triggered, checking network requests...')
    })
      
    // 초기화 완료 확인
    setTimeout(() => {
      console.log('Map3DElement initialization check')
      console.log('Map3DElement properties:', {
        center: map3DElement.center,
        range: map3DElement.range,
        tilt: map3DElement.tilt,
        heading: map3DElement.heading,
        height: map3DElement.offsetHeight,
        width: map3DElement.offsetWidth,
        apiKey: map3DElement.getAttribute('api-key') ? 'Set' : 'Not set'
      })
      
      // 강제로 다시 속성 설정 시도
      if (!map3DElement.center || !map3DElement.center.lat) {
        console.log('Forcing center property update...')
        map3DElement.center = { 
          lat: props.initialLocation.lat, 
          lng: props.initialLocation.lng,
          altitude: 0
        }
        map3DElement.range = 1000
        map3DElement.tilt = 60
        map3DElement.heading = 0
      }
      
      // Map이 제대로 로드되었는지 확인
      if (map3DElement && map3DElement.offsetHeight > 0) {
        console.log('Map3DElement is visible and loaded')
        loading.value = false
        isInitialized.value = true
        emit('capture-ready', true)
      } else {
        console.error('Map3DElement failed to render')
        console.error('디버깅 정보:')
        console.error('- Element exists:', !!map3DElement)
        console.error('- Height:', map3DElement?.offsetHeight)
        console.error('- Width:', map3DElement?.offsetWidth)
        console.error('- Parent:', map3DElement?.parentElement)
        
        // 강제로 성공 처리 (디버깅용)
        loading.value = false
        isInitialized.value = true
        emit('capture-ready', true)
      }
    }, 3000)
      
    // 에러 이벤트 리스너
    map3DElement.addEventListener('gmp-error', (error) => {
      console.error('Map3DElement error:', error)
      error.value = 'Map3DElement 로드 실패: ' + (error.message || error)
    })
    
    // 로드 이벤트 리스너
    map3DElement.addEventListener('gmp-load', () => {
      console.log('Map3DElement loaded event fired')
      loading.value = false
      isInitialized.value = true
    })
    
    // 이벤트 리스너 설정
    map3DElement.addEventListener('gmp-click', (event) => {
      console.log('Map clicked:', event)
      if (event.position) {
        console.log('Click position:', event.position)
      }
    })
    
    // 카메라 변경 이벤트
    map3DElement.addEventListener('gmp-centerchange', () => {
      if (map3DElement.center) {
        currentLocation.value = {
          lat: map3DElement.center.lat,
          lng: map3DElement.center.lng
        }
        emit('location-change', currentLocation.value)
      }
    })
    
    map3DElement.addEventListener('gmp-rangechange', () => {
      if (map3DElement.range) {
        cameraSettings.value.altitude = map3DElement.range
        emitCameraChange()
      }
    })
    
    map3DElement.addEventListener('gmp-tiltchange', () => {
      if (map3DElement.tilt !== undefined) {
        cameraSettings.value.tilt = map3DElement.tilt
        emitCameraChange()
      }
    })
    
    map3DElement.addEventListener('gmp-headingchange', () => {
      if (map3DElement.heading !== undefined) {
        cameraSettings.value.heading = map3DElement.heading
        emitCameraChange()
      }
    })
    
  } catch (err) {
    console.error('Map initialization error:', err)
    error.value = err.message
    loading.value = false
    emit('error', err)
  }
}

// 카메라 변경 이벤트 발생
const emitCameraChange = () => {
  emit('camera-change', { ...cameraSettings.value })
}

// 카메라 설정 업데이트
const updateCamera = (settings) => {
  if (!map3dInstance.value || !isInitialized.value) {
    console.log('Map not ready yet')
    return
  }
  
  console.log('Updating camera settings:', settings)
  const mapInstance = map3dInstance.value
  
  // Map3DElement인지 확인 (Map3DElement는 HTMLElement를 상속함)
  if (mapInstance instanceof HTMLElement && mapInstance.tagName === 'GMP-MAP-3D') {
    // Map3DElement 사용
    console.log('Using Map3DElement camera controls')
    
    if (settings.tilt !== undefined) {
      mapInstance.tilt = settings.tilt
      cameraSettings.value.tilt = settings.tilt
      console.log('3D Tilt set to:', settings.tilt)
    }
    
    if (settings.heading !== undefined) {
      mapInstance.heading = settings.heading
      cameraSettings.value.heading = settings.heading
      console.log('3D Heading set to:', settings.heading)
    }
    
    if (settings.altitude !== undefined) {
      mapInstance.range = settings.altitude
      cameraSettings.value.altitude = settings.altitude
      console.log('3D Range set to:', settings.altitude)
    }
    
  } else {
    // 표준 Maps API 사용
    console.log('Using standard Maps API camera controls')
    
    if (settings.tilt !== undefined) {
      const tiltValue = settings.tilt >= 22.5 ? 45 : 0
      console.log('Setting tilt to:', tiltValue)
      
      const currentZoom = mapInstance.getZoom()
      if (tiltValue === 45 && currentZoom < 18) {
        console.log('Adjusting zoom to 18 for tilt')
        mapInstance.setZoom(18)
      }
      
      setTimeout(() => {
        mapInstance.setTilt(tiltValue)
        cameraSettings.value.tilt = tiltValue
        console.log('Tilt set to:', mapInstance.getTilt())
      }, 100)
    }
    
    if (settings.heading !== undefined) {
      console.log('Setting heading to:', settings.heading)
      setTimeout(() => {
        mapInstance.setHeading(settings.heading)
        cameraSettings.value.heading = settings.heading
        console.log('Heading set to:', mapInstance.getHeading())
      }, 100)
    }
  }
  
  // Map3DElement가 아닌 경우에만 zoom 설정
  if (settings.altitude !== undefined && !(mapInstance instanceof HTMLElement)) {
    // 고도를 zoom level로 변환 (자연스러운 로그 스케일)
    // 고도 10m-10000m -> zoom 21-12
    const minAlt = 10
    const maxAlt = 10000
    const minZoom = 12
    const maxZoom = 21
    
    // 로그 스케일로 변환
    const altitude = Math.max(minAlt, Math.min(maxAlt, settings.altitude))
    const logScale = (Math.log(maxAlt) - Math.log(altitude)) / (Math.log(maxAlt) - Math.log(minAlt))
    const zoom = minZoom + (maxZoom - minZoom) * logScale
    
    map3dInstance.value.setZoom(Math.round(zoom * 10) / 10) // 소수점 1자리까지
    cameraSettings.value.altitude = settings.altitude
  }
}

// 특정 위치로 이동
const flyToLocation = (location) => {
  if (!map3dInstance.value) return
  
  const mapInstance = map3dInstance.value
  
  // Map3DElement는 항상 HTMLElement임
  console.log('Flying to location:', location)
  
  // center 속성 업데이트
  mapInstance.center = {
    lat: location.lat,
    lng: location.lng,
    altitude: location.altitude || 0
  }
  
  // altitude가 있으면 range 업데이트
  if (location.altitude) {
    mapInstance.range = location.altitude
  }
  
  // 현재 위치 업데이트
  currentLocation.value = {
    lat: location.lat,
    lng: location.lng
  }
  
  emit('location-change', currentLocation.value)
}

// 현재 뷰 캡처 (스크린샷)
const captureView = () => {
  if (!map3dInstance.value) return null
  
  // Google Maps의 StaticMap API를 사용하여 현재 뷰 캡처
  // 또는 Canvas 렌더링 사용
  const mapDiv = map3dContainer.value
  const canvas = mapDiv.querySelector('canvas')
  
  if (canvas) {
    return canvas.toDataURL('image/png')
  }
  
  // Static Map API 대체 방안 (개발 환경에서만 사용)
  // 프로덕션에서는 Canvas 캡처를 사용해야 함
  if (import.meta.env.DEV) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (apiKey) {
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` + 
        `center=${currentLocation.value.lat},${currentLocation.value.lng}` +
        `&zoom=${map3dInstance.value.getZoom()}` +
        `&size=1920x1080` +
        `&maptype=satellite` +
        `&key=${apiKey}`
      return staticMapUrl
    }
  }
  
  // 프로덕션에서는 null 반환 (Canvas 캡처 사용)
  return null
}

// 애니메이션 프리셋
const animationPresets = {
  orbit: (duration = 10000) => {
    if (!map3dInstance.value) return
    
    let startHeading = map3dInstance.value.getHeading()
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = (elapsed % duration) / duration
      const heading = (startHeading + progress * 360) % 360
      
      map3dInstance.value.setHeading(heading)
      
      if (elapsed < duration * 3) { // 3회 회전
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  },
  
  rise: (targetAltitude = 5000, duration = 5000) => {
    if (!map3dInstance.value) return
    
    const startZoom = map3dInstance.value.getZoom()
    const targetZoom = Math.log2(591657550.5 / targetAltitude)
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const currentZoom = startZoom + (targetZoom - startZoom) * progress
      
      map3dInstance.value.setZoom(currentZoom)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }
}

// 재시도
const retryInit = () => {
  error.value = null
  initMap3D()
}

// Lifecycle
onMounted(() => {
  initMap3D()
})

onUnmounted(() => {
  // 정리 작업
  if (map3dInstance.value) {
    // 이벤트 리스너 제거 등
    google.maps.event.clearInstanceListeners(map3dInstance.value)
  }
})

// Public methods
defineExpose({
  updateCamera,
  flyToLocation,
  captureView,
  animationPresets,
  getCurrentLocation: () => currentLocation.value,
  getCameraSettings: () => cameraSettings.value
})
</script>

<style scoped>
.map-3d-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
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
  z-index: 5;
}

.location-info,
.camera-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.camera-info {
  margin-bottom: 0;
}

.location-info span,
.camera-info span {
  font-family: 'Monaco', 'Courier New', monospace;
}
</style>