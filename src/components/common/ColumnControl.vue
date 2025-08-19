<template>
  <div class="column-control">
    <div class="control-label">
      <Grid3x3 :size="14" />
      <span>컬럼</span>
    </div>
    <div class="control-slider">
      <span class="slider-min">{{ minColumns }}</span>
      <input 
        type="range" 
        :min="minColumns" 
        :max="maxColumns" 
        :value="modelValue"
        @input="$emit('change', Number($event.target.value))"
        class="column-slider"
      />
      <span class="slider-max">{{ maxColumns }}</span>
      <span class="slider-value">{{ modelValue }}</span>
    </div>
  </div>
</template>

<script setup>
import { Grid3x3 } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 4
  },
  minColumns: {
    type: Number,
    default: 2
  },
  maxColumns: {
    type: Number,
    default: 8
  }
})

defineEmits(['change'])
</script>

<style scoped>
.column-control {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.control-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
}

.control-slider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  max-width: 250px;
}

.slider-min,
.slider-max {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-weight: 500;
  min-width: 16px;
  text-align: center;
}

.column-slider {
  flex: 1;
  height: 20px; /* 썸을 수용할 수 있는 높이로 증가 */
  background: transparent;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  vertical-align: middle; /* 수직 정렬 */
  position: relative;
}

.column-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
  margin-top: -6.5px; /* (썸 높이 18px - 트랙 높이 5px) / 2 = 6.5px */
  position: relative;
  z-index: 2;
}

.column-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.column-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--primary-color);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
  position: relative;
  z-index: 2;
}

.column-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
}

.column-slider::-webkit-slider-runnable-track {
  height: 5px;
  background: var(--border-color);
  border-radius: 3px;
  margin-top: 7.5px; /* 트랙을 중앙에 위치시킴 */
}

.column-slider::-moz-range-track {
  height: 5px;
  background: var(--border-color);
  border-radius: 3px;
}

.slider-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary-color);
  min-width: 20px;
  text-align: center;
  background: var(--bg-primary);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

/* 모바일 대응 */
@media (max-width: 768px) {
  .column-control {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .control-slider {
    width: 100%;
    justify-content: space-between;
  }
  
  .column-slider {
    flex: 1;
  }
}
</style>