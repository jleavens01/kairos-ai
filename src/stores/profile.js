import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: null,
    loading: false,
    error: null
  }),

  getters: {
    // 기본 정보
    currentProfile: (state) => state.profile,
    displayName: (state) => {
      if (!state.profile) return ''
      return state.profile.nickname || state.profile.display_name || state.profile.email
    },
    
    // 크레딧 관련
    availableCredits: (state) => state.profile?.credits || 0,
    isCreditsLow: (state) => (state.profile?.credits || 0) < 20,
    
    // 티어 관련
    currentTier: (state) => state.profile?.tier || 'free',
    isPaidTier: (state) => state.profile?.tier !== 'free',
    tierExpired: (state) => {
      if (!state.profile?.tier_expires_at) return false
      return new Date(state.profile.tier_expires_at) < new Date()
    },
    
    // 제한 확인
    canCreateProject: (state) => {
      if (!state.profile) return false
      return state.profile.total_projects < state.profile.max_projects
    },
    
    remainingProjects: (state) => {
      if (!state.profile) return 0
      // NULL이면 무제한
      if (state.profile.max_projects === null) return '무제한'
      return state.profile.max_projects - state.profile.total_projects
    },
    
    // 표시용 getter 추가
    maxProjectsDisplay: (state) => {
      if (!state.profile) return '0'
      return state.profile.max_projects === null ? '무제한' : state.profile.max_projects + '개'
    },
    
    creditsDisplay: (state) => {
      if (!state.profile) return '0'
      // Enterprise 티어는 무제한 크레딧
      if (state.profile.tier === 'enterprise') return '무제한'
      return state.profile.credits
    }
  },

  actions: {
    async fetchProfile() {
      this.loading = true
      this.error = null
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('사용자 정보를 찾을 수 없습니다')
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (error) throw error
        
        this.profile = data
        return { success: true, data }
      } catch (error) {
        console.error('프로필 조회 오류:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },
    
    async updateProfile(updates) {
      this.loading = true
      this.error = null
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('사용자 정보를 찾을 수 없습니다')
        
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single()
        
        if (error) throw error
        
        this.profile = data
        return { success: true, data }
      } catch (error) {
        console.error('프로필 업데이트 오류:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },
    
    async checkNicknameAvailability(nickname) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('nickname', nickname)
          .single()
        
        if (error && error.code === 'PGRST116') {
          // 결과가 없음 = 사용 가능
          return { available: true }
        }
        
        return { available: false }
      } catch (error) {
        console.error('닉네임 중복 확인 오류:', error)
        return { available: false, error: error.message }
      }
    },
    
    async updateNickname(nickname) {
      // 닉네임 유효성 검사
      if (nickname.length < 3 || nickname.length > 20) {
        return { success: false, error: '닉네임은 3-20자 사이여야 합니다' }
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
        return { success: false, error: '닉네임은 영문, 숫자, 언더스코어(_)만 사용 가능합니다' }
      }
      
      // 중복 확인
      const { available } = await this.checkNicknameAvailability(nickname)
      if (!available) {
        return { success: false, error: '이미 사용중인 닉네임입니다' }
      }
      
      // 업데이트
      return await this.updateProfile({ nickname })
    },
    
    async useCredits(amount, description) {
      if (this.profile.credits < amount) {
        return { success: false, error: '크레딧이 부족합니다' }
      }
      
      const newCredits = this.profile.credits - amount
      const totalUsed = this.profile.total_credits_used + amount
      const monthlyUsed = this.profile.monthly_credits_used + amount
      
      return await this.updateProfile({
        credits: newCredits,
        total_credits_used: totalUsed,
        monthly_credits_used: monthlyUsed
      })
    },
    
    // 프로필 초기화
    clearProfile() {
      this.profile = null
      this.error = null
    }
  }
})