<template>
  <div class="trend-analysis-ai">
    <div class="analysis-header">
      <div class="header-left">
        <TrendingUp :size="24" />
        <h2>AI 트렌드 분석</h2>
        <Badge variant="success">실시간</Badge>
      </div>
      <div class="header-actions">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="브랜드명 또는 키워드 입력..."
          class="search-input"
          @keyup.enter="analyzeTrends"
        />
        <select v-model="selectedCategory" class="category-select">
          <option value="general">전체</option>
          <option value="fashion">패션</option>
          <option value="tech">테크</option>
          <option value="food">식품</option>
          <option value="beauty">뷰티</option>
        </select>
        <button @click="analyzeTrends" :disabled="loading" class="btn-analyze">
          <Sparkles :size="16" />
          {{ loading ? '분석 중...' : 'AI 분석' }}
        </button>
      </div>
    </div>

    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>YouTube 50개 동영상과 네이버 트렌드를 AI가 분석 중입니다...</p>
    </div>

    <!-- 분석 결과 -->
    <div v-else-if="analysisResult" class="analysis-results">
      
      <!-- AI 인사이트 섹션 -->
      <div class="ai-insights-section">
        <h3>
          <Brain :size="20" />
          AI 분석 인사이트
        </h3>
        
        <div class="insights-grid">
          <!-- 핵심 키워드 -->
          <div class="insight-card">
            <h4>🔍 핵심 트렌드 키워드</h4>
            <div class="keyword-tags">
              <span v-for="keyword in analysisResult.analysis.keywords" :key="keyword" class="keyword-tag">
                {{ keyword }}
              </span>
            </div>
          </div>
          
          <!-- 콘텐츠 유형 분석 -->
          <div class="insight-card">
            <h4>📊 인기 콘텐츠 유형</h4>
            <div class="content-types">
              <div v-for="(count, type) in analysisResult.analysis.contentTypes" :key="type" class="content-type">
                <span>{{ translateContentType(type) }}</span>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: `${(count / maxContentCount) * 100}%` }"></div>
                </div>
                <span class="count">{{ count }}개</span>
              </div>
            </div>
          </div>
          
          <!-- 감성 분석 -->
          <div class="insight-card">
            <h4>💭 감성 분석</h4>
            <div class="sentiment-chart">
              <div class="sentiment-bar positive" :style="{ width: `${analysisResult.analysis.sentiment.positive * 100}%` }">
                긍정 {{ Math.round(analysisResult.analysis.sentiment.positive * 100) }}%
              </div>
              <div class="sentiment-bar neutral" :style="{ width: `${analysisResult.analysis.sentiment.neutral * 100}%` }">
                중립 {{ Math.round(analysisResult.analysis.sentiment.neutral * 100) }}%
              </div>
              <div class="sentiment-bar negative" :style="{ width: `${analysisResult.analysis.sentiment.negative * 100}%` }">
                부정 {{ Math.round(analysisResult.analysis.sentiment.negative * 100) }}%
              </div>
            </div>
          </div>
          
          <!-- 트렌드 방향성 -->
          <div class="insight-card">
            <h4>📈 트렌드 방향성</h4>
            <div class="trend-direction">
              <div class="direction-indicator" :class="analysisResult.analysis.trend.direction">
                <component :is="getTrendIcon(analysisResult.analysis.trend.direction)" :size="32" />
                <span>{{ translateTrendDirection(analysisResult.analysis.trend.direction) }}</span>
              </div>
              <p class="confidence">신뢰도: {{ Math.round(analysisResult.analysis.trend.confidence * 100) }}%</p>
            </div>
          </div>
          
          <!-- 타겟 오디언스 -->
          <div class="insight-card">
            <h4>👥 주요 타겟층</h4>
            <div class="audience-info">
              <p><strong>연령대:</strong> {{ analysisResult.analysis.audience.primaryAge }}</p>
              <div class="interests">
                <span v-for="interest in analysisResult.analysis.audience.interests" :key="interest" class="interest-tag">
                  {{ interest }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 마케팅 인사이트 -->
          <div class="insight-card full-width">
            <h4>💡 마케팅 제안</h4>
            <ul class="marketing-insights">
              <li v-for="(insight, index) in analysisResult.analysis.insights" :key="index">
                {{ insight }}
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- 원본 데이터 섹션 -->
      <div class="raw-data-section">
        <div class="data-tabs">
          <button 
            @click="activeTab = 'youtube'" 
            :class="{ active: activeTab === 'youtube' }"
            class="tab-button"
          >
            <Youtube :size="16" />
            YouTube Top 10
          </button>
          <button 
            @click="activeTab = 'naver'" 
            :class="{ active: activeTab === 'naver' }"
            class="tab-button"
          >
            <Search :size="16" />
            네이버 트렌드
          </button>
        </div>
        
        <!-- YouTube 데이터 -->
        <div v-if="activeTab === 'youtube'" class="youtube-data">
          <div v-for="video in analysisResult.rawData.youtube" :key="video.title" class="video-item">
            <div class="video-info">
              <h5>{{ video.title }}</h5>
              <p class="channel">{{ video.channel }}</p>
            </div>
            <div class="video-stats">
              <span><Eye :size="14" /> {{ formatNumber(video.viewCount) }}</span>
              <span><ThumbsUp :size="14" /> {{ formatNumber(video.likeCount) }}</span>
              <span><MessageCircle :size="14" /> {{ formatNumber(video.commentCount) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 네이버 데이터 -->
        <div v-if="activeTab === 'naver'" class="naver-data">
          <div v-for="item in analysisResult.rawData.naver" :key="item.title || item.category" class="naver-item">
            <div class="item-type" :class="item.type">
              {{ item.type === 'news' ? '뉴스' : '쇼핑' }}
            </div>
            <div class="item-info">
              <h5>{{ item.title || item.category }}</h5>
              <p v-if="item.description">{{ item.description }}</p>
              <span v-if="item.trend" class="trend-badge" :class="item.trend">
                {{ translateTrend(item.trend) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 초기 상태 -->
    <div v-else class="empty-state">
      <TrendingUp :size="48" class="empty-icon" />
      <h3>AI 트렌드 분석을 시작하세요</h3>
      <p>브랜드명이나 키워드를 입력하면 YouTube와 네이버의 실시간 트렌드를 AI가 분석합니다</p>
      <div class="sample-keywords">
        <span @click="quickAnalyze('삼성')" class="sample-keyword">삼성</span>
        <span @click="quickAnalyze('스타벅스')" class="sample-keyword">스타벅스</span>
        <span @click="quickAnalyze('나이키')" class="sample-keyword">나이키</span>
        <span @click="quickAnalyze('BTS')" class="sample-keyword">BTS</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  TrendingUp, Sparkles, Brain, Youtube, Search, Eye, ThumbsUp, 
  MessageCircle, TrendingDown, Minus, ArrowUp, ArrowDown
} from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'

// State
const searchKeyword = ref('')
const selectedCategory = ref('general')
const loading = ref(false)
const analysisResult = ref(null)
const activeTab = ref('youtube')

// Computed
const maxContentCount = computed(() => {
  if (!analysisResult.value?.analysis?.contentTypes) return 1
  return Math.max(...Object.values(analysisResult.value.analysis.contentTypes))
})

// Methods
const analyzeTrends = async () => {
  if (!searchKeyword.value.trim()) {
    alert('검색어를 입력해주세요')
    return
  }
  
  loading.value = true
  analysisResult.value = null
  
  try {
    const response = await fetch('/.netlify/functions/analyzeTrendsWithAI', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandName: searchKeyword.value,
        category: selectedCategory.value
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      analysisResult.value = result.data
      console.log('AI 분석 결과:', result.data)
    } else {
      throw new Error(result.error || '분석 실패')
    }
    
  } catch (error) {
    console.error('트렌드 분석 실패:', error)
    alert('트렌드 분석 중 오류가 발생했습니다')
  } finally {
    loading.value = false
  }
}

const quickAnalyze = (keyword) => {
  searchKeyword.value = keyword
  analyzeTrends()
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const translateContentType = (type) => {
  const translations = {
    review: '리뷰',
    unboxing: '언박싱',
    comparison: '비교',
    tutorial: '튜토리얼'
  }
  return translations[type] || type
}

const translateTrend = (trend) => {
  const translations = {
    viral: '🔥 폭발적',
    hot: '🔥 인기',
    rising: '📈 상승',
    steady: '➡️ 유지',
    falling: '📉 하락'
  }
  return translations[trend] || trend
}

const translateTrendDirection = (direction) => {
  const translations = {
    rising: '상승세',
    falling: '하락세',
    steady: '정체'
  }
  return translations[direction] || direction
}

const getTrendIcon = (direction) => {
  if (direction === 'rising') return ArrowUp
  if (direction === 'falling') return ArrowDown
  return Minus
}
</script>

<style scoped>
.trend-analysis-ai {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-input {
  width: 300px;
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 14px;
}

.category-select {
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.btn-analyze {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-analyze:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-analyze:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 로딩 상태 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 20px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* AI 인사이트 섹션 */
.ai-insights-section {
  margin-bottom: 40px;
}

.ai-insights-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 600;
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
}

.insight-card {
  padding: 20px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  transition: all 0.3s;
}

.insight-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.insight-card.full-width {
  grid-column: 1 / -1;
}

.insight-card h4 {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

/* 키워드 태그 */
.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  font-size: 14px;
}

/* 콘텐츠 유형 */
.content-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-type {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.content-type span:first-child {
  min-width: 80px;
  font-weight: 500;
}

.progress-bar {
  flex: 1;
  height: 20px;
  background: #f3f4f6;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.5s ease;
}

.content-type .count {
  min-width: 40px;
  text-align: right;
  color: #6c757d;
}

/* 감성 차트 */
.sentiment-chart {
  display: flex;
  gap: 4px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
}

.sentiment-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: 500;
  transition: width 0.5s ease;
}

.sentiment-bar.positive {
  background: #28a745;
}

.sentiment-bar.neutral {
  background: #6c757d;
}

.sentiment-bar.negative {
  background: #dc3545;
}

/* 트렌드 방향성 */
.trend-direction {
  text-align: center;
}

.direction-indicator {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.direction-indicator.rising {
  background: #d4edda;
  color: #155724;
}

.direction-indicator.falling {
  background: #f8d7da;
  color: #721c24;
}

.direction-indicator.steady {
  background: #fff3cd;
  color: #856404;
}

.confidence {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

/* 오디언스 정보 */
.audience-info p {
  margin: 0 0 12px;
}

.interests {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.interest-tag {
  padding: 4px 10px;
  background: #f3f4f6;
  border-radius: 6px;
  font-size: 13px;
  color: #495057;
}

/* 마케팅 인사이트 */
.marketing-insights {
  margin: 0;
  padding-left: 20px;
}

.marketing-insights li {
  margin-bottom: 12px;
  color: #495057;
  line-height: 1.6;
}

/* 원본 데이터 섹션 */
.raw-data-section {
  margin-top: 40px;
}

.data-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6c757d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: -2px;
}

.tab-button:hover {
  color: #495057;
}

.tab-button.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

/* YouTube 데이터 */
.youtube-data {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.video-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.2s;
}

.video-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.video-info h5 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: #212529;
}

.video-info .channel {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
}

.video-stats {
  display: flex;
  gap: 16px;
}

.video-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6c757d;
}

/* 네이버 데이터 */
.naver-data {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.naver-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.2s;
}

.naver-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.item-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  height: fit-content;
}

.item-type.news {
  background: #d1ecf1;
  color: #0c5460;
}

.item-type.shopping {
  background: #d4edda;
  color: #155724;
}

.item-info {
  flex: 1;
}

.item-info h5 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
  color: #212529;
}

.item-info p {
  margin: 0 0 8px;
  font-size: 13px;
  color: #6c757d;
  line-height: 1.4;
}

.trend-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.trend-badge.viral,
.trend-badge.hot {
  background: #fee;
  color: #dc3545;
}

.trend-badge.rising {
  background: #d4edda;
  color: #155724;
}

.trend-badge.steady {
  background: #fff3cd;
  color: #856404;
}

.trend-badge.falling {
  background: #f8d7da;
  color: #721c24;
}

/* 빈 상태 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  color: #dee2e6;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 600;
  color: #495057;
}

.empty-state p {
  margin: 0 0 32px;
  color: #6c757d;
}

.sample-keywords {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sample-keyword {
  padding: 8px 16px;
  background: #f3f4f6;
  border-radius: 20px;
  color: #495057;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.sample-keyword:hover {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-2px);
}
</style>