import { defineStore } from 'pinia'
import { useProfileStore } from './profile'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: localStorage.getItem('theme') || 'dark'
  }),

  getters: {
    isDarkMode: (state) => state.mode === 'dark',
    currentTheme: (state) => state.mode
  },

  actions: {
    // 초기화 - 프로필에서 테마 로드
    async initializeTheme() {
      const profileStore = useProfileStore()
      
      // 프로필에 저장된 테마가 있으면 사용
      if (profileStore.currentProfile?.theme_mode) {
        this.mode = profileStore.currentProfile.theme_mode
      } else {
        // 로컬 스토리지에서 테마 가져오기
        const savedTheme = localStorage.getItem('theme')
        if (savedTheme) {
          this.mode = savedTheme
        } else {
          // 기본값은 다크 모드
          this.mode = 'dark'
        }
      }
      
      this.applyTheme()
    },
    
    // 테마 전환
    async toggleTheme() {
      this.mode = this.mode === 'light' ? 'dark' : 'light'
      this.applyTheme()
      
      // 로컬 스토리지에 저장
      localStorage.setItem('theme', this.mode)
      
      // 프로필에 저장 (로그인한 경우)
      const profileStore = useProfileStore()
      if (profileStore.currentProfile) {
        await profileStore.updateProfile({ theme_mode: this.mode })
      }
    },
    
    // 특정 테마로 설정
    async setTheme(theme) {
      if (theme !== 'light' && theme !== 'dark') return
      
      this.mode = theme
      this.applyTheme()
      
      // 로컬 스토리지에 저장
      localStorage.setItem('theme', this.mode)
      
      // 프로필에 저장 (로그인한 경우)
      const profileStore = useProfileStore()
      if (profileStore.currentProfile) {
        await profileStore.updateProfile({ theme_mode: this.mode })
      }
    },
    
    // DOM에 테마 적용
    applyTheme() {
      const root = document.documentElement
      
      if (this.mode === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }
})