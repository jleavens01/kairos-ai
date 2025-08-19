<template>
  <div class="location-search">
    <div class="search-container">
      <Search :size="20" class="search-icon" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="주소 또는 장소 검색..."
        class="search-input"
        @keyup.enter="handleSearch"
        @focus="showSuggestions = true"
      />
      <button 
        v-if="searchQuery"
        @click="clearSearch"
        class="clear-btn"
      >
        <X :size="16" />
      </button>
      <button
        @click="handleSearch"
        class="search-btn"
        :disabled="!searchQuery.trim() || searching"
      >
        <Loader v-if="searching" :size="16" class="spin" />
        <ArrowRight v-else :size="16" />
      </button>
    </div>
    
    <!-- 검색 제안 드롭다운 -->
    <div v-if="showSuggestions && (suggestions.length > 0 || recentPlaces.length > 0)" class="suggestions-dropdown">
      <!-- 최근 검색 -->
      <div v-if="recentPlaces.length > 0 && !searchQuery" class="suggestion-group">
        <div class="group-header">
          <Clock :size="14" />
          <span>최근 위치</span>
        </div>
        <button
          v-for="place in recentPlaces"
          :key="place.id"
          @click="selectPlace(place)"
          class="suggestion-item"
        >
          <MapPin :size="14" />
          <div class="suggestion-text">
            <span class="place-name">{{ place.name }}</span>
            <span class="place-address">{{ place.address }}</span>
          </div>
        </button>
      </div>
      
      <!-- 검색 결과 -->
      <div v-if="suggestions.length > 0" class="suggestion-group">
        <div v-if="searchQuery" class="group-header">
          <MapPin :size="14" />
          <span>검색 결과</span>
        </div>
        <button
          v-for="suggestion in suggestions"
          :key="suggestion.place_id"
          @click="selectSuggestion(suggestion)"
          class="suggestion-item"
        >
          <MapPin :size="14" />
          <div class="suggestion-text">
            <span class="place-name">{{ suggestion.structured_formatting.main_text }}</span>
            <span class="place-address">{{ suggestion.structured_formatting.secondary_text }}</span>
          </div>
        </button>
      </div>
    </div>
    
    <!-- 빠른 위치 프리셋 -->
    <div class="location-presets">
      <button
        v-for="preset in locationPresets"
        :key="preset.id"
        @click="selectPreset(preset)"
        class="preset-btn"
        :title="preset.name"
      >
        <component :is="preset.icon" :size="16" />
        <span>{{ preset.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Search, X, MapPin, Clock, ArrowRight, Loader, Building, Mountain, Waves, TreePine } from 'lucide-vue-next'

const emit = defineEmits(['location-selected', 'search-error'])

// State
const searchQuery = ref('')
const searching = ref(false)
const showSuggestions = ref(false)
const suggestions = ref([])
const recentPlaces = ref([])
const autocompleteService = ref(null)
const placesService = ref(null)

// 위치 프리셋
const locationPresets = [
  {
    id: 'seoul-city-hall',
    name: '서울시청',
    icon: Building,
    location: { lat: 37.5665, lng: 126.9780 },
    altitude: 1000
  },
  {
    id: 'namsan',
    name: '남산타워',
    icon: Mountain,
    location: { lat: 37.5512, lng: 126.9882 },
    altitude: 1500
  },
  {
    id: 'hangang',
    name: '한강대교',
    icon: Waves,
    location: { lat: 37.5145, lng: 126.9689 },
    altitude: 800
  },
  {
    id: 'olympic-park',
    name: '올림픽공원',
    icon: TreePine,
    location: { lat: 37.5206, lng: 127.1214 },
    altitude: 1200
  }
]

// Google Places API 초기화
const initPlacesService = () => {
  if (!window.google || !window.google.maps) {
    console.warn('Google Maps not loaded yet')
    return
  }
  
  try {
    // 새로운 Places API 사용 체크
    if (window.google.maps.places.AutocompleteSuggestion) {
      // 새로운 API 사용 (2025년 3월 1일 이후 권장)
      console.log('Using new Places API (AutocompleteSuggestion)')
      // AutocompleteSuggestion API는 별도 초기화 불필요
    } else {
      // 기존 API 폴백 (deprecated but still works)
      console.log('Using legacy Places API (AutocompleteService)')
      autocompleteService.value = new google.maps.places.AutocompleteService()
      
      // Places 서비스 (상세 정보용)
      const mapDiv = document.createElement('div')
      const map = new google.maps.Map(mapDiv)
      placesService.value = new google.maps.places.PlacesService(map)
    }
    
    // 최근 검색 로드
    loadRecentPlaces()
  } catch (error) {
    console.error('Places service init error:', error)
  }
}

// 검색 처리
const handleSearch = async () => {
  if (!searchQuery.value.trim() || searching.value) return
  
  searching.value = true
  showSuggestions.value = false
  
  try {
    // Google Geocoding API 사용
    const geocoder = new google.maps.Geocoder()
    
    geocoder.geocode({ address: searchQuery.value }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const place = results[0]
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
        
        // 장소 정보 저장
        const placeData = {
          id: place.place_id || Date.now().toString(),
          name: place.formatted_address.split(',')[0],
          address: place.formatted_address,
          location: location
        }
        
        // 최근 검색에 추가
        saveToRecentPlaces(placeData)
        
        // 이벤트 발생
        emit('location-selected', {
          ...location,
          name: placeData.name,
          address: placeData.address
        })
        
        clearSearch()
      } else {
        console.error('Geocoding failed:', status)
        emit('search-error', '위치를 찾을 수 없습니다')
      }
      
      searching.value = false
    })
  } catch (error) {
    console.error('Search error:', error)
    emit('search-error', error.message)
    searching.value = false
  }
}

// 자동완성 제안
const fetchSuggestions = async (query) => {
  if (!query) {
    suggestions.value = []
    return
  }
  
  // 새로운 API 사용 시도
  if (window.google?.maps?.places?.AutocompleteSuggestion) {
    try {
      const { AutocompleteSuggestion } = google.maps.places
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        languageCode: 'ko',
        region: 'kr'
      })
      
      if (response.suggestions) {
        // 새로운 API 형식으로 변환
        suggestions.value = response.suggestions.slice(0, 5).map(s => ({
          place_id: s.placePrediction?.placeId || s.queryPrediction?.text,
          structured_formatting: {
            main_text: s.placePrediction?.text?.text || s.queryPrediction?.text || query,
            secondary_text: s.placePrediction?.secondaryText?.text || ''
          }
        }))
      } else {
        suggestions.value = []
      }
    } catch (error) {
      console.error('New API error, falling back to legacy:', error)
      // 기존 API로 폴백
      useLegacyAutocomplete(query)
    }
  } else if (autocompleteService.value) {
    // 기존 API 사용
    useLegacyAutocomplete(query)
  } else {
    suggestions.value = []
  }
}

// 기존 API 폴백 함수
const useLegacyAutocomplete = (query) => {
  if (!autocompleteService.value) return
  
  const request = {
    input: query,
    language: 'ko',
    componentRestrictions: { country: 'kr' }
  }
  
  autocompleteService.value.getPlacePredictions(request, (predictions, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
      suggestions.value = predictions.slice(0, 5)
    } else {
      suggestions.value = []
    }
  })
}

// 제안 선택
const selectSuggestion = async (suggestion) => {
  // 새로운 API 사용 시도
  if (window.google?.maps?.places?.Place) {
    try {
      const { Place } = google.maps.places
      const place = new Place({
        id: suggestion.place_id
      })
      
      // 필요한 필드만 요청 (토큰 최적화)
      await place.fetchFields({
        fields: ['location', 'displayName', 'formattedAddress']
      })
      
      if (place.location) {
        const location = {
          lat: place.location.lat(),
          lng: place.location.lng()
        }
        
        const placeData = {
          id: suggestion.place_id,
          name: place.displayName || suggestion.structured_formatting.main_text,
          address: place.formattedAddress || suggestion.structured_formatting.secondary_text,
          location: location
        }
        
        saveToRecentPlaces(placeData)
        
        emit('location-selected', {
          ...location,
          name: placeData.name,
          address: placeData.address
        })
        
        clearSearch()
        showSuggestions.value = false
      }
    } catch (error) {
      console.error('New Place API error, falling back to legacy:', error)
      // 기존 API로 폴백
      useLegacyPlaceDetails(suggestion)
    }
  } else if (placesService.value) {
    // 기존 API 사용
    useLegacyPlaceDetails(suggestion)
  } else {
    // API를 사용할 수 없는 경우 기본 동작
    const placeData = {
      id: suggestion.place_id,
      name: suggestion.structured_formatting.main_text,
      address: suggestion.structured_formatting.secondary_text
    }
    
    // Geocoding으로 위치 찾기
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address: `${placeData.name} ${placeData.address}` }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        }
        
        placeData.location = location
        saveToRecentPlaces(placeData)
        
        emit('location-selected', {
          ...location,
          name: placeData.name,
          address: placeData.address
        })
        
        clearSearch()
        showSuggestions.value = false
      }
    })
  }
}

// 기존 API 폴백 함수
const useLegacyPlaceDetails = (suggestion) => {
  if (!placesService.value) return
  
  placesService.value.getDetails(
    { placeId: suggestion.place_id },
    (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
        
        const placeData = {
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          location: location
        }
        
        saveToRecentPlaces(placeData)
        
        emit('location-selected', {
          ...location,
          name: place.name,
          address: place.formatted_address
        })
        
        clearSearch()
        showSuggestions.value = false
      }
    }
  )
}

// 프리셋 선택
const selectPreset = (preset) => {
  emit('location-selected', {
    ...preset.location,
    altitude: preset.altitude,
    name: preset.name
  })
}

// 최근 장소 선택
const selectPlace = (place) => {
  emit('location-selected', {
    ...place.location,
    name: place.name,
    address: place.address
  })
  showSuggestions.value = false
}

// 검색 초기화
const clearSearch = () => {
  searchQuery.value = ''
  suggestions.value = []
  showSuggestions.value = false
}

// 최근 검색 저장
const saveToRecentPlaces = (place) => {
  // 중복 제거
  recentPlaces.value = recentPlaces.value.filter(p => p.id !== place.id)
  
  // 맨 앞에 추가
  recentPlaces.value.unshift(place)
  
  // 최대 5개 유지
  if (recentPlaces.value.length > 5) {
    recentPlaces.value = recentPlaces.value.slice(0, 5)
  }
  
  // localStorage에 저장
  localStorage.setItem('aerialRecentPlaces', JSON.stringify(recentPlaces.value))
}

// 최근 검색 로드
const loadRecentPlaces = () => {
  try {
    const saved = localStorage.getItem('aerialRecentPlaces')
    if (saved) {
      recentPlaces.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('Failed to load recent places:', error)
  }
}

// 검색어 변경 감지
watch(searchQuery, (newQuery) => {
  if (newQuery) {
    fetchSuggestions(newQuery)
  } else {
    suggestions.value = []
  }
})

// 외부 클릭 감지
const handleOutsideClick = (e) => {
  if (!e.target.closest('.location-search')) {
    showSuggestions.value = false
  }
}

onMounted(() => {
  // Google Maps 로드 대기
  const checkGoogleMaps = setInterval(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      clearInterval(checkGoogleMaps)
      initPlacesService()
    }
  }, 500)
  
  // 30초 후 타임아웃
  setTimeout(() => {
    clearInterval(checkGoogleMaps)
    if (!window.google || !window.google.maps) {
      console.warn('Google Maps API failed to load after 30 seconds')
    }
  }, 30000)
  
  // 외부 클릭 리스너
  document.addEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
.location-search {
  position: relative;
  width: 100%;
  max-width: 500px;
}

.search-container {
  display: flex;
  align-items: center;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 4px;
  transition: border-color 0.2s;
}

.search-container:focus-within {
  border-color: var(--primary-color);
}

.search-icon {
  margin: 0 12px;
  color: var(--text-secondary);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 8px 0;
  background: transparent;
}

.clear-btn,
.search-btn {
  padding: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  border-radius: 8px;
}

.clear-btn:hover {
  background: var(--bg-secondary);
}

.search-btn {
  background: var(--primary-color);
  color: white;
  margin-left: 4px;
}

.search-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 제안 드롭다운 */
.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
}

.suggestion-group {
  padding: 8px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.suggestion-item:hover {
  background: var(--bg-secondary);
}

.suggestion-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.place-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.place-address {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 프리셋 버튼 */
.location-presets {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.preset-btn span {
  font-weight: 500;
}
</style>