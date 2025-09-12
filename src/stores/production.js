import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useProductionStore = defineStore('production', {
  state: () => ({
    productionSheets: [],
    currentScript: '',
    loading: false,
    error: null,
    currentJobProgress: 0,
    currentJobStatus: null,
    // AI 콘텐츠 제작 시스템
    contentItems: [],
    agentTasks: [],
    workflowStatus: {
      stage: 'idle', // idle, collecting, researching, writing, generating
      activeAgents: [],
      completedTasks: 0,
      totalTasks: 0
    },
    // 미디어 업데이트 관련
    pendingMediaUpdates: [], // 모달 열려있을 때 대기중인 업데이트
    isModalOpen: false, // 모달 상태 추적
    realtimeChannel: null // Realtime 채널 참조
  }),

  getters: {
    getProductionSheets: (state) => state.productionSheets,
    isLoading: (state) => state.loading,
    hasError: (state) => state.error !== null,
    
    // 프로젝트별 씬 개수
    getSceneCount: (state) => (projectId) => {
      return state.productionSheets.filter(sheet => sheet.project_id === projectId).length
    },
    
    // 특정 씬 가져오기
    getSceneById: (state) => (sceneId) => {
      return state.productionSheets.find(sheet => sheet.id === sceneId)
    }
  },

  actions: {
    // 프로젝트의 스토리보드 데이터 가져오기
    async fetchProductionSheets(projectId, silent = false) {
      if (!projectId) {
        console.error('프로젝트 ID가 필요합니다.')
        return []
      }

      // silent 모드가 아닐 때만 loading 상태 변경
      if (!silent) {
        this.loading = true
      }
      this.error = null

      try {
        // 1. production_sheets 먼저 로드 (빠른 쿼리)
        const { data, error } = await supabase
          .from('production_sheets')
          .select('*')
          .eq('project_id', projectId)
          .order('scene_number', { ascending: true })

        if (error) throw error

        // 2. tts_audio 별도 로드 (필요한 경우만)
        let ttsAudioMap = {}
        if (data && data.length > 0) {
          const sheetIds = data.map(sheet => sheet.id)
          const { data: ttsData } = await supabase
            .from('tts_audio')
            .select('scene_id, file_url, voice_id, model_id, text, created_at')
            .in('scene_id', sheetIds)
            .order('created_at', { ascending: false })

          if (ttsData) {
            // scene_id별로 그룹화
            ttsAudioMap = ttsData.reduce((acc, tts) => {
              if (!acc[tts.scene_id]) acc[tts.scene_id] = []
              acc[tts.scene_id].push(tts)
              return acc
            }, {})
          }
        }

        // characters 필드가 null인 경우 빈 배열로 처리
        // TTS 데이터 처리
        if (data) {
          data.forEach(sheet => {
            if (!sheet.characters) {
              sheet.characters = []
            }
            
            // TTS 데이터가 있으면 tts_audio_url 필드에 추가
            const ttsAudioList = ttsAudioMap[sheet.id] || []
            if (ttsAudioList.length > 0) {
              // 가장 최신 TTS 선택 (이미 created_at desc로 정렬됨)
              const latestTTS = ttsAudioList[0]
              sheet.tts_audio_url = latestTTS.file_url
              sheet.tts_text = latestTTS.text
              sheet.tts_voice_id = latestTTS.voice_id
              sheet.tts_model_id = latestTTS.model_id
              sheet.tts_audio = ttsAudioList // 기존 호환성 유지
            } else {
              sheet.tts_audio_url = null
              sheet.tts_text = null
              sheet.tts_voice_id = null
              sheet.tts_model_id = null
              sheet.tts_audio = []
            }
          })
        }

        this.productionSheets = data || []
        return this.productionSheets
      } catch (error) {
        console.error('스토리보드 데이터 로드 실패:', error)
        this.error = error.message
        return []
      } finally {
        if (!silent) {
          this.loading = false
        }
      }
    },

    // 스크립트 분석 및 씬 생성 (비동기 폴링 방식)
    async analyzeScript(projectId, scriptText) {
      if (!projectId || !scriptText) {
        console.error('프로젝트 ID와 스크립트가 필요합니다.')
        return { success: false, error: '필수 데이터가 없습니다.' }
      }

      this.loading = true
      this.error = null
      this.currentJobProgress = 0
      this.currentJobStatus = 'AI 분석 시작 중...'

      try {
        // 1. 짧은 스크립트는 즉시 처리 (5000자 이하)
        if (scriptText.length <= 5000) {
          const response = await fetch('/.netlify/functions/analyze-script-quick', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId,
              scriptText
            })
          })

          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || '스크립트 분석 실패')
          }

          // 즉시 처리 완료
          console.log('스크립트 분석 완료:', result.data)
          
          // 프로덕션 시트 다시 로드
          await this.fetchProductionSheets(projectId)
          
          return {
            success: true,
            data: result.data
          }
        }
        
        // 2. 긴 스크립트는 기존 비동기 처리
        const response = await fetch('/.netlify/functions/analyze-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            scriptText
          })
        })

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || '스크립트 분석 시작 실패')
        }

        // 3. job_id를 받아서 폴링 시작
        const jobId = result.job_id
        console.log('분석 작업 시작됨:', jobId)
        
        // 4. 작업 상태를 주기적으로 확인 (최대 10분)
        const maxAttempts = 120 // 5초 간격으로 120번 = 10분
        let attempts = 0
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)) // 5초 대기
          
          const statusResponse = await fetch(`/.netlify/functions/check-job-status?job_id=${jobId}`)
          const statusResult = await statusResponse.json()
          
          if (!statusResult.success) {
            throw new Error('작업 상태 확인 실패')
          }
          
          const jobData = statusResult.data
          
          // 진행 상태 업데이트 (progress는 check-job-status에서 계산됨)
          this.currentJobProgress = jobData.progress || 0
          this.currentJobStatus = jobData.status_message || jobData.status
          
          // 작업 완료
          if (jobData.status === 'completed') {
            console.log('분석 완료:', jobData.result)
            
            // 프로덕션 시트 다시 로드
            await this.fetchProductionSheets(projectId)
            
            return {
              success: true,
              data: jobData.result
            }
          }
          
          // 작업 실패
          if (jobData.status === 'failed') {
            throw new Error(jobData.error_message || '스크립트 분석 실패')
          }
          
          attempts++
        }
        
        throw new Error('분석 작업 시간 초과')

      } catch (error) {
        console.error('스크립트 분석 실패:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
        this.currentJobProgress = 0
        this.currentJobStatus = null
      }
    },

    // 씬 업데이트
    async updateScene(sceneId, updates) {
      if (!sceneId || !updates) {
        console.error('씬 ID와 업데이트 데이터가 필요합니다.')
        return { success: false, error: '필수 데이터가 없습니다.' }
      }

      console.log('updateScene called with:', { sceneId, updates })

      try {
        const { data, error } = await supabase
          .from('production_sheets')
          .update(updates)
          .eq('id', sceneId)
          .select()
          .single()

        console.log('Supabase response:', { data, error })

        if (error) throw error

        // state 업데이트
        const index = this.productionSheets.findIndex(sheet => sheet.id === sceneId)
        if (index !== -1) {
          this.productionSheets[index] = data
          console.log('State updated at index:', index, 'with data:', data)
        }

        return { success: true, data }
      } catch (error) {
        console.error('씬 업데이트 실패:', error)
        return { success: false, error: error.message }
      }
    },

    // 씬 삭제
    async deleteScene(sceneId) {
      if (!sceneId) {
        console.error('씬 ID가 필요합니다.')
        return { success: false, error: '씬 ID가 없습니다.' }
      }

      try {
        const { error } = await supabase
          .from('production_sheets')
          .delete()
          .eq('id', sceneId)

        if (error) throw error

        // state에서 제거
        this.productionSheets = this.productionSheets.filter(sheet => sheet.id !== sceneId)

        return { success: true }
      } catch (error) {
        console.error('씬 삭제 실패:', error)
        return { success: false, error: error.message }
      }
    },

    // 여러 씬 일괄 업데이트
    async updateMultipleScenes(scenes) {
      if (!scenes || scenes.length === 0) {
        console.error('업데이트할 씬 데이터가 없습니다.')
        return { success: false, error: '씬 데이터가 없습니다.' }
      }

      try {
        const promises = scenes.map(scene => 
          supabase
            .from('production_sheets')
            .update(scene)
            .eq('id', scene.id)
            .select()
        )

        const results = await Promise.all(promises)
        
        // 에러 체크
        const errors = results.filter(result => result.error)
        if (errors.length > 0) {
          throw new Error('일부 씬 업데이트 실패')
        }

        // state 업데이트
        results.forEach(result => {
          if (result.data) {
            const index = this.productionSheets.findIndex(sheet => sheet.id === result.data[0].id)
            if (index !== -1) {
              this.productionSheets[index] = result.data[0]
            }
          }
        })

        return { success: true, data: results.map(r => r.data[0]) }
      } catch (error) {
        console.error('씬 일괄 업데이트 실패:', error)
        return { success: false, error: error.message }
      }
    },

    // 1단계: 씬 나누기만 수행 (캐릭터 추출 없음)
    async splitScenes(projectId, scriptText) {
      if (!projectId || !scriptText) {
        console.error('프로젝트 ID와 스크립트가 필요합니다.')
        return { success: false, error: '필수 데이터가 없습니다.' }
      }

      this.loading = true
      this.error = null
      this.currentJobProgress = 0
      this.currentJobStatus = '씬 나누기 작업 중...'

      try {
        // JWT 토큰 가져오기
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('인증이 필요합니다.')
        }

        const response = await fetch('/.netlify/functions/split-scenes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            projectId,
            scriptText
          })
        })

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || '씬 나누기 실패')
        }

        console.log('씬 나누기 완료:', result.data)
        
        // 프로덕션 시트 다시 로드
        await this.fetchProductionSheets(projectId)
        
        return {
          success: true,
          data: result.data
        }

      } catch (error) {
        console.error('씬 나누기 실패:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
        this.currentJobProgress = 0
        this.currentJobStatus = null
      }
    },

    // 2단계: 선택된 씬들의 캐릭터 추출
    async extractCharacters(projectId, sceneIds, existingCharacters = []) {
      if (!projectId || !sceneIds || sceneIds.length === 0) {
        console.error('프로젝트 ID와 씬 ID가 필요합니다.')
        return { success: false, error: '필수 데이터가 없습니다.' }
      }

      this.loading = true
      this.error = null
      this.currentJobProgress = 0
      this.currentJobStatus = '캐릭터 추출 작업 중...'

      try {
        // JWT 토큰 가져오기
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('인증이 필요합니다.')
        }

        const response = await fetch('/.netlify/functions/extract-characters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            projectId,
            sceneIds,
            existingCharacters
          })
        })

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || '캐릭터 추출 실패')
        }

        console.log('캐릭터 추출 완료:', result.data)
        
        // 프로덕션 시트 다시 로드
        await this.fetchProductionSheets(projectId)
        
        return {
          success: true,
          data: result.data
        }

      } catch (error) {
        console.error('캐릭터 추출 실패:', error)
        this.error = error.message
        return { success: false, error: error.message }
      } finally {
        this.loading = false
        this.currentJobProgress = 0
        this.currentJobStatus = null
      }
    },

    // 프로젝트의 캐릭터 리스트 가져오기 (production_sheets에서 수집)
    async getProjectCharacters(projectId) {
      if (!projectId) {
        console.error('프로젝트 ID가 필요합니다.')
        return []
      }

      try {
        // production_sheets가 이미 로드되어 있으면 그것을 사용
        let sheets = this.productionSheets
        
        // 로드되어 있지 않으면 DB에서 가져오기
        if (!sheets || sheets.length === 0) {
          const { data, error } = await supabase
            .from('production_sheets')
            .select('characters')
            .eq('project_id', projectId)
          
          if (error) throw error
          sheets = data || []
        }
        
        // 모든 씬에서 캐릭터 수집
        const characterMap = new Map()
        
        sheets.forEach(sheet => {
          if (sheet.characters && Array.isArray(sheet.characters)) {
            sheet.characters.forEach(character => {
              if (character && character !== '내레이터') {
                if (!characterMap.has(character)) {
                  characterMap.set(character, {
                    name: character,
                    count: 0
                  })
                }
                characterMap.get(character).count++
              }
            })
          }
        })
        
        // 등장 횟수 순으로 정렬
        const characters = Array.from(characterMap.values())
          .sort((a, b) => b.count - a.count)
        
        return characters
      } catch (error) {
        console.error('캐릭터 리스트 조회 실패:', error)
        return []
      }
    },

    // 스토어 초기화
    clearProductionData() {
      this.productionSheets = []
      this.currentScript = ''
      this.error = null
    },

    // AI 콘텐츠 제작 시스템 액션들
    
    // 콘텐츠 아이템 설정
    setContentItems(items) {
      this.contentItems = items
    },
    
    // 연구 작업 시작
    async startResearch(itemId) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('인증이 필요합니다.')
        }

        const response = await fetch('/.netlify/functions/startResearch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ itemId })
        })

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || '연구 시작 실패')
        }

        // 워크플로우 상태 업데이트
        this.workflowStatus.stage = 'researching'
        
        return result
      } catch (error) {
        console.error('연구 시작 실패:', error)
        throw error
      }
    },
    
    // 에이전트 작업 상태 조회
    async fetchAgentTasks() {
      try {
        const { data, error } = await supabase
          .from('agent_tasks')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (error) throw error
        
        this.agentTasks = data || []
        
        // 진행 상태 계산
        const activeTasks = data.filter(t => t.status === 'in_progress')
        const completedTasks = data.filter(t => t.status === 'completed')
        
        this.workflowStatus.activeAgents = [...new Set(activeTasks.map(t => t.agent_type))]
        this.workflowStatus.completedTasks = completedTasks.length
        this.workflowStatus.totalTasks = data.length
        
        return data
      } catch (error) {
        console.error('에이전트 작업 조회 실패:', error)
        return []
      }
    },
    
    // 워크플로우 상태 업데이트
    updateWorkflowStatus(status) {
      this.workflowStatus = { ...this.workflowStatus, ...status }
    },
    
    // 뉴스 수집 트리거
    async triggerNewsCollection(params = {}) {
      try {
        const response = await fetch('/.netlify/functions/collectNews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'manual',
            ...params
          })
        })

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || '뉴스 수집 실패')
        }

        // 수집된 아이템 저장
        if (result.data && result.data.items) {
          this.setContentItems(result.data.items)
        }
        
        this.workflowStatus.stage = 'collecting'
        
        return result
      } catch (error) {
        console.error('뉴스 수집 실패:', error)
        throw error
      }
    },
    
    // collectNews 액션 (NewsCollector 컴포넌트에서 사용)
    async collectNews(params = {}) {
      return await this.triggerNewsCollection(params)
    },
    
    // 트렌드 분석 (NewsCollector 컴포넌트에서 사용)
    async analyzeTrends(params = {}) {
      try {
        const response = await fetch('/.netlify/functions/analyzeBrandTrends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'manual',
            ...params
          })
        })

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || '트렌드 분석 실패')
        }

        // 수집된 아이템 저장
        if (result.data && result.data.items) {
          this.setContentItems(result.data.items)
        }
        
        this.workflowStatus.stage = 'analyzing'
        
        return result
      } catch (error) {
        console.error('트렌드 분석 실패:', error)
        throw error
      }
    },
    
    // 최근 수집된 콘텐츠 아이템 가져오기
    async fetchRecentContentItems(sourceType = 'all') {
      try {
        let query = supabase
          .from('content_items')
          .select('*')
        
        // source_type 필터링
        if (sourceType === 'all') {
          // 트렌드를 우선적으로, 없으면 뉴스
          query = query.in('source_type', ['trend', 'news'])
        } else if (sourceType) {
          query = query.eq('source_type', sourceType)
        }
        
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (error) throw error
        
        this.contentItems = data || []
        return data
      } catch (error) {
        console.error('콘텐츠 아이템 조회 실패:', error)
        return []
      }
    },

    // 모달 상태 설정
    setModalOpen(isOpen) {
      this.isModalOpen = isOpen
      
      // 모달이 닫히고 대기중인 업데이트가 있으면 처리
      if (!isOpen && this.pendingMediaUpdates.length > 0) {
        setTimeout(() => {
          this.processPendingUpdates()
        }, 500) // 모달 닫힌 후 잠시 대기
      }
    },

    // 대기중인 업데이트 처리
    processPendingUpdates() {
      if (this.pendingMediaUpdates.length === 0) return
      
      console.log(`Processing ${this.pendingMediaUpdates.length} pending updates`)
      
      // 각 업데이트를 이벤트로 발생시킴
      this.pendingMediaUpdates.forEach(update => {
        window.dispatchEvent(new CustomEvent('media-update', { 
          detail: update 
        }))
      })
      
      // 대기 목록 초기화
      this.pendingMediaUpdates = []
    },

    // 미디어 업데이트 수신 (웹훅/Realtime)
    handleMediaUpdate(update) {
      // 프로덕션 환경에서만 작동
      if (import.meta.env.MODE !== 'production') {
        console.log('Media update received (dev mode, ignored):', update)
        return
      }
      
      // 모달이 열려있으면 대기 목록에 추가
      if (this.isModalOpen) {
        console.log('Modal is open, queuing update:', update)
        this.pendingMediaUpdates.push(update)
      } else {
        // 즉시 업데이트 이벤트 발생
        console.log('Processing media update immediately:', update)
        window.dispatchEvent(new CustomEvent('media-update', { 
          detail: update 
        }))
      }
    },

    // Realtime 구독 설정
    setupRealtimeSubscription(projectId) {
      // 기존 채널이 있으면 제거
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel)
      }
      
      // 프로덕션 환경에서만 Realtime 구독
      if (import.meta.env.MODE !== 'production') {
        console.log('Skipping realtime subscription in dev mode')
        return
      }
      
      // 미디어 업데이트 브로드캐스트 구독
      this.realtimeChannel = supabase
        .channel('media-updates')
        .on('broadcast', { event: '*' }, (payload) => {
          console.log('Realtime broadcast received:', payload)
          
          // 프로젝트 ID가 일치하는 경우만 처리
          if (payload.payload?.project_id === projectId) {
            this.handleMediaUpdate(payload.payload)
          }
        })
        .subscribe((status) => {
          console.log('Realtime subscription status:', status)
        })
    },

    // Realtime 구독 해제
    cleanupRealtimeSubscription() {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel)
        this.realtimeChannel = null
      }
    }
  }
})