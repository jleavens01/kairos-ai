<template>
  <div class="reference-search">
    <!-- 검색 입력 -->
    <div class="search-input-group">
      <div class="search-input-wrapper">
        <Search :size="20" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="검색어를 입력하세요 (예: 조지 워싱턴, 엘리자베스 2세)"
          class="search-input"
          @keyup.enter="handleSearch"
          :disabled="loading"
        />
        <button 
          v-if="searchQuery"
          @click="clearSearch"
          class="clear-button"
          type="button"
        >
          <X :size="16" />
        </button>
      </div>
      
      <div class="search-controls">
        <!-- 자동 번역 토글 -->
        <div class="translate-toggle">
          <label class="toggle-label">
            <input
              v-model="autoTranslate"
              type="checkbox"
              class="toggle-input"
            />
            <span class="toggle-switch"></span>
            <span class="toggle-text">
              <Languages :size="14" />
              자동 번역
            </span>
          </label>
        </div>
        
        <!-- 검색 버튼 -->
        <button
          @click="handleSearch"
          :disabled="!searchQuery.trim() || loading"
          class="search-button"
          type="button"
        >
          <Loader v-if="loading" :size="16" class="spin" />
          <Search v-else :size="16" />
          검색
        </button>
      </div>
    </div>
    
    <!-- 번역된 검색어 표시 -->
    <div v-if="translatedQuery && autoTranslate" class="translated-query">
      <span class="translated-label">번역된 검색어:</span>
      <span class="translated-text">{{ translatedQuery }}</span>
    </div>
    
    <!-- 검색 소스 선택 (콤팩트 버전) -->
    <div class="source-selection compact">
      <div class="source-header">
        <span class="source-label">검색 소스</span>
        <button @click="toggleAllSources" class="toggle-all-btn" type="button">
          {{ allSourcesSelected ? '해제' : '전체' }}
        </button>
      </div>
      <div class="source-buttons-grid">
        <button
          v-for="source in availableSources"
          :key="source.id"
          @click="toggleSource(source.id)"
          :class="['source-btn', `source-${source.id}`, { active: selectedSources.includes(source.id), disabled: source.requiresKey && !source.hasKey }]"
          :title="getSourceTooltip(source)"
          type="button"
        >
          {{ source.label }}
          <span v-if="source.requiresKey && !source.hasKey" class="key-indicator">🔒</span>
        </button>
      </div>
    </div>

    <!-- 검색 도움말 (간소화) -->
    <div class="search-tips compact">
      <div class="tip-item">
        <InfoIcon :size="12" />
        <span>검색된 이미지는 각 소스의 라이선스 정책을 따릅니다. 상업적 사용 시 개별 라이선스를 확인하세요.</span>
      </div>
    </div>

    <!-- 에러 메시지 -->
    <div v-if="errorMessage" class="error-message">
      <AlertCircle :size="16" />
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Search, X, Loader, AlertCircle, Languages, Info as InfoIcon } from 'lucide-vue-next'

const emit = defineEmits(['search', 'clear'])
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

// 반응형 데이터
const searchQuery = ref('')
const errorMessage = ref('')
const selectedSources = ref(['wikipedia', 'commons']) // 기본 선택
const autoTranslate = ref(false) // 자동 번역 토글
const translatedQuery = ref('') // 번역된 검색어
const apiKeys = ref({
  pixabay: false,
  unsplash: false,
  pexels: false,
  flickr: false,
  europeana: false,
  dpla: false
})

// 모든 검색 소스 정의
const availableSources = computed(() => [
  // 백과사전 및 문화자료
  { id: 'wikipedia', label: 'Wikipedia', category: 'encyclopedia', requiresKey: false, hasKey: true },
  { id: 'commons', label: 'Commons', category: 'cultural', requiresKey: false, hasKey: true },
  { id: 'met', label: 'Met Museum', category: 'cultural', requiresKey: false, hasKey: true },
  { id: 'europeana', label: 'Europeana', category: 'cultural', requiresKey: true, hasKey: apiKeys.value.europeana },
  { id: 'dpla', label: 'DPLA', category: 'cultural', requiresKey: true, hasKey: apiKeys.value.dpla },
  // 이미지 검색 서비스
  { id: 'pixabay', label: 'Pixabay', category: 'stock', requiresKey: false, hasKey: true }, // API 키 있음
  { id: 'unsplash', label: 'Unsplash', category: 'stock', requiresKey: false, hasKey: true }, // API 키 있음
  { id: 'pexels', label: 'Pexels', category: 'stock', requiresKey: true, hasKey: apiKeys.value.pexels },
  { id: 'flickr', label: 'Flickr', category: 'stock', requiresKey: true, hasKey: apiKeys.value.flickr }
])

const allSourcesSelected = computed(() => {
  // 모든 소스가 선택되었는지 확인 (API 키 여부와 무관)
  const allSourceIds = availableSources.value.map(s => s.id)
  return allSourceIds.length > 0 && allSourceIds.every(id => selectedSources.value.includes(id))
})

// 메서드
const handleSearch = async () => {
  const query = searchQuery.value.trim()
  
  if (!query) {
    errorMessage.value = '검색어를 입력해주세요.'
    return
  }

  if (query.length < 2) {
    errorMessage.value = '검색어는 2글자 이상 입력해주세요.'
    return
  }

  errorMessage.value = ''
  
  // 선택된 소스가 없으면 경고
  if (selectedSources.value.length === 0) {
    errorMessage.value = '최소 하나 이상의 검색 소스를 선택해주세요.'
    return
  }
  
  // 자동 번역이 켜져 있고, 영어 소스가 선택된 경우
  let finalQuery = query
  const englishSources = ['met', 'europeana', 'dpla', 'pixabay', 'unsplash', 'pexels', 'flickr']
  const hasEnglishSource = selectedSources.value.some(s => englishSources.includes(s))
  
  if (autoTranslate.value && hasEnglishSource) {
    // 한글이 포함되어 있는지 확인
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(query)
    
    if (hasKorean) {
      try {
        // 번역 API 호출 (Gemini 사용)
        const response = await fetch('/.netlify/functions/translatePrompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: query })
        
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data?.translatedPrompt) {
            translatedQuery.value = result.data.translatedPrompt
            finalQuery = result.data.translatedPrompt
            console.log(`Translated "${query}" to "${finalQuery}"`)
          }
        }
      } catch (error) {
        console.error('Translation error:', error)
        // 번역 실패 시 원본 사용
      }
    }
  }
  
  emit('search', {
    query: finalQuery,
    originalQuery: query,
    sources: selectedSources.value // 선택된 소스
  })
}

const clearSearch = () => {
  searchQuery.value = ''
  errorMessage.value = ''
  translatedQuery.value = ''
  emit('clear')
}

const toggleSource = (sourceId) => {
  const index = selectedSources.value.indexOf(sourceId)
  if (index > -1) {
    selectedSources.value.splice(index, 1)
  } else {
    selectedSources.value.push(sourceId)
  }
}

const toggleAllSources = () => {
  // 모든 소스를 선택 가능하게 함 (API 키 여부와 무관)
  const allSourceIds = availableSources.value.map(s => s.id)
  
  if (allSourcesSelected.value) {
    selectedSources.value = []
  } else {
    selectedSources.value = [...allSourceIds]
  }
}

const getSourceTooltip = (source) => {
  const fullNames = {
    'commons': 'Wikimedia Commons - 자유 미디어 저장소',
    'met': 'Metropolitan Museum of Art',
    'dpla': 'Digital Public Library of America',
    'wikipedia': 'Wikipedia - 온라인 백과사전',
    'europeana': 'Europeana - 유럽 문화유산',
    'pixabay': 'Pixabay - 무료 스톡 이미지',
    'unsplash': 'Unsplash - 고품질 무료 사진',
    'pexels': 'Pexels - 무료 스톡 사진',
    'flickr': 'Flickr - 사진 공유 커뮤니티'
  }
  
  const fullName = fullNames[source.id] || source.label
  if (source.requiresKey && !source.hasKey) {
    return `${fullName} (API 키 필요)`
  }
  return fullName
}

// API 키 확인 (서버에서 정보 가져오기)
onMounted(async () => {
  try {
    // 간단한 테스트 엔드포인트로 API 키 확인
    const response = await fetch('/.netlify/functions/checkApiKeys', {
      method: 'GET'
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.keys) {
        apiKeys.value = data.keys
        // 기본적으로 Wikipedia, Commons, Met Museum, Pixabay, Unsplash, DPLA 선택
        const defaultSources = ['wikipedia', 'commons', 'met', 'pixabay', 'unsplash', 'dpla']
        
        selectedSources.value = defaultSources
      }
    }
  } catch (error) {
    console.log('Could not check API keys')
    // 오류 시에도 기본값 설정
    selectedSources.value = ['wikipedia', 'commons', 'met', 'dpla'] // 기본 선택
  }
})

// 검색어 변경 시 에러 메시지 초기화
watch(searchQuery, () => {
  if (errorMessage.value) {
    errorMessage.value = ''
  }
})
</script>

<style scoped>
.reference-search {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.dark .reference-search {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

.search-input-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: var(--text-tertiary);
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem 0.875rem 3rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.clear-button {
  position: absolute;
  right: 0.75rem;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-button:hover {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.search-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

/* 자동 번역 토글 스타일 */
.translate-toggle {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.toggle-input {
  display: none;
}

.toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;
  background: var(--border-color);
  border-radius: 11px;
  transition: all 0.3s;
}

.toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s;
}

.toggle-input:checked + .toggle-switch {
  background: #10b981;
}

.toggle-input:checked + .toggle-switch::after {
  transform: translateX(18px);
}

.toggle-text {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

/* 번역된 검색어 표시 */
.translated-query {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 6px;
  margin-top: 0.75rem;
  font-size: 0.9rem;
}

.translated-label {
  color: var(--text-tertiary);
  font-weight: 500;
}

.translated-text {
  color: #10b981;
  font-weight: 600;
}

.search-type-tabs {
  display: flex;
  gap: 0.5rem;
}

.search-type-tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.search-type-tab:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.search-type-tab.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.language-select {
  flex-shrink: 0;
}

.language-dropdown {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.search-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.search-button:hover:not(:disabled) {
  background: var(--primary-dark);
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.search-tips.compact {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 0.75rem;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-tertiary);
}

.tip-item svg {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.9rem;
}

.dark .error-message {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .source-buttons-grid {
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 0.4rem;
  }
  
  .source-btn {
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
    min-height: 28px;
  }
  
  .search-tips.compact {
    font-size: 0.7rem;
    padding: 0.4rem 0.6rem;
  }
}

@media (max-width: 768px) {
  .reference-search {
    padding: 1rem;
  }
  
  .search-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .search-type-tabs {
    justify-content: center;
  }
  
  .search-button {
    justify-content: center;
    padding: 0.75rem 1rem;
  }
  
  .search-tips {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .search-input {
    padding-left: 2.5rem;
    font-size: 0.9rem;
  }
  
  .search-icon {
    left: 0.75rem;
  }
  
  .search-type-tab {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }
}

/* 소스 선택 영역 - 콤팩트 */
.source-selection.compact {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.source-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.source-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.toggle-all-btn {
  padding: 0.2rem 0.5rem;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-all-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.source-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.5rem;
}

.source-btn {
  padding: 0.4rem 0.6rem;
  background: white;
  border: 1.5px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-height: 32px;
  white-space: nowrap;
}

.dark .source-btn {
  background: var(--bg-secondary);
}

.source-btn:hover:not(.disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}


.source-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--bg-tertiary);
}

.source-btn.disabled:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.key-indicator {
  font-size: 0.7rem;
  margin-left: 0.1rem;
}

/* 모든 소스 통일된 활성화 색상 - 카이로스 AI 그린 */
.source-btn.active {
  background: #10b981;
  border-color: #10b981;
  color: white;
  font-weight: 600;
}

.source-btn.active:hover {
  background: #059669;
  border-color: #059669;
  transform: translateY(-1px);
}
</style>