<template>
  <div class="news-item-card" :class="{ 'ai-enhanced': item.metadata?.isAIEnhanced }">
    <!-- 헤더 -->
    <div class="card-header">
      <div class="score-section">
        <div class="score-badge" :class="getScoreClass(displayScore)">
          <TrendingUp :size="16" />
          <span class="score-value">{{ displayScore }}점</span>
        </div>
        <Badge v-if="item.ai_analyzed" variant="success">
          <Sparkles :size="12" />
          AI 분석
        </Badge>
      </div>
      <div class="meta-info">
        <span class="press">{{ item.metadata?.press }}</span>
        <span class="time">{{ item.metadata?.publishedAt }}</span>
      </div>
    </div>

    <!-- 썸네일 -->
    <div class="thumbnail-section" v-if="item.thumbnail_url">
      <img :src="item.thumbnail_url" :alt="item.title" @error="handleImageError" />
    </div>

    <!-- 콘텐츠 -->
    <div class="content-section">
      <h3 class="title">{{ item.title }}</h3>
      <p class="summary">{{ item.summary }}</p>
      
      <!-- 브랜드 태그 -->
      <div class="brands-section" v-if="getAllBrands().length > 0">
        <div class="brands-label">
          <Tag :size="14" />
          <span>브랜드</span>
        </div>
        <div class="brand-tags">
          <span v-for="brand in getAllBrands()" :key="brand" class="brand-tag">
            {{ brand }}
          </span>
        </div>
      </div>
    </div>

    <!-- 트렌드 분석 결과 (새로운 형식) -->
    <div v-if="item.metadata?.evaluationReasons" class="trend-analysis-section">
      <div class="platform-badge" :class="`platform-${item.metadata?.platform}`">
        <component :is="getPlatformIcon(item.metadata?.platform)" :size="14" />
        {{ getPlatformLabel(item.metadata?.platform) }}
      </div>
      <h4>
        <TrendingUp :size="16" />
        트렌드 분석 상세
      </h4>
      
      <!-- 브랜드 및 연관 키워드 -->
      <div class="brand-keywords" v-if="item.metadata?.brand">
        <div class="brand-name">
          <strong>{{ item.metadata.brand }}</strong>
        </div>
        <div class="related-keywords" v-if="item.metadata?.keywords?.length > 0">
          <span class="keywords-label">연관 검색어 TOP 5:</span>
          <div class="keyword-list">
            <span v-for="(keyword, idx) in item.metadata.keywords.slice(0, 5)" :key="idx" class="keyword-tag">
              #{{ keyword }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 평가 상세 -->
      <div class="evaluation-details">
        <div v-for="reason in item.metadata.evaluationReasons" :key="reason.category" class="evaluation-item">
          <div class="evaluation-header">
            <span class="category">{{ reason.category }}</span>
            <span class="score-badge" :class="getEvalScoreClass(reason.score)">
              +{{ reason.score }}점
            </span>
          </div>
          <p class="evaluation-detail">{{ reason.detail }}</p>
        </div>
      </div>
      
      <!-- 검색량 및 변화율 -->
      <div class="metrics-row" v-if="item.metadata?.searchVolume">
        <div class="metric-item">
          <span class="metric-label">검색량</span>
          <span class="metric-value">{{ item.metadata.searchVolume.toLocaleString() }}회</span>
        </div>
        <div class="metric-item" v-if="item.metadata?.changeRate !== undefined">
          <span class="metric-label">변화율</span>
          <span class="metric-value" :class="{ positive: item.metadata.changeRate > 0, negative: item.metadata.changeRate < 0 }">
            {{ item.metadata.changeRate > 0 ? '+' : '' }}{{ item.metadata.changeRate }}%
          </span>
        </div>
      </div>
    </div>
    
    <!-- AI 분석 결과 (기존) -->
    <div v-if="item.ai_analysis && !item.metadata?.evaluationReasons" class="ai-analysis-section">
      <!-- 스토리 앵글 -->
      <div v-if="item.ai_analysis.storyAngles?.length > 0" class="story-angles">
        <h4>
          <BookOpen :size="16" />
          스토리 앵글
        </h4>
        <div v-for="angle in item.ai_analysis.storyAngles" :key="angle.title" class="story-angle">
          <span class="angle-type">{{ getAngleTypeLabel(angle.type) }}</span>
          <strong>{{ angle.title }}</strong>
          <p>{{ angle.description }}</p>
        </div>
      </div>

      <!-- 콘텐츠 아이디어 -->
      <div v-if="item.ai_analysis.contentIdeas?.length > 0" class="content-ideas">
        <h4>
          <Lightbulb :size="16" />
          콘텐츠 아이디어
        </h4>
        <div v-for="idea in item.ai_analysis.contentIdeas" :key="idea.title" class="content-idea">
          <div class="idea-header">
            <strong>{{ idea.title }}</strong>
            <Badge variant="outline">{{ idea.targetAudience }}</Badge>
          </div>
          <p>{{ idea.description }}</p>
          <span class="estimated-views">예상 조회수: {{ idea.estimatedViews }}</span>
        </div>
      </div>

      <!-- 숨은 사실 -->
      <div v-if="item.ai_analysis.hiddenFacts?.length > 0" class="hidden-facts">
        <h4>
          <Eye :size="16" />
          숨은 사실
        </h4>
        <ul>
          <li v-for="(fact, index) in item.ai_analysis.hiddenFacts" :key="index">
            {{ fact }}
          </li>
        </ul>
      </div>

      <!-- 적합성 평가 -->
      <div class="fit-scores">
        <div class="fit-score">
          <span class="label">트렌드 적합도</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (item.ai_analysis.trendRelevance?.score || 0) + '%' }"></div>
          </div>
          <span class="score">{{ item.ai_analysis.trendRelevance?.score || 0 }}점</span>
        </div>
        <div class="fit-score">
          <span class="label">브랜드백과 적합도</span>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: (item.ai_analysis.brandEncyclopediaFit?.score || 0) + '%' }"></div>
          </div>
          <span class="score">{{ item.ai_analysis.brandEncyclopediaFit?.score || 0 }}점</span>
        </div>
      </div>
    </div>

    <!-- 액션 버튼 -->
    <div class="card-actions">
      <button @click="viewDetails" class="btn-secondary">
        <ExternalLink :size="16" />
        원문 보기
      </button>
      <button @click="createContent" class="btn-primary">
        <Plus :size="16" />
        콘텐츠 제작
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  TrendingUp, Tag, BookOpen, Lightbulb, Eye, 
  ExternalLink, Plus, Sparkles, Search, Youtube, Hash
} from 'lucide-vue-next';
import Badge from '@/components/ui/Badge.vue';

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['view-details', 'create-content']);

// 표시할 점수 계산
const displayScore = computed(() => {
  return props.item.final_score || props.item.score || 0;
});

// 평가 점수 클래스
const getEvalScoreClass = (score) => {
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
};

// 플랫폼 아이콘 가져오기
const getPlatformIcon = (platform) => {
  switch (platform) {
    case 'naver': return Search;
    case 'youtube': return Youtube;
    case 'instagram': return Hash;
    default: return TrendingUp;
  }
};

// 플랫폼 라벨 가져오기
const getPlatformLabel = (platform) => {
  switch (platform) {
    case 'naver': return '네이버 검색';
    case 'youtube': return '유튜브';
    case 'instagram': return '인스타그램';
    default: return '트렌드';
  }
};

// 모든 브랜드 가져오기 (기본 + AI 분석)
const getAllBrands = () => {
  const brands = new Set();
  
  // 기본 브랜드
  if (props.item.metadata?.brands) {
    props.item.metadata.brands.forEach(b => brands.add(b.brand || b));
  }
  
  // AI 감지 브랜드 (새로운 구조)
  if (props.item.ai_analysis?.detectedBrands) {
    props.item.ai_analysis.detectedBrands.forEach(b => brands.add(b));
  }
  
  // AI 연관 브랜드 (새로운 구조)
  if (props.item.ai_analysis?.relatedBrands) {
    props.item.ai_analysis.relatedBrands.forEach(b => brands.add(b));
  }
  
  return Array.from(brands);
};

// 점수에 따른 클래스
const getScoreClass = (score) => {
  if (score >= 80) return 'score-high';
  if (score >= 50) return 'score-medium';
  return 'score-low';
};

// 스토리 타입 라벨
const getAngleTypeLabel = (type) => {
  const labels = {
    history: '역사',
    innovation: '혁신',
    competition: '경쟁',
    founder: '창업자',
    product: '제품'
  };
  return labels[type] || type;
};

// 이미지 에러 처리
const handleImageError = (e) => {
  e.target.style.display = 'none';
};

// 상세보기
const viewDetails = () => {
  if (props.item.source_url) {
    window.open(props.item.source_url, '_blank');
  }
};

// 콘텐츠 제작
const createContent = () => {
  emit('create-content', props.item);
};
</script>

<style scoped>
.news-item-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.news-item-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.news-item-card.ai-enhanced {
  border: 2px solid #5B6CFF;
}

/* 헤더 */
.card-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.score-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.score-badge.score-high {
  background: #e7f5ff;
  color: #1c7ed6;
}

.score-badge.score-medium {
  background: #fff4e6;
  color: #f76707;
}

.score-badge.score-low {
  background: #f8f9fa;
  color: #868e96;
}

.meta-info {
  display: flex;
  gap: 12px;
  color: #868e96;
  font-size: 13px;
}

/* 썸네일 */
.thumbnail-section {
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f8f9fa;
}

.thumbnail-section img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 콘텐츠 */
.content-section {
  padding: 16px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px;
  line-height: 1.4;
}

.summary {
  font-size: 14px;
  color: #495057;
  line-height: 1.6;
  margin: 0 0 12px;
  /* 잘림 제거 - 전체 내용 표시 */
  word-break: keep-all;
  white-space: pre-wrap;
}

/* 브랜드 */
.brands-section {
  margin-top: 12px;
}

.brands-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #868e96;
  margin-bottom: 8px;
}

.brand-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.brand-tag {
  padding: 4px 8px;
  background: #f1f3f5;
  border-radius: 4px;
  font-size: 12px;
  color: #495057;
}

/* AI 분석 */
.ai-analysis-section {
  padding: 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.ai-analysis-section h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #212529;
}

.story-angles,
.content-ideas,
.hidden-facts {
  margin-bottom: 16px;
}

.story-angle,
.content-idea {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.angle-type {
  display: inline-block;
  padding: 2px 6px;
  background: #e7f5ff;
  color: #1c7ed6;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 8px;
}

.story-angle strong,
.content-idea strong {
  display: block;
  margin: 4px 0;
  font-size: 14px;
}

.story-angle p,
.content-idea p {
  margin: 4px 0;
  font-size: 13px;
  color: #495057;
  line-height: 1.4;
}

.idea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.estimated-views {
  font-size: 11px;
  color: #868e96;
}

.hidden-facts ul {
  margin: 0;
  padding-left: 20px;
}

.hidden-facts li {
  font-size: 13px;
  color: #495057;
  margin-bottom: 4px;
}

/* 적합성 점수 */
.fit-scores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.fit-score {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fit-score .label {
  font-size: 11px;
  color: #868e96;
}

.progress-bar {
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #5B6CFF, #7C8AFF);
  transition: width 0.3s ease;
}

.fit-score .score {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
}

/* 액션 버튼 */
.card-actions {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}

.btn-secondary,
.btn-primary {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #f1f3f5;
  color: #495057;
}

.btn-secondary:hover {
  background: #e9ecef;
}

.btn-primary {
  background: #5B6CFF;
  color: white;
}

.btn-primary:hover {
  background: #4C5CE5;
}

/* 트렌드 분석 섹션 */
.trend-analysis-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin: 16px;
}

.trend-analysis-section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #333;
}

.brand-keywords {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.brand-name {
  font-size: 18px;
  margin-bottom: 12px;
  color: #5B6CFF;
}

.related-keywords {
  margin-top: 8px;
}

.keywords-label {
  font-size: 12px;
  color: #666;
  display: block;
  margin-bottom: 8px;
}

.keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  padding: 4px 10px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  font-size: 12px;
  color: #333;
}

.evaluation-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.evaluation-item {
  background: white;
  border-radius: 6px;
  padding: 12px;
}

.evaluation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.evaluation-header .category {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.evaluation-header .score-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.score-badge.high {
  background: #10b981;
  color: white;
}

.score-badge.medium {
  background: #f59e0b;
  color: white;
}

.score-badge.low {
  background: #6b7280;
  color: white;
}

.evaluation-detail {
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

.metrics-row {
  display: flex;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
}

.metric-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.metric-value.positive {
  color: #10b981;
}

.metric-value.negative {
  color: #ef4444;
}

/* 플랫폼 배지 */
.platform-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
}

.platform-badge.platform-naver {
  background: #03c75a;
  color: white;
}

.platform-badge.platform-youtube {
  background: #ff0000;
  color: white;
}

.platform-badge.platform-instagram {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  color: white;
}
</style>