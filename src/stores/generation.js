import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useGenerationStore = defineStore('generation', {
  state: () => ({
    // 이미지 생성 관련
    images: [],
    
    // 비디오 생성 관련
    videos: [],
    
    // 아바타 비디오 관련
    avatarVideos: [],
    
    // 로딩 상태
    loading: {
      images: false,
      videos: false,
      avatarVideos: false
    },
    
    // 에러 상태
    errors: {
      images: null,
      videos: null,
      avatarVideos: null
    }
  }),

  getters: {
    // 완료된 이미지들
    completedImages: (state) => state.images.filter(img => img.status === 'completed'),
    
    // 처리 중인 이미지들
    processingImages: (state) => state.images.filter(img => img.status === 'processing'),
    
    // 완료된 비디오들
    completedVideos: (state) => state.videos.filter(video => video.status === 'completed'),
    
    // 처리 중인 비디오들
    processingVideos: (state) => state.videos.filter(video => video.status === 'processing'),
    
    // 완료된 아바타 비디오들
    completedAvatarVideos: (state) => state.avatarVideos.filter(video => video.status === 'completed'),
    
    // 처리 중인 아바타 비디오들
    processingAvatarVideos: (state) => state.avatarVideos.filter(video => video.status === 'processing'),
    
    // 전체 처리 중인 항목 개수
    totalProcessing: (state) => {
      return state.images.filter(img => img.status === 'processing').length +
             state.videos.filter(video => video.status === 'processing').length +
             state.avatarVideos.filter(video => video.status === 'processing').length
    }
  },

  actions: {
    // 이미지 생성 추가
    async addImage(imageData) {
      try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) throw new Error('User not authenticated')

        const newImage = {
          user_id: user.user.id,
          type: 'image',
          status: imageData.status || 'processing',
          metadata: {
            model: imageData.model,
            prompt: imageData.prompt,
            style: imageData.style,
            ...imageData.metadata
          },
          created_at: new Date().toISOString()
        }

        // Supabase에 저장 (gen_videos 테이블 사용)
        const { data, error } = await supabase
          .from('gen_videos')
          .insert(newImage)
          .select()
          .single()

        if (error) throw error

        // 로컬 상태에 추가
        this.images.unshift(data)
        
        return data
      } catch (error) {
        console.error('Failed to add image:', error)
        this.errors.images = error.message
        throw error
      }
    },

    // 비디오 생성 추가
    async addVideo(videoData) {
      try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) throw new Error('User not authenticated')

        const newVideo = {
          user_id: user.user.id,
          type: 'video',
          status: videoData.status || 'processing',
          metadata: {
            model: videoData.model,
            prompt: videoData.prompt,
            request_id: videoData.request_id,
            ...videoData.metadata
          },
          created_at: new Date().toISOString()
        }

        // Supabase에 저장
        const { data, error } = await supabase
          .from('gen_videos')
          .insert(newVideo)
          .select()
          .single()

        if (error) throw error

        // 로컬 상태에 추가
        this.videos.unshift(data)
        
        return data
      } catch (error) {
        console.error('Failed to add video:', error)
        this.errors.videos = error.message
        throw error
      }
    },

    // 아바타 비디오 생성 추가
    async addAvatarVideo(avatarVideoData) {
      try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) throw new Error('User not authenticated')

        // gen_heygen_videos 테이블 구조에 맞게 데이터 구성
        const newAvatarVideo = {
          user_id: user.user.id,
          heygen_video_id: avatarVideoData.heygen_video_id,
          callback_id: avatarVideoData.callback_id || null,
          avatar_id: avatarVideoData.avatar_id,
          voice_id: avatarVideoData.voice_id || avatarVideoData.metadata?.voice_id,
          title: avatarVideoData.title || null,
          input_text: avatarVideoData.script || avatarVideoData.input_text,
          status: avatarVideoData.status || 'processing',
          
          // 비디오 설정
          dimension_width: avatarVideoData.metadata?.dimensions?.width || 1280,
          dimension_height: avatarVideoData.metadata?.dimensions?.height || 720,
          
          // 배경 설정
          background_type: avatarVideoData.metadata?.background?.type || 'color',
          background_value: avatarVideoData.metadata?.background?.value || '#f6f6fc',
          
          // 음성 설정
          voice_type: 'text',
          voice_speed: avatarVideoData.metadata?.voice_speed || 1.0,
          voice_emotion: avatarVideoData.metadata?.voice_emotion || null,
          voice_locale: avatarVideoData.metadata?.voice_locale || null,
          
          // 메타데이터 저장 (전체 요청 파라미터)
          generation_params: avatarVideoData.metadata || {}
        }

        // Supabase에 저장 (아바타 비디오는 gen_heygen_videos 테이블 사용)
        const { data, error } = await supabase
          .from('gen_heygen_videos')
          .insert(newAvatarVideo)
          .select()
          .single()

        if (error) throw error

        // 로컬 상태에 추가
        this.avatarVideos.unshift(data)
        
        return data
      } catch (error) {
        console.error('Failed to add avatar video:', error)
        this.errors.avatarVideos = error.message
        throw error
      }
    },

    // 모든 생성물 로드
    async loadGenerations() {
      try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) throw new Error('User not authenticated')

        this.loading.images = true
        this.loading.videos = true
        this.loading.avatarVideos = true

        // gen_videos 테이블에서 이미지와 비디오 로드
        const { data: genVideosData, error: genVideosError } = await supabase
          .from('gen_videos')
          .select('*')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false })

        if (genVideosError) throw genVideosError

        // gen_heygen_videos 테이블에서 아바타 비디오 로드
        const { data: heygenVideosData, error: heygenVideosError } = await supabase
          .from('gen_heygen_videos')
          .select('*')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false })

        if (heygenVideosError) throw heygenVideosError

        // 타입별로 분류
        this.images = genVideosData.filter(item => item.type === 'image')
        this.videos = genVideosData.filter(item => item.type === 'video')
        this.avatarVideos = heygenVideosData || []

      } catch (error) {
        console.error('Failed to load generations:', error)
        this.errors.images = error.message
        this.errors.videos = error.message
        this.errors.avatarVideos = error.message
      } finally {
        this.loading.images = false
        this.loading.videos = false
        this.loading.avatarVideos = false
      }
    },

    // 아바타 비디오 상태 업데이트
    async updateAvatarVideoStatus(id, status, result_url = null) {
      try {
        const updates = { 
          status,
          updated_at: new Date().toISOString()
        }

        if (result_url) {
          updates.result_url = result_url
        }

        const { data, error } = await supabase
          .from('gen_heygen_videos')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // 로컬 상태 업데이트
        const index = this.avatarVideos.findIndex(video => video.id === id)
        if (index !== -1) {
          this.avatarVideos[index] = { ...this.avatarVideos[index], ...data }
        }

        return data
      } catch (error) {
        console.error('Failed to update avatar video status:', error)
        this.errors.avatarVideos = error.message
        throw error
      }
    },

    // HeyGen 비디오 상태 확인
    async checkHeyGenVideoStatus(heygenVideoId) {
      try {
        const response = await fetch('/.netlify/functions/checkHeyGenStatus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: heygenVideoId })
        })

        if (!response.ok) {
          throw new Error('Failed to check HeyGen video status')
        }

        const result = await response.json()
        return result
      } catch (error) {
        console.error('Failed to check HeyGen status:', error)
        throw error
      }
    },

    // 처리 중인 아바타 비디오들의 상태 업데이트
    async pollAvatarVideos() {
      const processingVideos = this.processingAvatarVideos

      for (const video of processingVideos) {
        try {
          const heygenVideoId = video.metadata?.heygen_video_id
          if (!heygenVideoId) continue

          const statusResult = await this.checkHeyGenVideoStatus(heygenVideoId)
          
          if (statusResult.status === 'completed' && statusResult.video_url) {
            await this.updateAvatarVideoStatus(video.id, 'completed', statusResult.video_url)
          } else if (statusResult.status === 'failed') {
            await this.updateAvatarVideoStatus(video.id, 'failed')
          }
        } catch (error) {
          console.error(`Failed to poll avatar video ${video.id}:`, error)
        }
      }
    },

    // 생성물 삭제
    async deleteGeneration(id, type) {
      try {
        let error
        
        if (type === 'avatar_video') {
          // 아바타 비디오는 gen_heygen_videos 테이블에서 삭제
          ({ error } = await supabase
            .from('gen_heygen_videos')
            .delete()
            .eq('id', id))
        } else {
          // 이미지와 비디오는 gen_videos 테이블에서 삭제
          ({ error } = await supabase
            .from('gen_videos')
            .delete()
            .eq('id', id))
        }

        if (error) throw error

        // 로컬 상태에서 제거
        if (type === 'image') {
          this.images = this.images.filter(img => img.id !== id)
        } else if (type === 'video') {
          this.videos = this.videos.filter(video => video.id !== id)
        } else if (type === 'avatar_video') {
          this.avatarVideos = this.avatarVideos.filter(video => video.id !== id)
        }
      } catch (error) {
        console.error('Failed to delete generation:', error)
        throw error
      }
    },

    // 에러 상태 초기화
    clearError(type) {
      if (this.errors[type]) {
        this.errors[type] = null
      }
    },

    // 전체 상태 초기화
    reset() {
      this.images = []
      this.videos = []
      this.avatarVideos = []
      this.loading = {
        images: false,
        videos: false,
        avatarVideos: false
      }
      this.errors = {
        images: null,
        videos: null,
        avatarVideos: null
      }
    }
  }
})