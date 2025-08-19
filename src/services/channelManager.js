// 채널 매니저 - 다중 채널 프로필 관리 시스템
import WorldKnowledgeProfile from '@/config/channelProfiles/world-knowledge.js'

class ChannelManager {
  constructor() {
    this.channels = new Map()
    this.activeChannel = null
    this.defaultChannel = 'world-knowledge'
    
    // 기본 채널 등록
    this.registerChannel('world-knowledge', WorldKnowledgeProfile)
  }

  // 채널 등록
  registerChannel(channelId, profile) {
    if (!profile.channelInfo || !profile.contentIdentity) {
      throw new Error('Invalid channel profile structure')
    }
    
    this.channels.set(channelId, {
      profile,
      analytics: {
        contentProduced: 0,
        averageScore: 0,
        topCategories: [],
        lastUpdated: new Date()
      },
      customizations: {},
      learningData: []
    })
    
    console.log(`Channel registered: ${channelId}`)
  }

  // 활성 채널 설정
  setActiveChannel(channelId) {
    if (!this.channels.has(channelId)) {
      throw new Error(`Channel ${channelId} not found`)
    }
    
    this.activeChannel = channelId
    return this.getActiveProfile()
  }

  // 현재 활성 프로필 가져오기
  getActiveProfile() {
    const channelId = this.activeChannel || this.defaultChannel
    const channel = this.channels.get(channelId)
    return channel ? channel.profile : null
  }

  // 채널별 콘텐츠 점수 계산
  calculateScore(content, channelId = null) {
    const profile = channelId 
      ? this.channels.get(channelId)?.profile 
      : this.getActiveProfile()
    
    if (!profile) return 0
    
    let score = 0
    const criteria = profile.contentSelectionCriteria
    
    // 기본 점수 계산
    Object.entries(criteria).forEach(([criterion, config]) => {
      const weight = config.weight
      let criterionScore = 0
      
      // 관련성 점수
      if (criterion === 'relevance') {
        criterionScore = this.calculateRelevanceScore(content, config.factors)
      }
      // 교육적 가치
      else if (criterion === 'educational') {
        criterionScore = this.calculateEducationalScore(content, config.factors)
      }
      // 엔터테인먼트 가치
      else if (criterion === 'entertainment') {
        criterionScore = this.calculateEntertainmentScore(content, config.factors)
      }
      // 공유 가능성
      else if (criterion === 'shareability') {
        criterionScore = this.calculateShareabilityScore(content, config.factors)
      }
      // 독창성
      else if (criterion === 'uniqueness') {
        criterionScore = this.calculateUniquenessScore(content, config.factors)
      }
      
      score += criterionScore * weight
    })
    
    // 카테고리 가중치 적용
    if (content.category && profile.contentCategories[content.category]) {
      const categoryWeight = profile.contentCategories[content.category].weight
      score *= (1 + categoryWeight)
    }
    
    // 금기사항 체크
    const violations = this.checkRestrictions(content, profile)
    if (violations.length > 0) {
      score *= 0.5 // 금기사항 위반 시 50% 감점
    }
    
    return Math.round(score)
  }

  // 관련성 점수 계산
  calculateRelevanceScore(content, factors) {
    let score = 0
    const text = `${content.title} ${content.summary}`.toLowerCase()
    
    // 트렌딩 키워드 체크
    const trendingKeywords = [
      'ai', '인공지능', 'chatgpt', '기후변화', '전기차',
      '메타버스', '블록체인', '우주', '바이러스', '경제위기'
    ]
    
    trendingKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 20
    })
    
    // 시의성 체크 (최신 뉴스인지)
    if (content.metadata?.publishedAt) {
      const hoursAgo = (Date.now() - new Date(content.metadata.publishedAt)) / (1000 * 60 * 60)
      if (hoursAgo < 24) score += 30
      else if (hoursAgo < 72) score += 15
    }
    
    return Math.min(score, 100)
  }

  // 교육적 가치 점수
  calculateEducationalScore(content, factors) {
    let score = 0
    const text = `${content.title} ${content.summary}`.toLowerCase()
    
    const educationalKeywords = [
      '연구', '발견', '개발', '혁신', '최초', '원리', '방법',
      '이유', '원인', '결과', '영향', '분석', '설명', '이해'
    ]
    
    educationalKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 15
    })
    
    return Math.min(score, 100)
  }

  // 엔터테인먼트 점수
  calculateEntertainmentScore(content, factors) {
    let score = 0
    const text = `${content.title} ${content.summary}`.toLowerCase()
    
    const entertainmentKeywords = [
      '놀라운', '충격', '반전', '신기한', '재미있는', '흥미로운',
      '화제', '논란', '최고', '최악', '역대', '믿기지 않는'
    ]
    
    entertainmentKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 15
    })
    
    return Math.min(score, 100)
  }

  // 공유 가능성 점수
  calculateShareabilityScore(content, factors) {
    let score = 0
    const text = `${content.title} ${content.summary}`.toLowerCase()
    
    // 질문형 제목
    if (text.includes('?')) score += 20
    
    // 숫자나 통계 포함
    if (/\d+/.test(text)) score += 15
    
    // 리스트형 콘텐츠
    if (text.includes('가지') || text.includes('방법') || text.includes('이유')) {
      score += 25
    }
    
    return Math.min(score, 100)
  }

  // 독창성 점수
  calculateUniquenessScore(content, factors) {
    let score = 50 // 기본 점수
    const text = `${content.title} ${content.summary}`.toLowerCase()
    
    // 독특한 관점 키워드
    const uniqueKeywords = [
      '최초', '독점', '단독', '새로운', '혁신적', '획기적'
    ]
    
    uniqueKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 10
    })
    
    return Math.min(score, 100)
  }

  // 금기사항 체크
  checkRestrictions(content, profile) {
    const violations = []
    const text = `${content.title} ${content.summary}`.toLowerCase()
    
    profile.restrictions.absolute.forEach(restriction => {
      const keywords = restriction.toLowerCase().split(' ')
      if (keywords.some(keyword => text.includes(keyword))) {
        violations.push(restriction)
      }
    })
    
    return violations
  }

  // 스타일 가이드 적용
  applyStyleGuide(text, channelId = null) {
    const profile = channelId 
      ? this.channels.get(channelId)?.profile 
      : this.getActiveProfile()
    
    if (!profile) return text
    
    const style = profile.toneAndManner.writingStyle
    const narrative = profile.toneAndManner.narrativeStructure
    
    // 훅 선택
    const hook = narrative.hooks[Math.floor(Math.random() * narrative.hooks.length)]
    
    // 스타일 변환 규칙
    let styledText = text
    
    // 친근한 어투로 변환
    styledText = styledText.replace(/입니다\./g, '이에요.')
    styledText = styledText.replace(/습니다\./g, '어요.')
    styledText = styledText.replace(/됩니다\./g, '돼요.')
    
    // 질문 추가
    if (!styledText.includes('?')) {
      styledText = `${hook} ${styledText}`
    }
    
    return {
      original: text,
      styled: styledText,
      hook,
      structure: narrative
    }
  }

  // 콘텐츠 검증
  validateContent(content, channelId = null) {
    const profile = channelId 
      ? this.channels.get(channelId)?.profile 
      : this.getActiveProfile()
    
    if (!profile) {
      return { valid: false, errors: ['No active channel profile'] }
    }
    
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    }
    
    // 필수 요소 체크
    if (!content.title || content.title.length < 10) {
      validation.errors.push('제목이 너무 짧습니다 (최소 10자)')
      validation.valid = false
    }
    
    if (!content.summary || content.summary.length < 50) {
      validation.errors.push('요약이 너무 짧습니다 (최소 50자)')
      validation.valid = false
    }
    
    // 금기사항 체크
    const violations = this.checkRestrictions(content, profile)
    if (violations.length > 0) {
      validation.errors.push(`금지된 내용 포함: ${violations.join(', ')}`)
      validation.valid = false
    }
    
    // 스타일 체크
    const text = `${content.title} ${content.summary}`
    const avoidList = profile.toneAndManner.writingStyle.avoidList
    
    avoidList.forEach(avoidItem => {
      if (text.includes(avoidItem)) {
        validation.warnings.push(`피해야 할 표현 사용: ${avoidItem}`)
      }
    })
    
    // 개선 제안
    if (!text.includes('?')) {
      validation.suggestions.push('질문을 추가하여 호기심을 자극하세요')
    }
    
    if (!/\d+/.test(text)) {
      validation.suggestions.push('구체적인 숫자나 통계를 추가하세요')
    }
    
    return validation
  }

  // 채널 학습 데이터 추가
  addLearningData(channelId, data) {
    const channel = this.channels.get(channelId)
    if (!channel) return
    
    channel.learningData.push({
      ...data,
      timestamp: new Date()
    })
    
    // 최근 100개 데이터만 유지
    if (channel.learningData.length > 100) {
      channel.learningData = channel.learningData.slice(-100)
    }
    
    // 분석 데이터 업데이트
    this.updateAnalytics(channelId)
  }

  // 채널 분석 데이터 업데이트
  updateAnalytics(channelId) {
    const channel = this.channels.get(channelId)
    if (!channel) return
    
    const learningData = channel.learningData
    
    // 평균 점수 계산
    const scores = learningData.map(d => d.score || 0)
    channel.analytics.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length
    
    // 인기 카테고리 분석
    const categories = {}
    learningData.forEach(d => {
      if (d.category) {
        categories[d.category] = (categories[d.category] || 0) + 1
      }
    })
    
    channel.analytics.topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, count]) => ({ category: cat, count }))
    
    channel.analytics.contentProduced = learningData.length
    channel.analytics.lastUpdated = new Date()
  }

  // 채널 프로필 커스터마이징
  customizeChannel(channelId, customizations) {
    const channel = this.channels.get(channelId)
    if (!channel) return
    
    channel.customizations = {
      ...channel.customizations,
      ...customizations
    }
    
    // 프로필에 커스터마이징 적용
    if (customizations.contentCategories) {
      channel.profile.contentCategories = {
        ...channel.profile.contentCategories,
        ...customizations.contentCategories
      }
    }
    
    if (customizations.toneAndManner) {
      channel.profile.toneAndManner = {
        ...channel.profile.toneAndManner,
        ...customizations.toneAndManner
      }
    }
  }

  // 채널 프로필 내보내기
  exportChannelProfile(channelId) {
    const channel = this.channels.get(channelId)
    if (!channel) return null
    
    return {
      profile: channel.profile,
      analytics: channel.analytics,
      customizations: channel.customizations,
      exportDate: new Date().toISOString()
    }
  }

  // 채널 프로필 가져오기
  importChannelProfile(channelId, profileData) {
    if (!profileData.profile) {
      throw new Error('Invalid profile data')
    }
    
    this.registerChannel(channelId, profileData.profile)
    
    if (profileData.customizations) {
      this.customizeChannel(channelId, profileData.customizations)
    }
    
    return this.channels.get(channelId)
  }
}

// 싱글톤 인스턴스
const channelManager = new ChannelManager()

export default channelManager