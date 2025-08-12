import { defineStore } from 'pinia'
import { supabase } from '@/utils/supabase'

export const useProductionStore = defineStore('production', {
  state: () => ({
    productionSheets: [],
    currentScript: '',
    loading: false,
    error: null,
    currentJobProgress: 0,
    currentJobStatus: null
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
    async fetchProductionSheets(projectId) {
      if (!projectId) {
        console.error('프로젝트 ID가 필요합니다.')
        return []
      }

      this.loading = true
      this.error = null

      try {
        const { data, error } = await supabase
          .from('production_sheets')
          .select('*')
          .eq('project_id', projectId)
          .order('scene_number', { ascending: true })

        if (error) throw error

        // characters 필드가 null인 경우 빈 배열로 처리
        if (data) {
          data.forEach(sheet => {
            if (!sheet.characters) {
              sheet.characters = []
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
        this.loading = false
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
        // 1. 분석 작업 시작
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

        // 2. job_id를 받아서 폴링 시작
        const jobId = result.job_id
        console.log('분석 작업 시작됨:', jobId)
        
        // 3. 작업 상태를 주기적으로 확인 (최대 10분)
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

    // 스토어 초기화
    clearProductionData() {
      this.productionSheets = []
      this.currentScript = ''
      this.error = null
    }
  }
})