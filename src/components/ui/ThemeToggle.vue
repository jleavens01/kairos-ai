<template>
  <button
    @click="toggleTheme"
    class="theme-toggle"
    :title="isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'"
  >
    <svg v-if="!isDarkMode" class="icon sun-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
    <svg v-else class="icon moon-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
    <span class="toggle-text">{{ isDarkMode ? '다크 모드' : '라이트 모드' }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const isDarkMode = computed(() => themeStore.isDarkMode)

const toggleTheme = () => {
  themeStore.toggleTheme()
}
</script>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 15px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 5px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 10px;
}

.theme-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.icon {
  width: 20px;
  height: 20px;
  transition: transform 0.3s;
}

.theme-toggle:hover .icon {
  transform: rotate(15deg);
}

.sun-icon {
  color: #fbbf24;
}

.moon-icon {
  color: #60a5fa;
}

.toggle-text {
  flex: 1;
  text-align: left;
}

/* 다크 모드일 때 버튼 스타일 */
.dark .theme-toggle {
  background-color: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
}

.dark .theme-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>