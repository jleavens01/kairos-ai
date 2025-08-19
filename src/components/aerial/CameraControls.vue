<template>
  <div class="camera-controls">
    <!-- 컨트롤 헤더 -->
    <div class="controls-header">
      <Camera :size="20" />
      <span>카메라 설정</span>
    </div>
    
    <!-- 줌 레벨 -->
    <div class="control-group">
      <label class="control-label">
        <Mountain :size="14" />
        <span>줌 레벨</span>
        <span class="value">{{ zoomLevel }}</span>
      </label>
      <input
        type="range"
        :value="zoomLevel"
        @input="updateZoom"
        min="1"
        max="22"
        step="1"
        class="control-slider"
      />
      <div class="preset-buttons">
        <button 
          v-for="preset in zoomPresets"
          :key="preset.value"
          @click="setZoom(preset.value)"
          class="preset-btn"
          :class="{ active: zoomLevel === preset.value }"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>
    
    <!-- 맵 타입 -->
    <div class="control-group">
      <label class="control-label">
        <Layers :size="14" />
        <span>맵 타입</span>
      </label>
      <div class="toggle-buttons">
        <button 
          v-for="type in mapTypes"
          :key="type.value"
          @click="setMapType(type.value)"
          class="toggle-btn"
          :class="{ active: mapType === type.value }"
        >
          {{ type.label }}
        </button>
      </div>
    </div>
    
    <!-- 애니메이션 프리셋 -->
    <div class="animation-section">
      <div class="section-header">
        <PlayCircle :size="16" />
        <span>카메라 애니메이션</span>
      </div>
      <div class="animation-buttons">
        <button
          v-for="anim in animations"
          :key="anim.id"
          @click="startAnimation(anim.id)"
          class="animation-btn"
          :disabled="animationRunning"
        >
          <component :is="anim.icon" :size="16" />
          <span>{{ anim.label }}</span>
        </button>
      </div>
    </div>
    
    <!-- 빠른 액션 -->
    <div class="quick-actions">
      <button @click="resetCamera" class="action-btn">
        <RotateCcw :size="16" />
        <span>초기화</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { 
  Camera, Mountain, Layers, PlayCircle, 
  RotateCcw, Zap, TrendingUp, Circle
} from 'lucide-vue-next'

const props = defineProps({
  initialZoom: {
    type: Number,
    default: 18
  },
  initialMapType: {
    type: String,
    default: 'satellite'
  }
})

const emit = defineEmits(['update', 'animate'])

// State
const zoomLevel = ref(props.initialZoom)
const mapType = ref(props.initialMapType)
const animationRunning = ref(false)

// 프리셋 값들
const zoomPresets = [
  { label: '세계', value: 3 },
  { label: '국가', value: 6 },
  { label: '도시', value: 11 },
  { label: '거리', value: 16 },
  { label: '건물', value: 19 },
  { label: '세부', value: 21 }
]

const mapTypes = [
  { label: '위성', value: 'satellite' },
  { label: '하이브리드', value: 'hybrid' },
  { label: '지형', value: 'terrain' },
  { label: '지도', value: 'roadmap' }
]

const animations = [
  { id: 'orbit', label: '360° 회전', icon: Circle },
  { id: 'rise', label: '상승', icon: TrendingUp },
  { id: 'dive', label: '급강하', icon: Zap }
]

// 줌 업데이트
const updateZoom = (e) => {
  zoomLevel.value = parseInt(e.target.value)
  emitUpdate()
}

const setZoom = (value) => {
  zoomLevel.value = value
  emitUpdate()
}

// 맵 타입 업데이트
const setMapType = (value) => {
  mapType.value = value
  emitUpdate()
}

// 변경사항 전달
const emitUpdate = () => {
  emit('update', {
    zoom: zoomLevel.value,
    mapType: mapType.value
  })
}

// 카메라 초기화
const resetCamera = () => {
  zoomLevel.value = props.initialZoom
  mapType.value = props.initialMapType
  emitUpdate()
}

// 애니메이션 시작
const startAnimation = (animationId) => {
  animationRunning.value = true
  emit('animate', animationId)
  
  // 애니메이션 종료 시뮬레이션 (실제로는 콜백 받아야 함)
  setTimeout(() => {
    animationRunning.value = false
  }, 5000)
}

// 외부에서 카메라 설정 업데이트
const updateFromExternal = (settings) => {
  if (settings.zoom !== undefined) zoomLevel.value = settings.zoom
  if (settings.mapType !== undefined) mapType.value = settings.mapType
}

// Cleanup
const cleanup = () => {
  // 정리 작업
}

defineExpose({
  updateFromExternal,
  cleanup
})
</script>

<style scoped>
.camera-controls {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.controls-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.control-group {
  margin-bottom: 24px;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-primary);
}

.control-label .value {
  margin-left: auto;
  font-weight: 600;
  color: var(--primary-color);
  font-family: 'Monaco', monospace;
}

.control-slider {
  width: 100%;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.control-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.control-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.control-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.preset-buttons,
.toggle-buttons,
.compass-directions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.preset-btn,
.toggle-btn,
.direction-btn {
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover,
.toggle-btn:hover,
.direction-btn:hover {
  background: var(--bg-tertiary);
}

.preset-btn.active,
.toggle-btn.active,
.direction-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.animation-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.animation-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.animation-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.animation-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.animation-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: white;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.spinning {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>