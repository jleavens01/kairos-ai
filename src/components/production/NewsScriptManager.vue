<template>
  <div class="news-script-manager">
    <!-- 헤더 -->
    <div class="manager-header">
      <div class="header-left">
        <FileText :size="24" />
        <h2>뉴스 & 스크립트 관리</h2>
        <Badge variant="primary">스크립트</Badge>
      </div>
      <div class="header-actions">
        <button @click="showScriptModal = true" class="btn-primary">
          <Plus :size="16" />
          새 스크립트 작성
        </button>
      </div>
    </div>

    <!-- 탭 네비게이션 -->
    <div class="sub-tabs">
      <button 
        @click="activeSubTab = 'news'"
        :class="['sub-tab-btn', { active: activeSubTab === 'news' }]"
      >
        <Newspaper :size="18" />
        뉴스 수집
      </button>
      <button 
        @click="activeSubTab = 'scripts'"
        :class="['sub-tab-btn', { active: activeSubTab === 'scripts' }]"
      >
        <ScrollText :size="18" />
        스크립트 관리
      </button>
    </div>

    <!-- 서브 탭 컨텐츠 -->
    <div class="sub-tab-content">
      <!-- 뉴스 수집 탭 -->
      <div v-if="activeSubTab === 'news'" class="news-section">
        <div class="news-description">
          <p>키워드로 뉴스를 검색하고 수집하여 스크립트 작성에 활용하세요.</p>
        </div>
        <NewsSearchCollector />
      </div>

      <!-- 스크립트 관리 탭 -->
      <div v-else-if="activeSubTab === 'scripts'" class="scripts-section">
        <div class="scripts-description">
          <p>스크립트를 작성하고 씬별로 나누어 관리할 수 있습니다.</p>
        </div>
        
        <!-- 스크립트 목록 -->
        <div class="scripts-grid">
          <div v-for="script in scripts" :key="script.id" class="script-card">
            <div class="script-header">
              <h3>{{ script.title || '제목 없음' }}</h3>
              <div class="script-actions">
                <button @click="editScript(script)" class="btn-icon" title="편집">
                  <Edit3 :size="16" />
                </button>
                <button @click="deleteScript(script.id)" class="btn-icon" title="삭제">
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
            <div class="script-preview">
              {{ script.content.slice(0, 150) }}{{ script.content.length > 150 ? '...' : '' }}
            </div>
            <div class="script-meta">
              <span class="scene-count">{{ script.scenes?.length || 0 }}개 씬</span>
              <span class="created-date">{{ formatDate(script.created_at) }}</span>
            </div>
          </div>

          <!-- 빈 상태 -->
          <div v-if="scripts.length === 0" class="empty-scripts">
            <ScrollText :size="48" class="empty-icon" />
            <p>작성된 스크립트가 없습니다.</p>
            <button @click="showScriptModal = true" class="btn-primary">
              첫 번째 스크립트 작성하기
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 스크립트 입력 모달 -->
    <ScriptInputModal 
      v-if="showScriptModal"
      :show="showScriptModal"
      :initial-script="editingScript"
      @close="handleCloseScriptModal"
      @success="handleScriptSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { 
  FileText, Plus, Newspaper, ScrollText, 
  Edit3, Trash2 
} from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import NewsSearchCollector from '@/components/production/NewsSearchCollector.vue'
import ScriptInputModal from '@/components/production/ScriptInputModal.vue'

const activeSubTab = ref('news')
const showScriptModal = ref(false)
const editingScript = ref(null)
const scripts = ref([])

// 스크립트 목록 로드
const loadScripts = async () => {
  try {
    // 실제 구현에서는 Supabase에서 스크립트를 로드
    // 현재는 임시 데이터
    scripts.value = []
  } catch (error) {
    console.error('스크립트 로드 실패:', error)
  }
}

// 스크립트 편집
const editScript = (script) => {
  editingScript.value = script
  showScriptModal.value = true
}

// 스크립트 삭제
const deleteScript = async (scriptId) => {
  if (!confirm('정말로 이 스크립트를 삭제하시겠습니까?')) return
  
  try {
    // 실제 구현에서는 Supabase에서 삭제
    scripts.value = scripts.value.filter(s => s.id !== scriptId)
  } catch (error) {
    console.error('스크립트 삭제 실패:', error)
  }
}

// 스크립트 모달 닫기
const handleCloseScriptModal = () => {
  showScriptModal.value = false
  editingScript.value = null
}

// 스크립트 저장 성공
const handleScriptSuccess = (scriptData) => {
  // 스크립트 목록 새로고침
  loadScripts()
  handleCloseScriptModal()
}

// 날짜 포맷
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  loadScripts()
})
</script>

<style scoped>
.news-script-manager {
  padding: 0;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 서브 탭 */
.sub-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  background: var(--bg-tertiary);
  padding: 4px;
  border-radius: 8px;
}

.sub-tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-secondary);
  font-weight: 500;
}

.sub-tab-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.sub-tab-btn.active {
  background: var(--bg-primary);
  color: var(--primary-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.sub-tab-content {
  min-height: 400px;
}

/* 섹션 */
.news-section,
.scripts-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 24px;
}

.news-description,
.scripts-description {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
}

.news-description p,
.scripts-description p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 스크립트 그리드 */
.scripts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.script-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.script-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.script-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
}

.script-actions {
  display: flex;
  gap: 4px;
}

.script-preview {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 12px;
}

.script-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.scene-count {
  background: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 12px;
}

/* 빈 상태 */
.empty-scripts {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px 24px;
  color: var(--text-secondary);
}

.empty-icon {
  opacity: 0.3;
  margin-bottom: 16px;
}

.empty-scripts p {
  margin: 0 0 24px;
  font-size: 1.1rem;
}

/* 버튼 */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-icon {
  padding: 6px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-quaternary);
  color: var(--text-primary);
}

/* 반응형 */
@media (max-width: 768px) {
  .manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .scripts-grid {
    grid-template-columns: 1fr;
  }

  .sub-tabs {
    overflow-x: auto;
    padding: 4px 8px;
  }
}
</style>