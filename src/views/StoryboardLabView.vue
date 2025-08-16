<!-- 실험적 스토리보드 연출 분석 시스템 - 기존 코드와 완전 분리 -->
<template>
  <div class="storyboard-lab">
    <div class="lab-header">
      <h1>🧪 스토리보드 연출 실험실</h1>
      <p>AI 모델별 연출 분석 비교 테스트 (독립 실행)</p>
    </div>

    <!-- 스크립트 입력 영역 -->
    <div class="script-input-section">
      <h2>테스트 스크립트 입력</h2>
      <textarea 
        v-model="testScript"
        placeholder="테스트할 스크립트를 입력하세요. 여러 씬을 구분해서 입력하면 더 정확한 분석이 가능합니다."
        rows="10"
      ></textarea>
      <button @click="parseScript" class="btn-parse">
        스크립트 파싱 및 씬 분리
      </button>
    </div>

    <!-- 씬 목록 및 타임라인 -->
    <div v-if="parsedScenes.length > 0" class="scenes-timeline">
      <h2>분석된 씬 타임라인</h2>
      <div class="timeline">
        <div 
          v-for="(scene, idx) in parsedScenes" 
          :key="idx"
          :class="['scene-node', {
            'selected': selectedSceneIndex === idx,
            'analyzed': scene.analyzed
          }]"
          @click="selectScene(idx)"
        >
          <div class="scene-number">씬 {{ idx + 1 }}</div>
          <div class="scene-preview">{{ scene.text.substring(0, 30) }}...</div>
        </div>
      </div>
    </div>

    <!-- AI 모델 선택 및 설정 -->
    <div v-if="selectedSceneIndex !== null" class="model-selection">
      <h2>AI 모델 선택 (다중 선택 가능)</h2>
      <div class="model-grid">
        <!-- 최고 성능 모델들 -->
        <div class="model-category">
          <h3>🏆 최고 성능</h3>
          <div class="model-card" v-for="model in topModels" :key="model.id">
            <input 
              type="checkbox" 
              :id="model.id"
              v-model="selectedModels"
              :value="model.id"
            />
            <label :for="model.id">
              <div class="model-name">{{ model.name }}</div>
              <div class="model-info">
                <span class="price">₩{{ model.pricePerAnalysis }}/분석</span>
                <span class="speed">{{ model.speed }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- 중간급 모델들 -->
        <div class="model-category">
          <h3>⚡ 균형형</h3>
          <div class="model-card" v-for="model in midModels" :key="model.id">
            <input 
              type="checkbox" 
              :id="model.id"
              v-model="selectedModels"
              :value="model.id"
            />
            <label :for="model.id">
              <div class="model-name">{{ model.name }}</div>
              <div class="model-info">
                <span class="price">₩{{ model.pricePerAnalysis }}/분석</span>
                <span class="speed">{{ model.speed }}</span>
              </div>
            </label>
          </div>
        </div>

        <!-- 가성비 모델들 -->
        <div class="model-category">
          <h3>💰 가성비</h3>
          <div class="model-card" v-for="model in budgetModels" :key="model.id">
            <input 
              type="checkbox" 
              :id="model.id"
              v-model="selectedModels"
              :value="model.id"
            />
            <label :for="model.id">
              <div class="model-name">{{ model.name }}</div>
              <div class="model-info">
                <span class="price">₩{{ model.pricePerAnalysis }}/분석</span>
                <span class="speed">{{ model.speed }}</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 분석 옵션 -->
    <div v-if="selectedModels.length > 0" class="analysis-options">
      <h2>분석 옵션</h2>
      <div class="options-grid">
        <label>
          <input type="checkbox" v-model="analysisOptions.includeContext" />
          컨텍스트 분석 포함 (앞뒤 씬 연결)
        </label>
        <label>
          <input type="checkbox" v-model="analysisOptions.globalTheme" />
          전체 테마 분석
        </label>
        <label>
          <input type="checkbox" v-model="analysisOptions.emotionalArc" />
          감정선 분석
        </label>
        <label>
          <input type="checkbox" v-model="analysisOptions.visualContinuity" />
          시각적 연속성 체크
        </label>
      </div>
      
      <button @click="startAnalysis" class="btn-analyze" :disabled="analyzing">
        {{ analyzing ? '분석 중...' : '선택한 모델로 분석 시작' }}
      </button>
    </div>

    <!-- 분석 결과 비교 -->
    <div v-if="analysisResults.length > 0" class="results-comparison">
      <h2>모델별 분석 결과 비교</h2>
      
      <!-- 탭 네비게이션 -->
      <div class="result-tabs">
        <button 
          v-for="result in analysisResults"
          :key="result.modelId"
          @click="selectedResultTab = result.modelId"
          :class="['tab', { active: selectedResultTab === result.modelId }]"
        >
          {{ result.modelName }}
          <span class="time">{{ result.responseTime }}ms</span>
        </button>
      </div>

      <!-- 선택된 결과 상세 -->
      <div class="result-detail" v-if="currentResult">
        <div class="result-section">
          <h3>📝 씬 분석</h3>
          <div class="scene-analysis">
            <p><strong>씬 요약:</strong> {{ currentResult.sceneSummary }}</p>
            <p><strong>분위기:</strong> {{ currentResult.mood }}</p>
            <p><strong>주요 요소:</strong> {{ currentResult.keyElements?.join(', ') }}</p>
          </div>
        </div>

        <div class="result-section" v-if="analysisOptions.includeContext">
          <h3>🔗 컨텍스트 연결</h3>
          <div class="context-analysis">
            <p><strong>이전 씬과의 연결:</strong> {{ currentResult.previousConnection }}</p>
            <p><strong>다음 씬 준비:</strong> {{ currentResult.nextSetup }}</p>
          </div>
        </div>

        <div class="result-section">
          <h3>🎨 시각적 연출 제안</h3>
          <div class="visual-direction">
            <p><strong>카메라 앵글:</strong> {{ currentResult.cameraAngle }}</p>
            <p><strong>색상 팔레트:</strong> {{ currentResult.colorPalette }}</p>
            <p><strong>조명:</strong> {{ currentResult.lighting }}</p>
          </div>
        </div>

        <div class="result-section">
          <h3>🎬 제작 가이드</h3>
          <div class="production-guide">
            <div class="prompt-suggestion">
              <h4>AI 생성 프롬프트:</h4>
              <code>{{ currentResult.generationPrompt }}</code>
            </div>
            <div class="search-suggestion">
              <h4>자료 검색 키워드:</h4>
              <div class="keywords">
                <span v-for="keyword in currentResult.searchKeywords" :key="keyword" class="keyword-chip">
                  {{ keyword }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 원본 응답 (디버깅용) -->
        <details class="raw-response">
          <summary>원본 응답 보기</summary>
          <pre>{{ JSON.stringify(currentResult.raw, null, 2) }}</pre>
        </details>
      </div>
    </div>

    <!-- 비용 및 성능 통계 -->
    <div v-if="analysisResults.length > 0" class="statistics">
      <h2>📊 분석 통계</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">총 비용</div>
          <div class="stat-value">₩{{ totalCost }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">평균 응답 시간</div>
          <div class="stat-value">{{ avgResponseTime }}ms</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">총 토큰 사용</div>
          <div class="stat-value">{{ totalTokens }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 상태 관리
const testScript = ref(`씬 1. 도시의 아침
이른 아침, 도시의 스카이라인이 보인다. 해가 떠오르며 건물들 사이로 빛이 스며든다.

씬 2. 카페 내부
주인공이 커피를 마시며 창밖을 바라본다. 표정에는 무언가를 기다리는 듯한 긴장감이 있다.

씬 3. 거리
주인공이 카페를 나와 붐비는 거리를 걷는다. 사람들 사이를 헤치며 빠르게 이동한다.`)
const parsedScenes = ref([])
const selectedSceneIndex = ref(null)
const selectedModels = ref([])
const analyzing = ref(false)
const analysisResults = ref([])
const selectedResultTab = ref('')

// 분석 옵션
const analysisOptions = ref({
  includeContext: true,
  globalTheme: false,
  emotionalArc: true,
  visualContinuity: true
})

// AI 모델 정의 (2025년 최신)
const topModels = ref([
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    pricePerAnalysis: 15,
    speed: '느림',
    endpoint: 'gpt-5',
    features: ['최고 성능', '복잡한 추론', '창의적 연출']
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    pricePerAnalysis: 12,
    speed: '보통',
    endpoint: 'gemini-2.5-pro',
    features: ['사고 모델', '긴 컨텍스트', 'STEM 강점']
  }
])

const midModels = ref([
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    pricePerAnalysis: 5,
    speed: '빠름',
    endpoint: 'gpt-4o',
    features: ['멀티모달', '빠른 응답', '실용적']
  }
])

const budgetModels = ref([
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    pricePerAnalysis: 2,
    speed: '매우 빠름',
    endpoint: 'gemini-2.5-flash',
    features: ['가성비', '빠른 속도', '기본 분석']
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    pricePerAnalysis: 1,
    speed: '매우 빠름',
    endpoint: 'gpt-4o-mini',
    features: ['초경량', '빠른 응답', '기본 기능']
  }
])

// 스크립트 파싱
const parseScript = () => {
  if (!testScript.value.trim()) return
  
  // 간단한 씬 분리 (씬 번호, 빈 줄, INT./EXT. 등으로 구분)
  const scenes = testScript.value.split(/\n\s*\n|\n(?=씬\s*\d+|INT\.|EXT\.)/)
    .filter(text => text.trim())
    .map((text, index) => ({
      index,
      text: text.trim(),
      analyzed: false,
      results: {}
    }))
  
  parsedScenes.value = scenes
  selectedSceneIndex.value = 0
}

// 씬 선택
const selectScene = (index) => {
  selectedSceneIndex.value = index
  analysisResults.value = []
}

// 분석 시작
const startAnalysis = async () => {
  if (!selectedModels.value.length || selectedSceneIndex.value === null) return
  
  analyzing.value = true
  analysisResults.value = []
  
  const scene = parsedScenes.value[selectedSceneIndex.value]
  const context = gatherContext(selectedSceneIndex.value)
  
  // 선택된 각 모델로 분석 요청
  const promises = selectedModels.value.map(modelId => 
    analyzeWithModel(modelId, scene, context)
  )
  
  try {
    const results = await Promise.allSettled(promises)
    analysisResults.value = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
    
    if (analysisResults.value.length > 0) {
      selectedResultTab.value = analysisResults.value[0].modelId
    }
  } catch (error) {
    console.error('Analysis error:', error)
  } finally {
    analyzing.value = false
    parsedScenes.value[selectedSceneIndex.value].analyzed = true
  }
}

// 컨텍스트 수집
const gatherContext = (sceneIndex) => {
  const context = {
    currentScene: parsedScenes.value[sceneIndex],
    sceneNumber: sceneIndex + 1,
    totalScenes: parsedScenes.value.length
  }
  
  if (analysisOptions.value.includeContext) {
    context.previousScene = sceneIndex > 0 ? parsedScenes.value[sceneIndex - 1] : null
    context.nextScene = sceneIndex < parsedScenes.value.length - 1 ? parsedScenes.value[sceneIndex + 1] : null
  }
  
  if (analysisOptions.value.globalTheme) {
    context.allScenes = parsedScenes.value.map(s => s.text.substring(0, 100))
  }
  
  return context
}

// 모델별 분석 함수
const analyzeWithModel = async (modelId, scene, context) => {
  const allModels = [...topModels.value, ...midModels.value, ...budgetModels.value]
  const model = allModels.find(m => m.id === modelId)
  
  if (!model) throw new Error(`Model ${modelId} not found`)
  
  const startTime = Date.now()
  
  try {
    // 실제 API 호출
    const response = await fetch('/.netlify/functions/analyzeSceneMultiModel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        modelId: model.id,
        scene,
        context,
        options: analysisOptions.value
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API request failed')
    }
    
    const data = await response.json()
    
    return {
      modelId: model.id,
      modelName: model.name,
      responseTime: data.responseTime || (Date.now() - startTime),
      ...data.result
    }
  } catch (error) {
    console.error(`Error with model ${model.name}:`, error)
    
    // 에러 시 시뮬레이션 폴백
    if (process.env.NODE_ENV === 'development') {
      console.log('Falling back to simulation for', model.name)
      const result = await simulateAnalysis(model, scene, context)
      return {
        modelId: model.id,
        modelName: model.name,
        responseTime: Date.now() - startTime,
        ...result
      }
    }
    
    throw error
  }
}

// 분석 시뮬레이션 (실제 구현 시 API 호출로 교체)
const simulateAnalysis = async (model, scene, context) => {
  // 모델별 응답 시간 시뮬레이션
  const delays = {
    'gpt-5': 3000,
    'gemini-2.5-pro': 2500,
    'claude-3.5-sonnet': 1500,
    'gpt-4o': 1000,
    'gemini-2.5-flash': 500,
    'gpt-4o-mini': 300
  }
  
  await new Promise(resolve => setTimeout(resolve, delays[model.id] || 1000))
  
  // 시뮬레이션된 분석 결과
  return {
    sceneSummary: `[${model.name}] 씬 요약: ${scene.text.substring(0, 50)}...`,
    mood: ['긴장감', '희망적', '우울함', '활기찬'][Math.floor(Math.random() * 4)],
    keyElements: ['주인공', '갈등', '전환점'],
    previousConnection: context.previousScene ? '이전 씬의 감정선 이어받음' : '시작 씬',
    nextSetup: context.nextScene ? '다음 씬을 위한 긴장감 조성' : '마무리',
    cameraAngle: ['클로즈업', '미디엄샷', '와이드샷'][Math.floor(Math.random() * 3)],
    colorPalette: '#1a1a1a, #ff6b6b, #4ecdc4',
    lighting: ['자연광', '키 라이트', '로우키'][Math.floor(Math.random() * 3)],
    generationPrompt: `cinematic shot, ${model.name} style, dramatic lighting...`,
    searchKeywords: ['reference1', 'reference2', 'reference3'],
    raw: { model: model.id, timestamp: new Date().toISOString() }
  }
}

// 계산된 속성
const currentResult = computed(() => {
  return analysisResults.value.find(r => r.modelId === selectedResultTab.value)
})

const totalCost = computed(() => {
  const allModels = [...topModels.value, ...midModels.value, ...budgetModels.value]
  return selectedModels.value.reduce((sum, modelId) => {
    const model = allModels.find(m => m.id === modelId)
    return sum + (model?.pricePerAnalysis || 0)
  }, 0)
})

const avgResponseTime = computed(() => {
  if (analysisResults.value.length === 0) return 0
  const total = analysisResults.value.reduce((sum, r) => sum + r.responseTime, 0)
  return Math.round(total / analysisResults.value.length)
})

const totalTokens = computed(() => {
  // 토큰 계산 로직 (추정치)
  return analysisResults.value.length * 1500
})
</script>

<style scoped>
.storyboard-lab {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.lab-header {
  text-align: center;
  margin-bottom: 3rem;
}

.lab-header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.lab-header p {
  color: var(--text-secondary);
}

/* 스크립트 입력 */
.script-input-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.script-input-section textarea {
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  resize: vertical;
}

.btn-parse {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

/* 타임라인 */
.scenes-timeline {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.timeline {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 1rem 0;
}

.scene-node {
  flex-shrink: 0;
  width: 120px;
  padding: 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.scene-node:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.scene-node.selected {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.scene-node.analyzed {
  border-color: #10b981;
}

.scene-number {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.scene-preview {
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 모델 선택 */
.model-selection {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 1rem;
}

.model-category h3 {
  margin-bottom: 1rem;
  color: var(--text-secondary);
}

.model-card {
  padding: 1rem;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.model-card input[type="checkbox"] {
  margin-right: 0.75rem;
}

.model-card label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.model-name {
  font-weight: 600;
  flex: 1;
}

.model-info {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 분석 옵션 */
.analysis-options {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 1rem 0 1.5rem;
}

.options-grid label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.btn-analyze {
  padding: 1rem 2rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  width: 100%;
}

.btn-analyze:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 결과 비교 */
.results-comparison {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
}

.result-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--border-color);
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tab {
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--bg-secondary);
}

.tab.active {
  border-bottom-color: var(--primary-color);
  color: var(--primary-color);
}

.tab .time {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-left: 0.5rem;
}

/* 결과 상세 */
.result-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.result-section h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.prompt-suggestion code {
  display: block;
  padding: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.keyword-chip {
  padding: 0.25rem 0.75rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 20px;
  font-size: 0.85rem;
}

/* 통계 */
.statistics {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-card {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

/* 원본 응답 */
.raw-response {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.raw-response summary {
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
}

.raw-response pre {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.8rem;
  overflow-x: auto;
}
</style>