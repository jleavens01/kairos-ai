<template>
  <div class="ai-content-dashboard">
    <!-- 시스템 상태 알림 -->
    <div v-if="!systemStatus.tablesCreated" class="system-alert warning">
      <AlertCircle :size="20" />
      <div>
        <strong>데이터베이스 설정 필요</strong>
        <p>AI 콘텐츠 시스템 테이블이 생성되지 않았습니다. Supabase에서 SQL 파일을 실행해주세요.</p>
        <small>경로: /database/tables/README.md 참조</small>
      </div>
    </div>
    
    <div v-else-if="!systemStatus.channelProfileInitialized && !systemStatus.checking" class="system-alert info">
      <Settings :size="20" />
      <div>
        <strong>채널 프로필 초기화 중...</strong>
        <p>세상의모든지식 채널 프로필을 설정하고 있습니다.</p>
      </div>
    </div>

    <!-- 헤더 -->
    <div class="dashboard-header">
      <div class="header-left">
        <Bot :size="24" />
        <h1>AI 콘텐츠 제작 시스템</h1>
        <Badge variant="success">자동화 모드</Badge>
      </div>
      <div class="header-actions">
        <button @click="openChannelProfile" class="btn-secondary">
          <Tv :size="16" />
          채널 프로필
        </button>
        <button @click="openNewsCollector" class="btn-secondary">
          <TrendingUp :size="16" />
          트렌드 분석
        </button>
        <button 
          @click="startFullPipeline" 
          class="btn-primary"
          :disabled="!systemStatus.tablesCreated"
        >
          <PlayCircle :size="16" />
          전체 파이프라인 실행
        </button>
      </div>
    </div>

    <!-- 워크플로우 상태 -->
    <div class="workflow-status">
      <div class="status-card">
        <div class="status-header">
          <h3>현재 워크플로우</h3>
          <span class="status-badge" :class="workflowStatus">{{ workflowStatus }}</span>
        </div>
        <div class="workflow-steps">
          <div 
            v-for="(step, index) in workflowSteps" 
            :key="step.id"
            class="workflow-step"
            :class="{ 
              active: step.status === 'in_progress',
              completed: step.status === 'completed',
              pending: step.status === 'pending'
            }"
          >
            <div class="step-icon">
              <component :is="step.icon" :size="20" />
            </div>
            <div class="step-content">
              <div class="step-name">{{ step.name }}</div>
              <div class="step-status">{{ step.description }}</div>
            </div>
            <div v-if="index < workflowSteps.length - 1" class="step-connector"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 에이전트 활동 모니터 -->
    <div class="agents-monitor">
      <h2>AI 에이전트 활동</h2>
      <div class="agents-grid">
        <div 
          v-for="agent in agents" 
          :key="agent.id"
          class="agent-card"
          :class="{ active: agent.isActive }"
        >
          <div class="agent-header">
            <div class="agent-avatar">
              <component :is="agent.icon" :size="24" />
            </div>
            <div class="agent-info">
              <h4>{{ agent.name }}</h4>
              <span class="agent-role">{{ agent.role }}</span>
            </div>
          </div>
          <div class="agent-status">
            <div v-if="agent.isActive" class="status-active">
              <div class="pulse"></div>
              <span>작업 중...</span>
            </div>
            <div v-else-if="agent.lastTask" class="status-idle">
              <Clock :size="14" />
              <span>{{ formatTime(agent.lastTask) }}</span>
            </div>
            <div v-else class="status-waiting">
              대기 중
            </div>
          </div>
          <div v-if="agent.currentTask" class="agent-task">
            <div class="task-title">{{ agent.currentTask.title }}</div>
            <div class="task-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: agent.currentTask.progress + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 콘텐츠 파이프라인 -->
    <div class="content-pipeline">
      <h2>콘텐츠 파이프라인</h2>
      <div class="pipeline-stages">
        <div class="stage" v-for="stage in pipelineStages" :key="stage.id">
          <div class="stage-header">
            <h3>{{ stage.name }}</h3>
            <span class="stage-count">{{ stage.items.length }}</span>
          </div>
          <div class="stage-items">
            <div 
              v-for="item in stage.items" 
              :key="item.id"
              class="pipeline-item"
              @click="viewItemDetails(item)"
            >
              <div class="item-title">{{ item.title }}</div>
              <div class="item-meta">
                <span class="item-score">{{ item.score }}점</span>
                <span class="item-time">{{ formatTime(item.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 최근 생성된 콘텐츠 -->
    <div class="recent-content">
      <h2>최근 생성 콘텐츠</h2>
      <div class="content-grid">
        <div 
          v-for="content in recentContent" 
          :key="content.id"
          class="content-card"
        >
          <div class="content-thumbnail">
            <img 
              v-if="content.thumbnail" 
              :src="content.thumbnail" 
              :alt="content.title"
            />
            <div v-else class="no-thumbnail">
              <FileText :size="32" />
            </div>
          </div>
          <div class="content-info">
            <h4>{{ content.title }}</h4>
            <div class="content-stats">
              <span>{{ content.duration }}</span>
              <span>{{ content.scenes }}개 씬</span>
            </div>
            <div class="content-actions">
              <button @click="viewProject(content.projectId)" class="btn-view">
                <Eye :size="16" />
                보기
              </button>
              <button @click="editProject(content.projectId)" class="btn-edit">
                <Edit :size="16" />
                편집
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 채널 프로필 모달 -->
    <ChannelProfileManager 
      v-if="showChannelProfile"
      @close="showChannelProfile = false"
    />
    
    <!-- 뉴스 수집 모달 -->
    <div v-if="showNewsCollector" class="modal-overlay" @click.self="showNewsCollector = false">
      <div class="modal-container news-collector-modal">
        <div class="modal-header">
          <h2>AI 콘텐츠 제작 시스템 - 뉴스 수집</h2>
          <button @click="showNewsCollector = false" class="close-btn">
            ✕
          </button>
        </div>
        <div class="modal-body">
          <NewsCollector />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Bot, PlayCircle, Tv, Clock, Eye, Edit, FileText,
  Newspaper, Search, PenTool, Image, Video, Check, Badge,
  AlertCircle, Settings, TrendingUp
} from 'lucide-vue-next'
import { supabase } from '@/utils/supabase'
import ChannelProfileManager from '../production/ChannelProfileManager.vue'
import NewsCollector from '../production/NewsCollector.vue'

const router = useRouter()

// State
const showChannelProfile = ref(false)
const showNewsCollector = ref(false)
const workflowStatus = ref('idle')
const pollInterval = ref(null)
const systemStatus = ref({
  tablesCreated: false,
  channelProfileInitialized: false,
  checking: true,
  error: null
})

const workflowSteps = ref([
  {
    id: 'collect',
    name: '뉴스 수집',
    description: '네이버 뉴스에서 아이템 선정',
    icon: Newspaper,
    status: 'completed'
  },
  {
    id: 'research',
    name: '자료 조사',
    description: '심층 연구 수행',
    icon: Search,
    status: 'in_progress'
  },
  {
    id: 'write',
    name: '원고 작성',
    description: '세상의모든지식 스타일 원고',
    icon: PenTool,
    status: 'pending'
  },
  {
    id: 'storyboard',
    name: '스토리보드',
    description: '시각 자료 생성',
    icon: Image,
    status: 'pending'
  },
  {
    id: 'produce',
    name: '영상 제작',
    description: '최종 콘텐츠 생성',
    icon: Video,
    status: 'pending'
  }
])

const agents = ref([
  {
    id: 'researcher',
    name: '연구원',
    role: 'Researcher',
    icon: Search,
    isActive: true,
    currentTask: {
      title: 'AI 기술 동향 조사',
      progress: 65
    }
  },
  {
    id: 'writer',
    name: '작가',
    role: 'Script Writer',
    icon: PenTool,
    isActive: false,
    lastTask: new Date(Date.now() - 3600000)
  },
  {
    id: 'visual_director',
    name: '비주얼 디렉터',
    role: 'Visual Director',
    icon: Image,
    isActive: false
  },
  {
    id: 'animator',
    name: '애니메이터',
    role: 'Animator',
    icon: Video,
    isActive: false
  }
])

const pipelineStages = ref([
  {
    id: 'selected',
    name: '선정된 아이템',
    items: []
  },
  {
    id: 'researching',
    name: '연구 중',
    items: []
  },
  {
    id: 'writing',
    name: '원고 작성 중',
    items: []
  },
  {
    id: 'production',
    name: '제작 중',
    items: []
  }
])

const recentContent = ref([])

// Methods
const openNewsCollector = () => {
  showNewsCollector.value = true
}

const startFullPipeline = async () => {
  workflowStatus.value = 'running'
  
  try {
    // 전체 파이프라인 실행 로직
    // 1. 뉴스 수집
    // 2. 연구
    // 3. 원고 작성
    // 4. 스토리보드
    // 5. 영상 제작
    console.log('전체 파이프라인 시작')
    
    // 뉴스 수집부터 시작
    const response = await fetch('/.netlify/functions/collectNews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'auto',
        count: 5,
        useAI: true
      })
    })
    
    const result = await response.json()
    if (result.success) {
      console.log('파이프라인 시작됨')
    }
  } catch (error) {
    console.error('파이프라인 시작 실패:', error)
    workflowStatus.value = 'error'
  }
}

const loadPipelineData = async () => {
  try {
    // 콘텐츠 아이템 로드
    const { data: items } = await supabase
      .from('content_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (items) {
      // 스테이지별로 분류
      pipelineStages.value[0].items = items.filter(i => i.status === 'selected').slice(0, 5)
      pipelineStages.value[1].items = items.filter(i => i.workflow_stage === 'research').slice(0, 3)
      pipelineStages.value[2].items = items.filter(i => i.workflow_stage === 'writing').slice(0, 3)
      pipelineStages.value[3].items = items.filter(i => i.workflow_stage === 'production').slice(0, 3)
    }
    
    // 에이전트 작업 상태 로드
    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('*')
      .in('status', ['in_progress', 'pending'])
      .order('created_at', { ascending: false })
    
    if (tasks) {
      updateAgentStatus(tasks)
    }
    
    // 최근 생성 콘텐츠 로드
    const { data: projects } = await supabase
      .from('projects')
      .select('*, production_sheets(count)')
      .eq('metadata->>autoGenerated', 'true')
      .order('created_at', { ascending: false })
      .limit(6)
    
    if (projects) {
      recentContent.value = projects.map(p => ({
        id: p.id,
        projectId: p.id,
        title: p.name,
        thumbnail: p.thumbnail_url,
        duration: '10분',
        scenes: p.production_sheets?.[0]?.count || 0
      }))
    }
    
  } catch (error) {
    console.error('데이터 로드 실패:', error)
  }
}

const updateAgentStatus = (tasks) => {
  // 에이전트별 작업 상태 업데이트
  agents.value.forEach(agent => {
    const agentTask = tasks.find(t => t.agent_type === agent.id)
    if (agentTask) {
      agent.isActive = agentTask.status === 'in_progress'
      if (agent.isActive) {
        agent.currentTask = {
          title: agentTask.task_type,
          progress: Math.random() * 100 // 실제로는 작업 진행률 계산
        }
      }
    }
  })
}

const viewItemDetails = (item) => {
  console.log('아이템 상세:', item)
}

const viewProject = (projectId) => {
  router.push(`/project/${projectId}`)
}

const editProject = (projectId) => {
  router.push(`/project/${projectId}/edit`)
}

const openChannelProfile = () => {
  showChannelProfile.value = true
}

const formatTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  return `${days}일 전`
}

// 시스템 초기화 체크
const checkSystemStatus = async () => {
  systemStatus.value.checking = true
  
  try {
    // 테이블 존재 확인
    const tables = ['content_items', 'agent_tasks', 'content_research', 
                   'content_scripts', 'content_storyboards', 'channel_profiles']
    
    let allTablesExist = true
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1)
      
      if (error && error.code === '42P01') { // 테이블이 없는 경우
        allTablesExist = false
        break
      }
    }
    
    systemStatus.value.tablesCreated = allTablesExist
    
    // 채널 프로필 확인
    if (allTablesExist) {
      const { data, error } = await supabase
        .from('channel_profiles')
        .select('id')
        .eq('channel_id', 'world-knowledge')
        .single()
      
      systemStatus.value.channelProfileInitialized = !!data
    }
    
  } catch (error) {
    console.error('시스템 상태 체크 실패:', error)
    systemStatus.value.error = error.message
  } finally {
    systemStatus.value.checking = false
  }
}

// 채널 프로필 초기화
const initializeChannelProfile = async () => {
  try {
    const response = await fetch('/.netlify/functions/initializeChannelProfile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const result = await response.json()
    if (result.success) {
      systemStatus.value.channelProfileInitialized = true
      console.log('채널 프로필 초기화 완료')
    }
  } catch (error) {
    console.error('채널 프로필 초기화 실패:', error)
  }
}

// Lifecycle
onMounted(async () => {
  // 시스템 상태 체크
  await checkSystemStatus()
  
  // 채널 프로필이 없으면 초기화
  if (systemStatus.value.tablesCreated && !systemStatus.value.channelProfileInitialized) {
    await initializeChannelProfile()
  }
  
  loadPipelineData()
  
  // 5초마다 상태 업데이트
  pollInterval.value = setInterval(loadPipelineData, 5000)
})

onUnmounted(() => {
  if (pollInterval.value) {
    clearInterval(pollInterval.value)
  }
})
</script>

<style scoped>
.ai-content-dashboard {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.system-alert {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.system-alert.warning {
  background: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
}

.system-alert.info {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

.system-alert strong {
  display: block;
  margin-bottom: 4px;
}

.system-alert p {
  margin: 0 0 4px 0;
  font-size: 14px;
}

.system-alert small {
  font-size: 12px;
  opacity: 0.8;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-primary {
  background: var(--primary-color);
  border: none;
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.workflow-status {
  margin-bottom: 32px;
}

.status-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.status-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.idle {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.status-badge.running {
  background: #10b981;
  color: white;
}

.workflow-steps {
  display: flex;
  justify-content: space-between;
  position: relative;
}

.workflow-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.step-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  transition: all 0.3s;
}

.workflow-step.completed .step-icon {
  background: #10b981;
  color: white;
}

.workflow-step.active .step-icon {
  background: var(--primary-color);
  color: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.step-content {
  text-align: center;
}

.step-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.step-status {
  font-size: 12px;
  color: var(--text-secondary);
}

.step-connector {
  position: absolute;
  top: 24px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--border-color);
  z-index: -1;
}

.agents-monitor {
  margin-bottom: 32px;
}

.agents-monitor h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.agent-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.agent-card.active {
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.2);
}

.agent-header {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.agent-avatar {
  width: 48px;
  height: 48px;
  background: var(--bg-secondary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.agent-card.active .agent-avatar {
  background: var(--primary-color);
  color: white;
}

.agent-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.agent-role {
  font-size: 12px;
  color: var(--text-secondary);
}

.agent-status {
  margin-bottom: 12px;
  font-size: 12px;
}

.status-active {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-color);
}

.pulse {
  width: 8px;
  height: 8px;
  background: var(--primary-color);
  border-radius: 50%;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-idle,
.status-waiting {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}

.agent-task {
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.task-title {
  font-size: 12px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.progress-bar {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  transition: width 0.3s ease;
}

.content-pipeline {
  margin-bottom: 32px;
}

.content-pipeline h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.pipeline-stages {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stage {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
}

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stage-header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.stage-count {
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.stage-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pipeline-item {
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.pipeline-item:hover {
  background: var(--bg-hover);
}

.item-title {
  font-size: 12px;
  color: var(--text-primary);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.item-score {
  font-weight: 500;
}

.recent-content {
  margin-bottom: 32px;
}

.recent-content h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: var(--text-primary);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.content-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.content-thumbnail {
  width: 100%;
  height: 160px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-thumbnail {
  color: var(--text-tertiary);
}

.content-info {
  padding: 16px;
}

.content-info h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.content-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.content-actions {
  display: flex;
  gap: 8px;
}

.btn-view,
.btn-edit {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: white;
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;
}

.btn-view:hover,
.btn-edit:hover {
  background: var(--bg-hover);
}

/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.news-collector-modal {
  width: 90vw;
  max-width: 1400px;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}
</style>