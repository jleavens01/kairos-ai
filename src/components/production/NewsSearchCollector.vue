<template>
  <div class="news-search-collector">
    <!-- 검색 입력 섹션 -->
    <div class="search-section">
      <div class="search-header">
        <h3>뉴스 검색</h3>
        <div class="search-stats" v-if="searchResults.length > 0">
          총 {{ searchResults.length }}개 뉴스 발견
        </div>
      </div>
      
      <div class="search-form">
        <div class="search-inputs">
          <div class="input-group">
            <label>검색 키워드:</label>
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="검색할 키워드를 입력하세요"
              @keyup.enter="searchNews"
              class="search-input"
            />
          </div>
          
          <div class="input-group">
            <label>검색 범위:</label>
            <select v-model="searchDays" class="search-select">
              <option value="1">최근 1일</option>
              <option value="3">최근 3일</option>
              <option value="7">최근 1주일</option>
              <option value="30">최근 1개월</option>
            </select>
          </div>
          
          <div class="input-group">
            <label>결과 개수:</label>
            <select v-model="maxResults" class="search-select">
              <option value="10">10개</option>
              <option value="20">20개</option>
              <option value="50">50개</option>
            </select>
          </div>
        </div>
        
        <div class="action-buttons">
          <button 
            @click="searchNews" 
            :disabled="!searchQuery.trim() || isSearching"
            class="search-btn"
          >
            {{ isSearching ? '검색 중...' : '뉴스 검색' }}
          </button>
          
          <button 
            @click="generateScript" 
            :disabled="!searchQuery.trim() || isSearching"
            class="script-btn"
          >
            {{ isScriptGenerating ? '스크립트 생성 중...' : '스크립트 생성' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 검색 결과 섹션 -->
    <div class="results-section" v-if="searchResults.length > 0 || hasSearched">
      <div class="results-header">
        <h4>검색 결과</h4>
        <div class="result-actions">
          <button 
            @click="exportResults" 
            :disabled="searchResults.length === 0"
            class="export-btn"
          >
            결과 내보내기
          </button>
          <button 
            @click="clearResults" 
            :disabled="searchResults.length === 0"
            class="clear-btn"
          >
            결과 지우기
          </button>
        </div>
      </div>
      
      <!-- 빈 결과 -->
      <div v-if="hasSearched && searchResults.length === 0" class="empty-results">
        <p>검색 결과가 없습니다.</p>
      </div>
      
      <!-- 뉴스 결과 목록 -->
      <div v-else class="news-list">
        <div 
          v-for="(news, index) in searchResults" 
          :key="index" 
          class="news-item"
        >
          <div class="news-header">
            <h5 class="news-title">
              <a :href="news.url" target="_blank" rel="noopener">
                {{ news.title }}
              </a>
            </h5>
            <span class="news-date">{{ formatDate(news.published_at) }}</span>
          </div>
          
          <p class="news-summary">{{ news.summary }}</p>
          
          <div class="news-meta">
            <span class="news-source">{{ news.source }}</span>
            <div class="news-actions">
              <button 
                @click="copyNewsText(news)" 
                class="copy-btn"
              >
                텍스트 복사
              </button>
              <button 
                @click="saveNews(news)" 
                class="save-btn"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 로딩 상태 -->
    <div v-if="isSearching" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>뉴스를 검색하고 있습니다...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 상태 관리
const searchQuery = ref('')
const searchDays = ref('7')
const maxResults = ref('20')
const searchResults = ref([])
const isSearching = ref(false)
const hasSearched = ref(false)
const isScriptGenerating = ref(false)
const generatedScript = ref('')

// 뉴스 검색 함수
const searchNews = async () => {
  if (!searchQuery.value.trim()) return
  
  isSearching.value = true
  hasSearched.value = true
  
  try {
    const response = await fetch('/.netlify/functions/searchNewsOnly', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: searchQuery.value.trim(),
        days: parseInt(searchDays.value),
        maxResults: parseInt(maxResults.value)
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success) {
      searchResults.value = data.news || []
    } else {
      throw new Error(data.error || '뉴스 검색에 실패했습니다.')
    }
  } catch (error) {
    console.error('뉴스 검색 실패:', error)
    searchResults.value = []
    alert('뉴스 검색 중 오류가 발생했습니다: ' + error.message)
  } finally {
    isSearching.value = false
  }
}

// 결과 지우기
const clearResults = () => {
  searchResults.value = []
  hasSearched.value = false
}

// 뉴스 텍스트 복사
const copyNewsText = async (news) => {
  const text = `제목: ${news.title}\n날짜: ${formatDate(news.published_at)}\n출처: ${news.source}\n링크: ${news.url}\n\n요약:\n${news.summary}`
  
  try {
    await navigator.clipboard.writeText(text)
    alert('뉴스 내용이 클립보드에 복사되었습니다.')
  } catch (error) {
    console.error('복사 실패:', error)
    alert('복사에 실패했습니다.')
  }
}

// 뉴스 저장 (로컬스토리지)
const saveNews = (news) => {
  try {
    const savedNews = JSON.parse(localStorage.getItem('savedNews') || '[]')
    const newsWithTimestamp = {
      ...news,
      savedAt: new Date().toISOString()
    }
    
    savedNews.unshift(newsWithTimestamp)
    localStorage.setItem('savedNews', JSON.stringify(savedNews.slice(0, 100))) // 최대 100개만 저장
    
    alert('뉴스가 저장되었습니다.')
  } catch (error) {
    console.error('저장 실패:', error)
    alert('저장에 실패했습니다.')
  }
}

// 스크립트 생성 함수
const generateScript = async () => {
  if (!searchQuery.value.trim()) return
  
  isScriptGenerating.value = true
  
  try {
    const response = await fetch('/.netlify/functions/generateNewsScript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: searchQuery.value.trim(),
        days: parseInt(searchDays.value),
        maxResults: parseInt(maxResults.value),
        scriptType: 'summary'
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success) {
      generatedScript.value = data.script
      searchResults.value = data.news || []
      hasSearched.value = true
      
      // 스크립트를 별도 창에 표시
      showScriptModal(data.script)
    } else {
      throw new Error(data.error || '스크립트 생성에 실패했습니다.')
    }
  } catch (error) {
    console.error('스크립트 생성 실패:', error)
    alert('스크립트 생성 중 오류가 발생했습니다: ' + error.message)
  } finally {
    isScriptGenerating.value = false
  }
}

// 스크립트 모달 표시
const showScriptModal = (script) => {
  const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes')
  
  const htmlContent = `
    <html>
      <head>
        <title>${searchQuery.value} 뉴스 스크립트</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          h1, h2, h3 { color: #333; }
          pre { background: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
          .copy-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 10px 0; }
          .copy-btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <button class="copy-btn" onclick="copyScript()">스크립트 복사</button>
        <pre id="script-content">${script}</pre>
      </body>
    </html>
  `
  
  newWindow.document.write(htmlContent)
  
  // 스크립트를 별도로 추가
  const scriptEl = newWindow.document.createElement('script')
  scriptEl.textContent = `
    function copyScript() {
      const content = document.getElementById('script-content').textContent;
      navigator.clipboard.writeText(content).then(() => {
        alert('스크립트가 클립보드에 복사되었습니다!');
      });
    }
  `
  newWindow.document.head.appendChild(scriptEl)
}

// 결과 내보내기
const exportResults = () => {
  if (searchResults.value.length === 0 && !generatedScript.value) return
  
  const exportData = {
    searchQuery: searchQuery.value,
    searchDate: new Date().toISOString(),
    totalResults: searchResults.value.length,
    script: generatedScript.value,
    results: searchResults.value
  }
  
  const dataStr = JSON.stringify(exportData, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `news_script_${searchQuery.value}_${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// 날짜 포맷팅
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.news-search-collector {
  padding: 0;
}

.search-section {
  background: var(--bg-secondary);
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 600;
}

.search-stats {
  background: var(--primary-color);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-inputs {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 16px;
  align-items: end;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

.search-input,
.search-select {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.search-input:focus,
.search-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-btn,
.script-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.search-btn {
  background: var(--primary-color);
  color: white;
}

.search-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.script-btn {
  background: #28a745;
  color: white;
}

.script-btn:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.search-btn:disabled,
.script-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.results-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.results-header h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.export-btn,
.clear-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.export-btn:hover:not(:disabled),
.clear-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.export-btn:disabled,
.clear-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-results {
  padding: 40px 24px;
  text-align: center;
  color: var(--text-secondary);
}

.news-list {
  max-height: 600px;
  overflow-y: auto;
}

.news-item {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
}

.news-item:hover {
  background: var(--bg-tertiary);
}

.news-item:last-child {
  border-bottom: none;
}

.news-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 8px;
}

.news-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  flex: 1;
}

.news-title a {
  color: var(--text-primary);
  text-decoration: none;
  transition: color 0.2s;
}

.news-title a:hover {
  color: var(--primary-color);
}

.news-date {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  white-space: nowrap;
}

.news-summary {
  margin: 0 0 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  font-size: 0.95rem;
}

.news-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.news-source {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  font-weight: 500;
}

.news-actions {
  display: flex;
  gap: 8px;
}

.copy-btn,
.save-btn {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.copy-btn:hover,
.save-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 1000;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 반응형 */
@media (max-width: 768px) {
  .search-inputs {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .news-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .result-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>