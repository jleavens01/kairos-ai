<template>
  <div class="news-collector">
    <!-- 헤더 -->
    <div class="collector-header">
      <div class="header-left">
        <Sparkles :size="24" />
        <h2>AI 트렌드 분석 & 키워드 발굴</h2>
        <Badge v-if="dataSource === 'fresh'" variant="success">실시간</Badge>
        <Badge v-else-if="dataSource === 'saved'" variant="secondary">저장된 데이터</Badge>
      </div>
      <div class="header-actions">
        <button @click="collectTrends" :disabled="isCollecting || isLoading" class="btn-primary">
          <RefreshCw :size="16" :class="{ spinning: isCollecting }" />
          {{ isCollecting ? (collectingProgress || '분석 중...') : '새로 수집' }}
        </button>
        <span v-if="lastCollected" class="last-collected">
          <Clock :size="14" />
          {{ formatTime(lastCollected) }}
        </span>
      </div>
    </div>

    <!-- 저장 성공 메시지 -->
    <div v-if="showSaveSuccess" class="save-success">
      <CheckCircle :size="16" />
      트렌드 데이터가 데이터베이스에 저장되었습니다
    </div>

    <!-- 초기 로딩 상태 -->
    <div v-if="isLoading && !trendData" class="loading-state">
      <div class="loading-spinner"></div>
      <p>저장된 트렌드 데이터를 불러오는 중...</p>
    </div>

    <!-- 수집 중 로딩 상태 -->
    <div v-else-if="isCollecting" class="loading-state">
      <div class="loading-spinner"></div>
      <p>YouTube 인기 동영상 50개와 네이버 트렌드를 AI가 분석 중입니다...</p>
      <p class="loading-detail">실시간 데이터를 수집하여 최신 트렌드 키워드를 도출합니다</p>
    </div>

    <!-- 오류 메시지 -->
    <div v-else-if="errorMessage" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>트렌드 수집 실패</h3>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-hints">
        <p>다음 사항을 확인해주세요:</p>
        <ul>
          <li>YouTube API 키가 올바르게 설정되어 있는지 확인</li>
          <li>네이버 API 클라이언트 ID와 Secret이 설정되어 있는지 확인</li>
          <li>API 키의 할당량이 초과되지 않았는지 확인</li>
          <li>네트워크 연결이 정상적인지 확인</li>
        </ul>
      </div>
      <button @click="collectTrends" class="btn-retry">
        <RefreshCw :size="16" />
        다시 시도
      </button>
    </div>

    <!-- 분석 결과 -->
    <div v-else-if="trendData" class="analysis-results">
      
      <!-- 트렌드 대시보드 -->
      <div class="trend-dashboard">
        <!-- TOP 3 핫 트렌드 -->
        <div class="hot-trends-section">
          <div class="section-header">
            <h3>
              <Flame :size="20" />
              🔥 실시간 HOT 트렌드 TOP 3
            </h3>
          </div>
          <div class="hot-trends-grid">
            <div 
              v-for="(brand, index) in trendData.brands.filter(b => b.trend === 'viral' || b.trend === 'hot').slice(0, 3)" 
              :key="brand.brand"
              class="hot-trend-card"
              :class="`rank-${index + 1}`"
              @click="selectBrand(brand)"
            >
              <div class="rank-badge">{{ index + 1 }}</div>
              <div class="trend-content">
                <h4>{{ brand.brand }}</h4>
                <div class="trend-metrics">
                  <div class="metric">
                    <span class="metric-value">{{ brand.score }}</span>
                    <span class="metric-label">관심도</span>
                  </div>
                  <div class="trend-status" :class="brand.trend">
                    {{ getTrendLabel(brand.trend) }}
                  </div>
                </div>
                <div class="trend-topics">
                  <span v-for="topic in brand.topics.slice(0, 2)" :key="topic" class="topic-chip">
                    {{ topic }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 실시간 지표 카드 -->
        <div class="metrics-cards">
          <div class="metric-card">
            <div class="metric-icon">
              <Youtube :size="24" />
            </div>
            <div class="metric-info">
              <span class="metric-number">{{ formatNumber(trendData.statistics.totalYoutubeViews) }}</span>
              <span class="metric-name">총 조회수</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">
              <TrendingUp :size="24" />
            </div>
            <div class="metric-info">
              <span class="metric-number">{{ trendData.keywords?.length || 0 }}</span>
              <span class="metric-name">트렌드 키워드</span>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">
              <Zap :size="24" />
            </div>
            <div class="metric-info">
              <span class="metric-number">{{ trendData.brands?.filter(b => b.trend === 'viral' || b.trend === 'hot').length || 0 }}</span>
              <span class="metric-name">급상승 브랜드</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 브랜드 트렌드 맵 -->
      <div class="brand-trend-map">
        <div class="section-header">
          <h3>
            <Target :size="20" />
            브랜드 트렌드 맵
          </h3>
          <div class="filter-chips">
            <button 
              v-for="trend in ['all', 'viral', 'hot', 'rising', 'steady']" 
              :key="trend"
              @click="filterTrend = trend"
              :class="{ active: filterTrend === trend }"
              class="filter-chip"
            >
              {{ trend === 'all' ? '전체' : getTrendLabel(trend) }}
            </button>
          </div>
        </div>
        <div class="brand-grid">
          <div 
            v-for="brand in filteredBrands" 
            :key="brand.brand"
            class="brand-tile"
            :class="[brand.trend, { selected: selectedBrand === brand.brand }]"
            @click="selectBrand(brand)"
          >
            <div class="brand-tile-header">
              <h5>{{ brand.brand }}</h5>
              <span class="score-badge">{{ brand.score }}</span>
            </div>
            <div class="brand-tile-footer">
              <span class="trend-indicator" :class="brand.trend">
                {{ getTrendLabel(brand.trend) }}
              </span>
              <span class="topic-count">{{ brand.topics?.length || 0 }} topics</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 카테고리별 트렌드 분석 -->
      <div class="category-analysis">
        <div class="section-header">
          <h3>
            <BarChart2 :size="20" />
            카테고리별 트렌드 분석
          </h3>
        </div>
        <div class="category-tabs">
          <button 
            v-for="(keywords, industry) in trendData.trends" 
            :key="industry"
            @click="activeIndustry = industry"
            :class="{ active: activeIndustry === industry }"
            class="category-tab"
          >
            {{ getIndustryLabel(industry) }}
            <span class="keyword-count">{{ keywords?.length || 0 }}</span>
          </button>
        </div>
        <div class="category-content">
          <div v-if="trendData.trends[activeIndustry]" class="keywords-cloud">
            <span 
              v-for="(keyword, index) in trendData.trends[activeIndustry]" 
              :key="keyword"
              class="keyword-tag"
              :class="`size-${Math.min(3, Math.floor((trendData.trends[activeIndustry].length - index) / 3))}`"
            >
              {{ keyword }}
            </span>
          </div>
        </div>
      </div>

      <!-- 콘텐츠 제작 추천 -->
      <div class="content-recommendations">
        <h3>
          <Lightbulb :size="20" />
          추천 콘텐츠 아이디어
        </h3>
        <div class="recommendation-list">
          <div 
            v-for="(insight, index) in trendData.insights" 
            :key="index"
            class="recommendation-card"
            @click="createContent(insight)"
          >
            <div class="rec-header">
              <h4>{{ insight.brand }}</h4>
              <Badge :variant="getInterestVariant(insight.interest)">
                {{ insight.interest }}
              </Badge>
            </div>
            <p class="rec-story">{{ insight.story }}</p>
            <button class="btn-create">
              <PenTool :size="14" />
              콘텐츠 작성
            </button>
          </div>
        </div>
      </div>

      <!-- YouTube 실시간 인기 동영상 50개 -->
      <div v-if="trendData.youtubeVideos && trendData.youtubeVideos.length > 0" class="youtube-videos-section">
        <h3>
          <Youtube :size="20" />
          YouTube 실시간 인기 동영상 TOP 50
        </h3>
        <div class="youtube-grid">
          <a 
            v-for="video in trendData.youtubeVideos" 
            :key="video.id" 
            :href="video.url" 
            target="_blank" 
            rel="noopener noreferrer"
            class="youtube-card"
          >
            <div class="video-thumbnail-wrapper">
              <img 
                v-if="video.thumbnail" 
                :src="video.thumbnail" 
                :alt="video.title" 
                class="video-thumbnail" 
              />
              <div class="video-overlay">
                <PlayCircle :size="32" />
              </div>
            </div>
            <div class="video-info">
              <h5 class="video-title">{{ video.title }}</h5>
              <p class="video-channel">{{ video.channel }}</p>
              <div class="video-stats">
                <span class="view-count">
                  <Eye :size="14" />
                  {{ formatNumber(video.viewCount) }}
                </span>
                <span class="like-count">
                  <ThumbsUp :size="14" />
                  {{ formatNumber(video.likeCount) }}
                </span>
              </div>
            </div>
          </a>
        </div>
      </div>

      <!-- 네이버 쇼핑인사이트 카테고리별 트렌드 -->
      <div v-if="trendData.naverCategories && trendData.naverCategories.length > 0" class="naver-categories-section">
        <h3>
          <ShoppingCart :size="20" />
          네이버 쇼핑인사이트 카테고리별 트렌드
        </h3>
        <div class="category-cards">
          <div 
            v-for="category in trendData.naverCategories" 
            :key="category.keyword" 
            class="category-card"
            :class="category.trend"
          >
            <div class="category-header">
              <h4>{{ category.category }}</h4>
              <span class="trend-badge" :class="category.trend">
                {{ getTrendLabel(category.trend) }}
              </span>
            </div>
            <div class="category-stats">
              <div class="stat">
                <span class="stat-label">검색량</span>
                <span class="stat-value">{{ formatNumber(category.searchVolume) }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">변화율</span>
                <span class="stat-value" :class="{ positive: category.changeRate > 0, negative: category.changeRate < 0 }">
                  {{ category.changeRate > 0 ? '+' : '' }}{{ category.changeRate }}%
                </span>
              </div>
            </div>
            <div v-if="category.data && category.data.length > 0" class="mini-chart">
              <svg :viewBox="`0 0 ${category.data.length * 10} 40`" preserveAspectRatio="none">
                <polyline
                  :points="getChartPoints(category.data)"
                  fill="none"
                  stroke="#667eea"
                  stroke-width="2"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 기존 실시간 인기 콘텐츠 섹션 (Top 5 요약) -->
      <div class="top-content">
        <div class="content-tabs">
          <button 
            @click="activeTab = 'youtube'" 
            :class="{ active: activeTab === 'youtube' }"
            class="tab-btn"
          >
            <Youtube :size="16" />
            YouTube Top 5
          </button>
          <button 
            @click="activeTab = 'naver'" 
            :class="{ active: activeTab === 'naver' }"
            class="tab-btn"
          >
            <Search :size="16" />
            네이버 트렌드
          </button>
        </div>

        <!-- YouTube 콘텐츠 -->
        <div v-if="activeTab === 'youtube'" class="content-list">
          <div v-for="video in trendData.topContent.youtube" :key="video.id" class="content-item">
            <img v-if="video.thumbnail" :src="video.thumbnail" :alt="video.title" class="content-thumb" />
            <div class="content-info">
              <h5>{{ video.title }}</h5>
              <p class="content-meta">
                {{ video.channel }} · 조회수 {{ formatNumber(video.viewCount) }}
              </p>
            </div>
          </div>
        </div>

        <!-- 네이버 콘텐츠 -->
        <div v-if="activeTab === 'naver'" class="content-list">
          <div v-for="item in trendData.topContent.naver" :key="item.keyword" class="content-item">
            <div class="content-type search">
              쇼핑
            </div>
            <div class="content-info">
              <h5>{{ item.keyword }}</h5>
              <p class="content-meta">
                검색량: {{ formatNumber(item.searchVolume) }}
                <span v-if="item.changeRate" class="change-rate" :class="{ positive: item.changeRate > 0 }">
                  {{ item.changeRate > 0 ? '+' : '' }}{{ item.changeRate }}%
                </span>
              </p>
              <span v-if="item.trend" class="trend-indicator" :class="item.trend">
                {{ getTrendLabel(item.trend) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 통계 정보 -->
      <div class="statistics">
        <div class="stat-item">
          <span class="stat-label">분석한 YouTube 동영상</span>
          <span class="stat-value">{{ trendData.statistics.totalVideos }}개</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">총 조회수</span>
          <span class="stat-value">{{ formatNumber(trendData.statistics.totalYoutubeViews) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">네이버 데이터</span>
          <span class="stat-value">{{ trendData.statistics.totalNaverItems }}개</span>
        </div>
      </div>
    </div>

    <!-- 초기 상태 -->
    <div v-else class="empty-state">
      <TrendingUp :size="48" class="empty-icon" />
      <h3>실시간 트렌드를 수집하세요</h3>
      <p>YouTube와 네이버의 최신 트렌드를 AI가 분석하여</p>
      <p>지금 가장 주목받는 브랜드 키워드를 제시합니다</p>
      <button @click="collectTrends" class="btn-start">
        <Sparkles :size="16" />
        트렌드 분석 시작
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useProductionStore } from '@/stores/production'
import { supabase } from '@/utils/supabase'
import { 
  Sparkles, RefreshCw, Clock, TrendingUp, Layers, 
  Lightbulb, PenTool, Youtube, Search, PlayCircle,
  Eye, ThumbsUp, ShoppingCart, CheckCircle, Flame,
  Zap, Target, BarChart2
} from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'

// Props 정의
const props = defineProps({
  projectId: {
    type: String,
    default: null
  }
})

const productionStore = useProductionStore()

// State
const isCollecting = ref(false)
const collectingProgress = ref('')
const isLoading = ref(true)
const trendData = ref(null)
const lastCollected = ref(null)
const activeTab = ref('youtube')
const activeIndustry = ref('tech')
const errorMessage = ref(null)
const showSaveSuccess = ref(false)
const dataSource = ref('') // 'saved' or 'fresh'
const filterTrend = ref('all')
const selectedBrand = ref(null)

// Computed
const filteredBrands = computed(() => {
  if (!trendData.value?.brands) return []
  if (filterTrend.value === 'all') return trendData.value.brands.slice(0, 20)
  return trendData.value.brands
    .filter(b => b.trend === filterTrend.value)
    .slice(0, 20)
})

// Methods
const collectTrends = async () => {
  isCollecting.value = true
  collectingProgress.value = '시작 중...'
  errorMessage.value = null
  let currentJobId = null
  
  try {
    // 1. 비동기 작업 시작
    const startResponse = await fetch('/.netlify/functions/autoCollectTrendsAsync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: props.projectId || 'default'
      })
    })
    
    const startResult = await startResponse.json()
    
    if (!startResult.success) {
      throw new Error(startResult.error || '트렌드 수집 시작 실패')
    }
    
    currentJobId = startResult.jobId
    console.log('트렌드 수집 시작:', currentJobId)
    collectingProgress.value = '수집 중...'
    
    // 2. 폴링으로 결과 확인 (최대 60초)
    const maxAttempts = 30 // 2초마다 체크, 최대 60초
    let attempts = 0
    let resultData = null
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2초 대기
      
      const checkResponse = await fetch(`/.netlify/functions/getTrendResult?projectId=${props.projectId || 'default'}&jobId=${currentJobId}`)
      const checkResult = await checkResponse.json()
      
      if (checkResult.success && checkResult.status === 'completed') {
        resultData = checkResult.data
        break
      } else if (checkResult.status === 'failed') {
        throw new Error('트렌드 수집 실패')
      }
      
      attempts++
      
      // 진행 상황 표시
      const elapsedSeconds = attempts * 2
      collectingProgress.value = `${elapsedSeconds}초...`
      
      if (attempts % 5 === 0) {
        console.log(`트렌드 수집 진행 중... (${elapsedSeconds}초 경과)`)
      }
    }
    
    if (resultData) {
      collectingProgress.value = '완료!'
      trendData.value = resultData
      lastCollected.value = new Date()
      dataSource.value = 'fresh'
      console.log('트렌드 수집 완료:', resultData)
      
      // 스토어에 저장
      if (productionStore.setTrendData) {
        productionStore.setTrendData(resultData)
      }
      
      // Supabase에 저장
      await saveTrendDataToSupabase(resultData)
    } else {
      errorMessage.value = '트렌드 수집 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
      console.error('트렌드 수집 타임아웃')
    }
    
  } catch (error) {
    console.error('트렌드 수집 오류:', error)
    errorMessage.value = error.message || '트렌드 수집 중 오류가 발생했습니다.'
    trendData.value = null
  } finally {
    isCollecting.value = false
    collectingProgress.value = ''
  }
}

// Supabase에 트렌드 데이터 저장
const saveTrendDataToSupabase = async (data) => {
  try {
    // 사용자 인증 토큰 가져오기
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.access_token) {
      console.error('인증 토큰이 없습니다.')
      return
    }

    const response = await fetch('/.netlify/functions/saveTrendData', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`
      },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('트렌드 데이터 저장 완료:', result.collectionId)
      showSaveSuccess.value = true
      setTimeout(() => {
        showSaveSuccess.value = false
      }, 3000)
    } else {
      console.error('트렌드 데이터 저장 실패:', result.error)
    }
  } catch (error) {
    console.error('트렌드 데이터 저장 오류:', error)
  }
}

const selectBrand = (brand) => {
  console.log('브랜드 선택:', brand)
  // 프로덕션 시트 생성 또는 세모지 원고 작성으로 연결
  alert(`"${brand.brand}" 브랜드로 콘텐츠를 제작하시겠습니까?`)
}

const createContent = (insight) => {
  console.log('콘텐츠 제작:', insight)
  // 세모지 원고 작성 화면으로 이동
  alert(`"${insight.brand} - ${insight.story}" 콘텐츠 제작을 시작합니다`)
}

const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 100000000) return Math.floor(num / 100000000) + '억'
  if (num >= 10000) return Math.floor(num / 10000) + '만'
  return num.toLocaleString()
}

const formatTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

const getTrendLabel = (trend) => {
  const labels = {
    viral: '🔥 폭발적',
    hot: '🔥 인기',
    rising: '📈 상승',
    steady: '➡️ 유지'
  }
  return labels[trend] || trend
}

const getIndustryLabel = (industry) => {
  const labels = {
    tech: '🔧 테크',
    fashion: '👗 패션/뷰티',
    food: '🍔 식음료',
    entertainment: '🎬 엔터테인먼트'
  }
  return labels[industry] || industry
}

const getInterestVariant = (interest) => {
  if (interest === '높음') return 'destructive'
  if (interest === '중간') return 'warning'
  return 'secondary'
}

const getChartPoints = (data) => {
  if (!data || data.length === 0) return ''
  const maxRatio = Math.max(...data.map(d => d.ratio))
  return data.map((point, index) => {
    const x = index * 10
    const y = 40 - (point.ratio / maxRatio * 35)
    return `${x},${y}`
  }).join(' ')
}

// 저장된 트렌드 데이터 불러오기
const loadSavedTrends = async () => {
  isLoading.value = true
  try {
    // 사용자 인증 토큰 가져오기
    const { data: session } = await supabase.auth.getSession()
    if (!session?.session?.access_token) {
      console.log('인증 토큰이 없습니다.')
      isLoading.value = false
      return
    }

    const response = await fetch('/.netlify/functions/getTrendData', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${session.session.access_token}`
      }
    })
    
    const result = await response.json()
    
    if (result.success && result.data) {
      trendData.value = result.data
      lastCollected.value = new Date(result.collectedAt)
      dataSource.value = 'saved'
      console.log('저장된 트렌드 데이터 로드 완료:', result.collectedAt)
      
      // 스토어에도 저장
      if (productionStore.setTrendData) {
        productionStore.setTrendData(result.data)
      }
    } else {
      console.log('저장된 트렌드 데이터가 없습니다.')
    }
  } catch (error) {
    console.error('트렌드 데이터 로드 오류:', error)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  // 페이지 로드 시 저장된 트렌드 데이터 불러오기
  loadSavedTrends()
})
</script>

<style scoped>
.news-collector {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.collector-header {
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
  align-items: center;
  gap: 16px;
}

.btn-primary {
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

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.last-collected {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #6c757d;
  font-size: 14px;
}

/* 로딩 상태 */
.loading-state {
  text-align: center;
  padding: 80px 20px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-state p {
  margin: 0 0 8px;
  color: #495057;
  font-size: 16px;
}

.loading-detail {
  color: #6c757d;
  font-size: 14px;
}

/* 트렌드 대시보드 */
.trend-dashboard {
  margin-bottom: 40px;
}

/* HOT 트렌드 섹션 */
.hot-trends-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #212529;
}

.hot-trends-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.hot-trend-card {
  position: relative;
  padding: 24px;
  background: white;
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  overflow: hidden;
}

.hot-trend-card.rank-1 {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);
  border-color: #ff4757;
}

.hot-trend-card.rank-2 {
  background: linear-gradient(135deg, #fff8f0 0%, #ffe5cc 100%);
  border-color: #ff6348;
}

.hot-trend-card.rank-3 {
  background: linear-gradient(135deg, #f0f8ff 0%, #e0f0ff 100%);
  border-color: #5f9ea0;
}

.hot-trend-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.rank-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 50%;
  font-size: 18px;
  font-weight: 700;
}

.trend-content h4 {
  margin: 0 0 16px;
  font-size: 22px;
  font-weight: 700;
  color: #212529;
}

.trend-metrics {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 12px;
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #212529;
}

.metric-label {
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trend-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.trend-status.viral {
  background: #ff4757;
  color: white;
}

.trend-status.hot {
  background: #ff6348;
  color: white;
}

.trend-topics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.topic-chip {
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  font-size: 13px;
  color: #495057;
}

/* 실시간 지표 카드 */
.metrics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.metric-card {
  padding: 20px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.metric-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-number {
  font-size: 28px;
  font-weight: 700;
  color: #212529;
  line-height: 1;
}

.metric-name {
  font-size: 13px;
  color: #6c757d;
  margin-top: 4px;
}

/* 브랜드 트렌드 맵 */
.brand-trend-map {
  margin-bottom: 40px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  border: 1px solid #e9ecef;
}

.filter-chips {
  display: flex;
  gap: 8px;
}

.filter-chip {
  padding: 6px 16px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip:hover {
  border-color: #667eea;
  color: #667eea;
}

.filter-chip.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.brand-tile {
  padding: 16px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.brand-tile:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.brand-tile.viral {
  border-color: #ffebee;
  background: #fff5f5;
}

.brand-tile.hot {
  border-color: #fff3e0;
  background: #fffaf0;
}

.brand-tile.rising {
  border-color: #e8f5e9;
  background: #f5fff5;
}

.brand-tile.selected {
  border-color: #667eea;
  background: #f5f7ff;
}

.brand-tile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.brand-tile-header h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #212529;
  line-height: 1.3;
}

.score-badge {
  padding: 2px 6px;
  background: #667eea;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.brand-tile-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trend-indicator {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.trend-indicator.viral {
  color: #dc3545;
}

.trend-indicator.hot {
  color: #fd7e14;
}

.trend-indicator.rising {
  color: #28a745;
}

.trend-indicator.steady {
  color: #6c757d;
}

.topic-count {
  font-size: 11px;
  color: #6c757d;
}

/* 카테고리별 트렌드 분석 */
.category-analysis {
  margin-bottom: 40px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  border: 1px solid #e9ecef;
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #f3f4f6;
  padding-bottom: 0;
}

.category-tab {
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: #6c757d;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  margin-bottom: -2px;
}

.category-tab:hover {
  color: #495057;
  background: #f8f9fa;
}

.category-tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: transparent;
}

.keyword-count {
  padding: 2px 6px;
  background: #e9ecef;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  color: #6c757d;
}

.category-tab.active .keyword-count {
  background: #667eea;
  color: white;
}

.category-content {
  padding: 20px 0;
}

.keywords-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.keyword-tag {
  padding: 8px 16px;
  background: #f3f4f6;
  border-radius: 20px;
  color: #495057;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.keyword-tag:hover {
  background: #667eea;
  color: white;
  transform: translateY(-2px);
}

.keyword-tag.size-3 {
  font-size: 18px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 700;
}

.keyword-tag.size-2 {
  font-size: 16px;
  padding: 8px 18px;
  background: #e9ecef;
  color: #212529;
  font-weight: 600;
}

.keyword-tag.size-1 {
  font-size: 14px;
  padding: 6px 14px;
  font-weight: 500;
}

.keyword-tag.size-0 {
  font-size: 13px;
  padding: 5px 12px;
  font-weight: 400;
}

/* 콘텐츠 추천 */
.content-recommendations {
  margin-bottom: 40px;
}

.content-recommendations h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
}

.recommendation-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.recommendation-card {
  padding: 20px;
  background: linear-gradient(135deg, #f5f7ff 0%, #f0f2ff 100%);
  border: 1px solid #dee2ff;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.recommendation-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
}

.rec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rec-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

.rec-story {
  margin: 0 0 16px;
  color: #495057;
  line-height: 1.5;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #667eea;
  color: #667eea;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create:hover {
  background: #667eea;
  color: white;
}

/* 실시간 콘텐츠 */
.top-content {
  margin-bottom: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.content-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #6c757d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.tab-btn.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.content-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  transition: all 0.2s;
}

.content-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.content-thumb {
  width: 120px;
  height: 68px;
  object-fit: cover;
  border-radius: 6px;
}

.content-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  height: fit-content;
}

.content-type.news {
  background: #d1ecf1;
  color: #0c5460;
}

.content-type.search {
  background: #d4edda;
  color: #155724;
}

.content-info {
  flex: 1;
}

.content-info h5 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: #212529;
  line-height: 1.4;
}

.content-meta,
.content-desc {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
  line-height: 1.4;
}

.change-rate {
  margin-left: 8px;
  font-weight: 500;
  color: #dc3545;
}

.change-rate.positive {
  color: #28a745;
}

.trend-indicator {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.trend-indicator.viral,
.trend-indicator.hot {
  background: #fee;
  color: #dc3545;
}

.trend-indicator.rising {
  background: #d4edda;
  color: #155724;
}

/* 통계 */
.statistics {
  display: flex;
  justify-content: space-around;
  padding: 20px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 600;
  color: #212529;
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
  margin: 0 0 4px;
  color: #6c757d;
  font-size: 14px;
}

.btn-start {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 오류 상태 */
.error-state {
  text-align: center;
  padding: 60px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-state h3 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 600;
  color: #dc3545;
}

.error-message {
  margin: 0 0 24px;
  font-size: 16px;
  color: #495057;
}

.error-hints {
  background: #fff5f5;
  border: 1px solid #fee;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: left;
}

.error-hints p {
  margin: 0 0 12px;
  font-weight: 500;
  color: #721c24;
}

.error-hints ul {
  margin: 0;
  padding-left: 24px;
  color: #721c24;
}

.error-hints li {
  margin-bottom: 8px;
  font-size: 14px;
}

.btn-retry {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-retry:hover {
  background: #c82333;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

/* YouTube 동영상 섹션 */
.youtube-videos-section {
  margin-bottom: 40px;
}

.youtube-videos-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #212529;
}

.youtube-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.youtube-card {
  display: block;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  transition: all 0.3s;
}

.youtube-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-color: #ff0000;
}

.video-thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  background: #f3f4f6;
  overflow: hidden;
}

.video-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  color: white;
}

.youtube-card:hover .video-overlay {
  opacity: 1;
}

.video-info {
  padding: 12px;
}

.video-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: #212529;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-channel {
  margin: 0 0 8px;
  font-size: 12px;
  color: #6c757d;
}

.video-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6c757d;
}

.view-count,
.like-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 네이버 쇼핑 카테고리 섹션 */
.naver-categories-section {
  margin-bottom: 40px;
}

.naver-categories-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #212529;
}

.category-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.category-card {
  padding: 20px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  transition: all 0.3s;
}

.category-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.category-card.hot {
  border-left: 4px solid #fd7e14;
}

.category-card.rising {
  border-left: 4px solid #28a745;
}

.category-card.steady {
  border-left: 4px solid #6c757d;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.category-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

.category-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.category-stats .stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-stats .stat-label {
  font-size: 12px;
  color: #6c757d;
}

.category-stats .stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

.category-stats .stat-value.positive {
  color: #28a745;
}

.category-stats .stat-value.negative {
  color: #dc3545;
}

.mini-chart {
  height: 40px;
  width: 100%;
  background: #f8f9fa;
  border-radius: 4px;
  padding: 4px;
}

.mini-chart svg {
  width: 100%;
  height: 100%;
}

/* 저장 성공 메시지 */
.save-success {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  border: 1px solid #b1dfbb;
  border-radius: 8px;
  color: #155724;
  font-size: 14px;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>