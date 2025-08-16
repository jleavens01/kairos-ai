<template>
  <div class="draw-canvas-container">
    <!-- 툴바 -->
    <div class="draw-toolbar">
      <div class="tool-group">
        <button
          v-for="tool in tools"
          :key="tool.id"
          @click="selectTool(tool.id)"
          :class="['tool-btn', { active: currentTool === tool.id }]"
          :title="tool.label"
        >
          <component :is="tool.icon" :size="18" />
        </button>
      </div>
      
      <div class="tool-group">
        <input
          v-if="currentTool === 'text'"
          v-model="textInput"
          type="text"
          placeholder="텍스트 입력"
          class="text-input"
          @keyup.enter="addText"
        />
        <label v-if="currentTool === 'text'" class="translate-toggle" title="한글 텍스트를 영어로 자동 번역">
          <input
            v-model="autoTranslate"
            type="checkbox"
            class="translate-checkbox"
          />
          <span class="translate-label">자동 번역</span>
        </label>
      </div>
      
      <div class="tool-group">
        <input
          v-model="strokeColor"
          type="color"
          class="color-picker"
          title="색상 선택"
        />
        <select v-model="strokeWidth" class="stroke-select" title="선 굵기">
          <option value="2">얇게</option>
          <option value="4">보통</option>
          <option value="6">굵게</option>
        </select>
      </div>
      
      <div class="tool-group">
        <button @click="undo" class="tool-btn" title="실행 취소" :disabled="!canUndo">
          <Undo :size="18" />
        </button>
        <button @click="redo" class="tool-btn" title="다시 실행" :disabled="!canRedo">
          <Redo :size="18" />
        </button>
        <button @click="clearCanvas" class="tool-btn" title="전체 지우기">
          <Trash2 :size="18" />
        </button>
      </div>
      
      <div class="tool-group">
        <button @click="saveAnnotations" class="save-btn">
          <Save :size="18" />
          저장
        </button>
        <button @click="$emit('close')" class="cancel-btn">
          <X :size="18" />
          취소
        </button>
      </div>
    </div>
    
    <!-- 캔버스 영역 -->
    <div class="canvas-wrapper" ref="canvasWrapper">
      <canvas
        ref="canvas"
        @mousedown="startDrawing"
        @mousemove="draw"
        @mouseup="stopDrawing"
        @mouseleave="stopDrawing"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
    </div>
    
    <!-- 텍스트 입력 오버레이 -->
    <div 
      v-if="showTextOverlay" 
      class="text-overlay"
      :style="{ left: textOverlayPos.x + 'px', top: textOverlayPos.y + 'px' }"
    >
      <input
        v-model="tempTextInput"
        type="text"
        class="text-overlay-input"
        :placeholder="isTranslating ? '번역 중...' : '텍스트 입력 (한글 자동 번역)'"
        @keyup.enter="confirmText"
        @keyup.esc="cancelText"
        ref="textOverlayInput"
        :disabled="isTranslating"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { 
  Square, 
  Type, 
  ArrowUp, 
  Undo, 
  Redo, 
  Trash2, 
  Save, 
  X,
  Move
} from 'lucide-vue-next'

const emit = defineEmits(['save', 'close'])
const props = defineProps({
  imageUrl: {
    type: String,
    required: true
  }
})

// 반응형 데이터
const canvas = ref(null)
const canvasWrapper = ref(null)
const canvasWidth = ref(800)
const canvasHeight = ref(600)
const ctx = ref(null)
const isDrawing = ref(false)
const currentTool = ref('box')
const strokeColor = ref('#FF0000')
const strokeWidth = ref(4)
const textInput = ref('')
const tempTextInput = ref('')
const showTextOverlay = ref(false)
const textOverlayPos = ref({ x: 0, y: 0 })
const textOverlayInput = ref(null)
const autoTranslate = ref(true) // 자동 번역 활성화
const isTranslating = ref(false) // 번역 중 상태

// 그리기 상태
const startPos = ref({ x: 0, y: 0 })
const currentPos = ref({ x: 0, y: 0 })
const history = ref([])
const historyIndex = ref(-1)
const tempCanvas = ref(null)
const backgroundImage = ref(null)

// 도구 정의
const tools = [
  { id: 'select', label: '선택', icon: Move },
  { id: 'box', label: '박스', icon: Square },
  { id: 'arrow', label: '화살표', icon: ArrowUp },
  { id: 'text', label: '텍스트', icon: Type }
]

// 컴퓨티드
const canUndo = ref(false)
const canRedo = ref(false)

// 메서드
const selectTool = (toolId) => {
  currentTool.value = toolId
  showTextOverlay.value = false
}

const initCanvas = async () => {
  if (!canvas.value) return
  
  ctx.value = canvas.value.getContext('2d', { willReadFrequently: true })
  
  // 배경 이미지 로드
  backgroundImage.value = new Image()
  backgroundImage.value.crossOrigin = 'anonymous' // CORS 설정
  
  backgroundImage.value.onload = () => {
    // 캔버스 크기를 이미지에 맞춰 조정
    const maxWidth = canvasWrapper.value?.clientWidth || 800
    const maxHeight = window.innerHeight - 200
    
    const imgRatio = backgroundImage.value.width / backgroundImage.value.height
    let width = backgroundImage.value.width
    let height = backgroundImage.value.height
    
    if (width > maxWidth) {
      width = maxWidth
      height = width / imgRatio
    }
    
    if (height > maxHeight) {
      height = maxHeight
      width = height * imgRatio
    }
    
    canvasWidth.value = width
    canvasHeight.value = height
    
    // 캔버스 크기 업데이트
    nextTick(() => {
      canvas.value.width = canvasWidth.value
      canvas.value.height = canvasHeight.value
      tempCanvas.value.width = canvasWidth.value
      tempCanvas.value.height = canvasHeight.value
      
      // 배경 이미지 그리기
      redrawCanvas()
      saveState()
    })
  }
  
  backgroundImage.value.onerror = (error) => {
    console.error('이미지 로드 실패:', error)
    alert('이미지를 불러올 수 없습니다. 다른 이미지를 선택해주세요.')
  }
  
  // 외부 URL인 경우 프록시 사용 (Supabase는 제외)
  let imageUrl = props.imageUrl
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Supabase URL은 CORS가 설정되어 있으므로 프록시 불필요
    const isSupabase = imageUrl.includes('supabase.co')
    const isLocal = imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')
    
    // Supabase나 로컬이 아닌 외부 URL만 프록시 사용
    if (!isSupabase && !isLocal) {
      imageUrl = `/.netlify/functions/proxyImage?url=${encodeURIComponent(imageUrl)}`
    }
  }
  
  backgroundImage.value.src = imageUrl
  
  // 임시 캔버스 생성 (미리보기용)
  tempCanvas.value = document.createElement('canvas')
  tempCanvas.value.width = canvasWidth.value
  tempCanvas.value.height = canvasHeight.value
}

const redrawCanvas = () => {
  if (!ctx.value || !backgroundImage.value) return
  
  // 배경 이미지 그리기
  ctx.value.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  ctx.value.drawImage(backgroundImage.value, 0, 0, canvasWidth.value, canvasHeight.value)
}

const getMousePos = (e) => {
  const rect = canvas.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

const startDrawing = (e) => {
  if (currentTool.value === 'text') {
    const pos = getMousePos(e)
    showTextOverlay.value = true
    textOverlayPos.value = {
      x: e.clientX - canvas.value.getBoundingClientRect().left,
      y: e.clientY - canvas.value.getBoundingClientRect().top
    }
    nextTick(() => {
      textOverlayInput.value?.focus()
    })
    return
  }
  
  isDrawing.value = true
  startPos.value = getMousePos(e)
  
  // 현재 상태 저장 (그리기 시작 전)
  const tempCtx = tempCanvas.value.getContext('2d')
  tempCtx.drawImage(canvas.value, 0, 0)
}

const draw = (e) => {
  if (!isDrawing.value) return
  
  currentPos.value = getMousePos(e)
  
  // 임시 캔버스의 내용을 메인 캔버스로 복사
  ctx.value.drawImage(tempCanvas.value, 0, 0)
  
  // 스타일 설정
  ctx.value.strokeStyle = strokeColor.value
  ctx.value.lineWidth = strokeWidth.value
  ctx.value.fillStyle = 'transparent'
  
  if (currentTool.value === 'box') {
    drawBox(startPos.value, currentPos.value)
  } else if (currentTool.value === 'arrow') {
    drawArrow(startPos.value, currentPos.value)
  }
}

const stopDrawing = () => {
  if (isDrawing.value) {
    isDrawing.value = false
    saveState()
  }
}

const drawBox = (start, end) => {
  const width = end.x - start.x
  const height = end.y - start.y
  
  ctx.value.beginPath()
  ctx.value.rect(start.x, start.y, width, height)
  ctx.value.stroke()
}

const drawArrow = (start, end) => {
  const headLength = 15
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  
  // 화살표 선
  ctx.value.beginPath()
  ctx.value.moveTo(start.x, start.y)
  ctx.value.lineTo(end.x, end.y)
  ctx.value.stroke()
  
  // 화살표 머리
  ctx.value.beginPath()
  ctx.value.moveTo(end.x, end.y)
  ctx.value.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.value.moveTo(end.x, end.y)
  ctx.value.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.value.stroke()
}

// 텍스트 번역 함수
const translateText = async (text) => {
  // 한글이 포함되어 있는지 확인
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)
  
  if (!hasKorean || !autoTranslate.value) {
    return text // 한글이 없거나 자동 번역이 꺼져있으면 그대로 반환
  }
  
  try {
    isTranslating.value = true
    const response = await fetch('/.netlify/functions/translatePrompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text })
    })
    
    if (response.ok) {
      const result = await response.json()
      if (result.success && result.data?.translatedPrompt) {
        return result.data.translatedPrompt
      }
    }
  } catch (error) {
    console.error('Translation error:', error)
  } finally {
    isTranslating.value = false
  }
  
  return text // 번역 실패 시 원본 반환
}

const confirmText = async () => {
  if (!tempTextInput.value) {
    cancelText()
    return
  }
  
  // 텍스트 번역
  const finalText = await translateText(tempTextInput.value)
  
  ctx.value.font = `${strokeWidth.value * 4}px Arial`
  ctx.value.fillStyle = strokeColor.value
  ctx.value.fillText(finalText, textOverlayPos.value.x, textOverlayPos.value.y)
  
  tempTextInput.value = ''
  showTextOverlay.value = false
  saveState()
}

const cancelText = () => {
  tempTextInput.value = ''
  showTextOverlay.value = false
}

const addText = () => {
  if (!textInput.value) return
  
  // 텍스트를 캔버스 중앙에 추가
  ctx.value.font = `${strokeWidth.value * 4}px Arial`
  ctx.value.fillStyle = strokeColor.value
  ctx.value.fillText(textInput.value, canvasWidth.value / 2, canvasHeight.value / 2)
  
  textInput.value = ''
  saveState()
}

// 터치 이벤트 처리
const handleTouchStart = (e) => {
  e.preventDefault()
  const touch = e.touches[0]
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY
  })
  canvas.value.dispatchEvent(mouseEvent)
}

const handleTouchMove = (e) => {
  e.preventDefault()
  const touch = e.touches[0]
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  })
  canvas.value.dispatchEvent(mouseEvent)
}

const handleTouchEnd = (e) => {
  e.preventDefault()
  const mouseEvent = new MouseEvent('mouseup', {})
  canvas.value.dispatchEvent(mouseEvent)
}

// 히스토리 관리
const saveState = () => {
  // 현재 히스토리 인덱스 이후의 모든 상태 제거
  history.value = history.value.slice(0, historyIndex.value + 1)
  
  // 현재 상태 저장
  const imageData = ctx.value.getImageData(0, 0, canvasWidth.value, canvasHeight.value)
  history.value.push(imageData)
  historyIndex.value++
  
  // 히스토리 제한 (최대 20개)
  if (history.value.length > 20) {
    history.value.shift()
    historyIndex.value--
  }
  
  updateUndoRedoState()
}

const updateUndoRedoState = () => {
  canUndo.value = historyIndex.value > 0
  canRedo.value = historyIndex.value < history.value.length - 1
}

const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    const imageData = history.value[historyIndex.value]
    ctx.value.putImageData(imageData, 0, 0)
    updateUndoRedoState()
  }
}

const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const imageData = history.value[historyIndex.value]
    ctx.value.putImageData(imageData, 0, 0)
    updateUndoRedoState()
  }
}

const clearCanvas = () => {
  redrawCanvas()
  saveState()
}

const saveAnnotations = () => {
  // 캔버스를 이미지로 변환
  canvas.value.toBlob((blob) => {
    const annotatedImage = new File([blob], 'annotated-image.png', { type: 'image/png' })
    const annotatedUrl = URL.createObjectURL(blob)
    
    // 주석 정보 생성
    const annotations = {
      hasAnnotations: true,
      instruction: "Remove all red boxes, arrows, and text annotations from the image immediately, then "
    }
    
    emit('save', {
      file: annotatedImage,
      url: annotatedUrl,
      annotations: annotations
    })
  })
}

// 생명주기
onMounted(() => {
  initCanvas()
})

onUnmounted(() => {
  // URL 객체 해제
  if (backgroundImage.value?.src?.startsWith('blob:')) {
    URL.revokeObjectURL(backgroundImage.value.src)
  }
})

// 워처
watch(() => props.imageUrl, (newUrl) => {
  if (newUrl) {
    initCanvas()
  }
})
</script>

<style scoped>
.draw-canvas-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.draw-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
}

.tool-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.text-input {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
  width: 150px;
}

.color-picker {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
}

.stroke-select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
}

.save-btn,
.cancel-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn {
  background: var(--primary-color);
  color: white;
}

.save-btn:hover {
  background: var(--primary-dark);
}

.cancel-btn {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.cancel-btn:hover {
  background: var(--bg-secondary);
}

.canvas-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 1rem;
  background: var(--bg-tertiary);
}

canvas {
  background: white;
  box-shadow: var(--shadow-lg);
  cursor: crosshair;
  max-width: 100%;
  max-height: 100%;
}

.text-overlay {
  position: fixed;
  z-index: 1000;
}

.text-overlay-input {
  padding: 0.5rem;
  border: 2px solid var(--primary-color);
  border-radius: 4px;
  font-size: 1rem;
  background: white;
  box-shadow: var(--shadow-lg);
  min-width: 200px;
}

.text-overlay-input:disabled {
  background: #f0f0f0;
  cursor: wait;
}

.translate-toggle {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  user-select: none;
  transition: all 0.2s;
}

.translate-toggle:hover {
  background: var(--bg-tertiary);
}

.translate-checkbox {
  margin: 0;
}

.translate-label {
  white-space: nowrap;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .draw-toolbar {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .tool-btn {
    width: 32px;
    height: 32px;
  }
  
  .text-input {
    width: 120px;
  }
}
</style>