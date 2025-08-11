import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'
import { useProfileStore } from './profile'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: false,
    error: null
  }),

  getters: {
    isLoggedIn: (state) => !!state.user
  },

  actions: {
    async initialize() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        this.user = user
        
        // 로그인되어 있으면 프로필도 함께 로드
        if (user) {
          const profileStore = useProfileStore()
          await profileStore.fetchProfile()
          
          // 테마 초기화
          const { useThemeStore } = await import('./theme')
          const themeStore = useThemeStore()
          await themeStore.initializeTheme()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        this.user = null
      }
    },

    async signInWithGoogle() {
      this.loading = true
      this.error = null
      
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/projects`
          }
        })
        
        if (error) throw error
        
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async signOut() {
      this.loading = true
      this.error = null
      
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        
        this.user = null
        
        // 프로필 스토어도 초기화
        const profileStore = useProfileStore()
        profileStore.clearProfile()
        
        return { success: true }
      } catch (error) {
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    }
  }
})