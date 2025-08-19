<template>
  <div class="semoji-data-manager">
    <div class="manager-header">
      <div class="header-left">
        <BookOpen :size="24" />
        <h2>세모지 원고 학습 데이터 관리</h2>
        <Badge variant="secondary">{{ totalScripts }}개 원고</Badge>
      </div>
      <div class="header-actions">
        <button @click="showUploadModal = true" class="btn-primary">
          <Upload :size="16" />
          원고 업로드
        </button>
        <button @click="prepareFinetuning" class="btn-secondary">
          <Cpu :size="16" />
          파인튜닝 데이터 생성
        </button>
      </div>
    </div>

    <!-- 업로드 모달 -->
    <div v-if="showUploadModal" class="modal-overlay" @click="closeUploadModal">
      <div class="modal-content upload-modal" @click.stop>
        <button class="modal-close" @click="closeUploadModal">×</button>
        <h3>세모지 원고 업로드</h3>
        
        <div class="upload-form">
          <div class="form-group">
            <label>제목 *</label>
            <input 
              v-model="uploadData.title" 
              type="text" 
              placeholder="예: 스타벅스는 어떻게 세계 최고의 카페가 되었을까?"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>주제</label>
            <input 
              v-model="uploadData.topic" 
              type="text" 
              placeholder="예: 스타벅스의 제3의 공간 철학"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>YouTube 비디오 ID (선택)</label>
            <input 
              v-model="uploadData.videoId" 
              type="text" 
              placeholder="예: dQw4w9WgXcQ"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>도입부 (첫 1-2분)</label>
            <textarea 
              v-model="uploadData.intro" 
              rows="4"
              placeholder="도입부 원고를 입력하세요..."
              class="form-textarea"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>전체 원고 *</label>
            <textarea 
              v-model="uploadData.fullScript" 
              rows="15"
              placeholder="전체 원고를 입력하거나 붙여넣으세요..."
              class="form-textarea"
            ></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>도입부 유형</label>
              <select v-model="uploadData.introType" class="form-select">
                <option value="">선택하세요</option>
                <option value="질문">질문으로 시작</option>
                <option value="충격적 사실">충격적 사실 제시</option>
                <option value="시간 대비">시간적 대비 (과거 vs 현재)</option>
                <option value="일상 연결">일상적 경험 연결</option>
                <option value="통계">통계/수치로 시작</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>예상 시간(분)</label>
              <input 
                v-model.number="uploadData.duration" 
                type="number" 
                min="5" 
                max="30"
                placeholder="15"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>키워드 (쉼표로 구분)</label>
            <input 
              v-model="uploadData.keywords" 
              type="text" 
              placeholder="예: 스타벅스, 하워드 슐츠, 제3의 공간, 커피문화"
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>스타일 특징</label>
            <textarea 
              v-model="uploadData.styleNotes" 
              rows="3"
              placeholder="예: 질문 시작, 반전 활용, 역사적 맥락 설명, 감정적 공감 포인트"
              class="form-textarea"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button @click="closeUploadModal" class="btn-cancel">취소</button>
            <button @click="uploadScript" :disabled="!isValidUpload" class="btn-primary">
              <Check :size="16" />
              업로드
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 대량 업로드 섹션 -->
    <div class="bulk-upload-section">
      <h3>대량 업로드</h3>
      <p>여러 원고를 한 번에 업로드하려면 텍스트 파일을 드래그하거나 선택하세요</p>
      
      <div 
        class="upload-dropzone"
        :class="{ 'dragging': isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <Upload :size="48" />
        <p>텍스트 파일을 드래그하여 놓으세요</p>
        <p class="upload-hint">또는</p>
        <input 
          type="file" 
          ref="fileInput"
          @change="handleFileSelect"
          accept=".txt,.md,.docx"
          multiple
          style="display: none"
        />
        <button @click="$refs.fileInput.click()" class="btn-outline">
          파일 선택
        </button>
      </div>
      
      <div v-if="uploadedFiles.length > 0" class="uploaded-files">
        <h4>업로드된 파일들</h4>
        <div v-for="file in uploadedFiles" :key="file.name" class="file-item">
          <FileText :size="16" />
          <span>{{ file.name }}</span>
          <span class="file-size">{{ formatFileSize(file.size) }}</span>
          <button @click="removeFile(file)" class="btn-remove">
            <X :size="16" />
          </button>
        </div>
        <button @click="processBulkUpload" class="btn-primary mt-3">
          {{ uploadedFiles.length }}개 파일 처리
        </button>
      </div>
    </div>

    <!-- 원고 목록 -->
    <div class="scripts-list">
      <h3>저장된 원고들</h3>
      
      <div class="filter-bar">
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="원고 검색..."
          class="search-input"
        />
        <select v-model="filterQuality" class="filter-select">
          <option value="">모든 품질</option>
          <option value="high">높은 품질 (80+)</option>
          <option value="medium">중간 품질 (50-79)</option>
          <option value="low">낮은 품질 (50 미만)</option>
        </select>
        <select v-model="filterUsed" class="filter-select">
          <option value="">전체</option>
          <option value="true">학습 사용됨</option>
          <option value="false">미사용</option>
        </select>
      </div>
      
      <div class="scripts-grid">
        <div 
          v-for="script in filteredScripts" 
          :key="script.id"
          class="script-card"
          @click="viewScript(script)"
        >
          <div class="script-header">
            <h4>{{ script.title }}</h4>
            <div class="script-badges">
              <Badge v-if="script.is_verified" variant="success">
                <Check :size="12" /> 검증됨
              </Badge>
              <Badge v-if="script.used_for_training" variant="secondary">
                학습 사용
              </Badge>
              <span class="quality-score" :class="getQualityClass(script.quality_score)">
                {{ script.quality_score || 0 }}점
              </span>
            </div>
          </div>
          
          <p class="script-intro">{{ script.intro }}</p>
          
          <div class="script-meta">
            <span v-if="script.video_id" class="meta-item">
              <Youtube :size="14" /> YouTube
            </span>
            <span class="meta-item">
              <Clock :size="14" /> {{ script.duration_minutes || 15 }}분
            </span>
            <span class="meta-item">
              {{ script.intro_type || '일반' }}
            </span>
          </div>
          
          <div class="script-keywords">
            <span v-for="keyword in (script.keywords || []).slice(0, 3)" :key="keyword" class="keyword">
              {{ keyword }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductionStore } from '@/stores/production'
import { 
  BookOpen, Upload, Cpu, FileText, X, Check, Clock, 
  Youtube, Plus
} from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { supabase } from '@/utils/supabase'

const productionStore = useProductionStore()

// State
const showUploadModal = ref(false)
const isDragging = ref(false)
const uploadedFiles = ref([])
const scripts = ref([])
const searchQuery = ref('')
const filterQuality = ref('')
const filterUsed = ref('')
const totalScripts = ref(0)

// Upload data
const uploadData = ref({
  title: '',
  topic: '',
  videoId: '',
  intro: '',
  fullScript: '',
  introType: '',
  duration: 15,
  keywords: '',
  styleNotes: ''
})

// Computed
const isValidUpload = computed(() => {
  return uploadData.value.title && uploadData.value.fullScript
})

const filteredScripts = computed(() => {
  let filtered = scripts.value
  
  // 검색어 필터
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(script => 
      script.title.toLowerCase().includes(query) ||
      script.topic?.toLowerCase().includes(query) ||
      script.keywords?.some(k => k.toLowerCase().includes(query))
    )
  }
  
  // 품질 필터
  if (filterQuality.value) {
    if (filterQuality.value === 'high') {
      filtered = filtered.filter(s => s.quality_score >= 80)
    } else if (filterQuality.value === 'medium') {
      filtered = filtered.filter(s => s.quality_score >= 50 && s.quality_score < 80)
    } else if (filterQuality.value === 'low') {
      filtered = filtered.filter(s => s.quality_score < 50)
    }
  }
  
  // 학습 사용 필터
  if (filterUsed.value) {
    const used = filterUsed.value === 'true'
    filtered = filtered.filter(s => s.used_for_training === used)
  }
  
  return filtered
})

// Methods
const closeUploadModal = () => {
  showUploadModal.value = false
  resetUploadData()
}

const resetUploadData = () => {
  uploadData.value = {
    title: '',
    topic: '',
    videoId: '',
    intro: '',
    fullScript: '',
    introType: '',
    duration: 15,
    keywords: '',
    styleNotes: ''
  }
}

const uploadScript = async () => {
  if (!isValidUpload.value) return
  
  try {
    const { data: userData } = await supabase.auth.getUser()
    
    const scriptData = {
      title: uploadData.value.title,
      topic: uploadData.value.topic,
      video_id: uploadData.value.videoId || null,
      intro: uploadData.value.intro || extractIntro(uploadData.value.fullScript),
      full_script: uploadData.value.fullScript,
      intro_type: uploadData.value.introType || null,
      duration_minutes: uploadData.value.duration || 15,
      keywords: uploadData.value.keywords ? 
        uploadData.value.keywords.split(',').map(k => k.trim()) : [],
      style_notes: uploadData.value.styleNotes || null,
      quality_score: 70, // 기본 점수
      is_verified: false,
      source: 'manual',
      created_by: userData?.user?.id
    }
    
    const { data, error } = await supabase
      .from('semoji_training_data')
      .insert([scriptData])
      .select()
      .single()
    
    if (error) throw error
    
    scripts.value.unshift(data)
    totalScripts.value++
    
    alert('원고가 성공적으로 업로드되었습니다!')
    closeUploadModal()
    
  } catch (error) {
    console.error('원고 업로드 실패:', error)
    alert('업로드 중 오류가 발생했습니다')
  }
}

const extractIntro = (fullScript) => {
  // 전체 원고에서 첫 2-3문장 추출
  const sentences = fullScript.split(/[.!?]/).slice(0, 3)
  return sentences.join('. ').trim()
}

const handleDrop = (e) => {
  isDragging.value = false
  const files = Array.from(e.dataTransfer.files)
  addFiles(files)
}

const handleFileSelect = (e) => {
  const files = Array.from(e.target.files)
  addFiles(files)
}

const addFiles = (files) => {
  const textFiles = files.filter(file => 
    file.type.includes('text') || 
    file.name.endsWith('.txt') || 
    file.name.endsWith('.md')
  )
  uploadedFiles.value.push(...textFiles)
}

const removeFile = (file) => {
  const index = uploadedFiles.value.indexOf(file)
  if (index > -1) {
    uploadedFiles.value.splice(index, 1)
  }
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const processBulkUpload = async () => {
  for (const file of uploadedFiles.value) {
    try {
      const text = await readFile(file)
      const parsedScript = parseScriptText(text, file.name)
      
      if (parsedScript) {
        await uploadParsedScript(parsedScript)
      }
    } catch (error) {
      console.error(`파일 처리 실패: ${file.name}`, error)
    }
  }
  
  uploadedFiles.value = []
  alert('대량 업로드가 완료되었습니다!')
  await loadScripts()
}

const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file, 'UTF-8')
  })
}

const parseScriptText = (text, filename) => {
  const lines = text.split('\n')
  let title = ''
  let topic = ''
  let videoId = ''
  let duration = 15
  let intro = ''
  
  // 세모지 원고 형식 파싱
  lines.forEach((line, index) => {
    if (line.startsWith('제목:')) {
      title = line.replace('제목:', '').trim()
    } else if (line.startsWith('주제:')) {
      topic = line.replace('주제:', '').trim()
    } else if (line.startsWith('YouTube ID:')) {
      videoId = line.replace('YouTube ID:', '').trim()
    } else if (line.includes('YouTube:')) {
      const match = line.match(/[?&]v=([^&\s]+)/)
      if (match) videoId = match[1]
    } else if (line.includes('예상 시간')) {
      const timeMatch = line.match(/(\d+)분/)
      if (timeMatch) duration = parseInt(timeMatch[1])
    }
  })
  
  // 제목이 없으면 파일명에서 추출
  if (!title) {
    title = filename.replace(/\.(txt|md)$/, '').replace(/_/g, ' ')
  }
  
  // 도입부 추출 (오프닝 이후 첫 부분)
  const openingIndex = lines.findIndex(line => line.includes('오프닝'))
  if (openingIndex !== -1 && openingIndex < lines.length - 5) {
    intro = lines.slice(openingIndex + 1, openingIndex + 6)
      .filter(line => line.trim())
      .join(' ')
      .replace(/#\d+_/g, '') // #번호_ 제거
  } else {
    // 오프닝이 없으면 첫 몇 줄 추출
    intro = lines.slice(0, 5)
      .filter(line => line.trim() && !line.startsWith('제목:') && !line.startsWith('주제:'))
      .join(' ')
  }
  
  return {
    title,
    topic,
    videoId,
    intro,
    full_script: text,
    keywords: extractKeywords(text),
    introType: detectIntroType(intro),
    duration_minutes: duration
  }
}

const extractKeywords = (text) => {
  // 간단한 키워드 추출 (자주 나오는 명사)
  const words = text.match(/[가-힣]+/g) || []
  const wordCount = {}
  
  words.forEach(word => {
    if (word.length >= 2) {
      wordCount[word] = (wordCount[word] || 0) + 1
    }
  })
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}

const detectIntroType = (intro) => {
  if (intro.includes('?')) return '질문'
  if (intro.match(/\d{4}년/) || intro.includes('년 전')) return '시간 대비'
  if (intro.match(/\d+[%명개]/)) return '통계'
  if (intro.includes('여러분') || intro.includes('우리')) return '일상 연결'
  return '일반'
}

const uploadParsedScript = async (parsedScript) => {
  const { data: userData } = await supabase.auth.getUser()
  
  // 데이터베이스 컬럼명에 맞게 변환
  const scriptData = {
    title: parsedScript.title,
    topic: parsedScript.topic || null,
    video_id: parsedScript.videoId || null,
    intro: parsedScript.intro,
    full_script: parsedScript.full_script,
    keywords: parsedScript.keywords || [],
    intro_type: parsedScript.introType || null,
    style_notes: null,
    duration_minutes: parsedScript.duration_minutes || Math.ceil(parsedScript.full_script.length / 1000),
    quality_score: 60, // 자동 업로드는 낮은 점수
    is_verified: false,
    source: 'bulk',
    created_by: userData?.user?.id
  }
  
  const { error } = await supabase
    .from('semoji_training_data')
    .insert([scriptData])
  
  if (error) throw error
}

const viewScript = (script) => {
  console.log('원고 상세 보기:', script)
  // TODO: 상세 보기 모달 구현
}

const prepareFinetuning = async () => {
  try {
    const response = await fetch('/.netlify/functions/prepareFinetuningData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'openai', // 또는 'gemini', 'llama'
        includeExamples: true
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('파인튜닝 데이터 생성 완료:', result.data)
      alert(`${result.data.examples}개 예시로 파인튜닝 데이터가 생성되었습니다.\n예상 비용: ${result.data.estimatedCost.trainingCost}`)
      
      // 다운로드 링크 제공
      if (result.data.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank')
      }
    }
  } catch (error) {
    console.error('파인튜닝 데이터 생성 실패:', error)
    alert('데이터 생성 중 오류가 발생했습니다')
  }
}

const getQualityClass = (score) => {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

const loadScripts = async () => {
  try {
    const { data, error } = await supabase
      .from('semoji_training_data')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    scripts.value = data || []
    totalScripts.value = scripts.value.length
    
  } catch (error) {
    console.error('원고 목록 로드 실패:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadScripts()
})
</script>

<style scoped>
.semoji-data-manager {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.manager-header {
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

.btn-primary, .btn-secondary, .btn-outline, .btn-cancel {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #5B6CFF;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4C5CE5;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-outline {
  background: white;
  border: 2px solid #dee2e6;
  color: #495057;
}

.btn-outline:hover {
  border-color: #5B6CFF;
  color: #5B6CFF;
}

.btn-cancel {
  background: #f8f9fa;
  color: #6c757d;
}

/* 모달 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: #f8f9fa;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
}

.modal-content h3 {
  margin: 0 0 24px;
  font-size: 20px;
  font-weight: 600;
}

/* 업로드 폼 */
.upload-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.form-input, .form-textarea, .form-select {
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: #5B6CFF;
  box-shadow: 0 0 0 3px rgba(91, 108, 255, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

/* 대량 업로드 */
.bulk-upload-section {
  margin-bottom: 40px;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;
}

.bulk-upload-section h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.bulk-upload-section p {
  margin: 0 0 20px;
  color: #6c757d;
  font-size: 14px;
}

.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  background: white;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.upload-dropzone.dragging {
  border-color: #5B6CFF;
  background: #f0f2ff;
}

.upload-dropzone p {
  margin: 0;
  color: #6c757d;
}

.upload-hint {
  font-size: 12px;
  color: #adb5bd;
}

.uploaded-files {
  margin-top: 20px;
}

.uploaded-files h4 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
}

.file-size {
  margin-left: auto;
  color: #6c757d;
  font-size: 14px;
}

.btn-remove {
  padding: 4px;
  background: transparent;
  border: none;
  color: #dc3545;
  cursor: pointer;
}

/* 원고 목록 */
.scripts-list {
  margin-top: 40px;
}

.scripts-list h3 {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
}

.filter-select {
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.scripts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.script-card {
  padding: 20px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.script-card:hover {
  border-color: #5B6CFF;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.script-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.script-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
  flex: 1;
}

.script-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.quality-score {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.quality-score.high {
  background: #d4edda;
  color: #155724;
}

.quality-score.medium {
  background: #fff3cd;
  color: #856404;
}

.quality-score.low {
  background: #f8d7da;
  color: #721c24;
}

.script-intro {
  margin: 0 0 12px;
  font-size: 14px;
  color: #6c757d;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.script-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #6c757d;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.script-keywords {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.keyword {
  padding: 4px 8px;
  background: #e9ecef;
  border-radius: 4px;
  font-size: 12px;
  color: #495057;
}

.mt-3 {
  margin-top: 16px;
}
</style>