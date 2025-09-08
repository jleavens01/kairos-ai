// 스크립트 분석 비동기 처리 컴포저블
import { ref, computed, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'

export function useScriptAnalysis() {
  
  // 반응형 상태
  const currentJob = ref(null)
  const isAnalyzing = ref(false)
  const analysisResult = ref(null)
  const error = ref(null)
  
  // 폴링 관련
  const pollingInterval = ref(null)
  const POLLING_INTERVAL_MS = 2000 // 2초마다 상태 확인
  const MAX_POLLING_TIME = 300000 // 최대 5분 폴링
  
  // 계산된 속성
  const progress = computed(() => currentJob.value?.progress || 0)
  const status = computed(() => currentJob.value?.status || 'idle')
  const currentStep = computed(() => currentJob.value?.currentStep || '')
  const isCompleted = computed(() => status.value === 'completed')
  const isFailed = computed(() => status.value === 'failed')
  const isPending = computed(() => status.value === 'pending')
  const isProcessing = computed(() => status.value === 'processing')
  
  // 예상 완료 시간까지의 남은 시간 (초)
  const remainingTime = computed(() => {
    if (!currentJob.value?.estimatedCompletionTime) return null
    const remaining = new Date(currentJob.value.estimatedCompletionTime) - new Date()
    return Math.max(0, Math.floor(remaining / 1000))
  })
  
  // 스크립트 분석 시작
  const startAnalysis = async (projectId, scriptText, analysisType = 'documentary') => {
    try {
      isAnalyzing.value = true
      error.value = null
      currentJob.value = null
      analysisResult.value = null
      
      // 세션 정보 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('로그인이 필요합니다.')
      }
      
      console.log('Starting async script analysis...', {
        projectId,
        scriptLength: scriptText.length,
        analysisType
      })
      
      const response = await fetch('/.netlify/functions/analyze-script-async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          projectId,
          scriptText,
          analysisType
        })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error)
      }
      
      // 작업 정보 저장
      currentJob.value = {
        jobId: data.jobId,
        status: data.status,
        progress: 0,
        currentStep: '분석 작업 시작됨',
        estimatedCompletionTime: data.estimatedCompletionTime
      }
      
      console.log('Analysis job started:', data.jobId)
      
      // 상태 폴링 시작
      startPolling(data.jobId)
      
      return data.jobId
      
    } catch (err) {
      console.error('Failed to start analysis:', err)
      error.value = err.message
      isAnalyzing.value = false
      throw err
    }
  }
  
  // 상태 폴링 시작
  const startPolling = (jobId) => {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
    }
    
    const startTime = Date.now()
    
    const poll = async () => {
      try {
        // 최대 폴링 시간 초과 확인
        if (Date.now() - startTime > MAX_POLLING_TIME) {
          console.warn('Polling timeout reached')
          stopPolling()
          error.value = '분석 시간이 초과되었습니다. 나중에 다시 확인해주세요.'
          return
        }
        
        const { data: { session } } = await supabase.auth.getSession()
        const headers = {}
        if (session) {
          headers.Authorization = `Bearer ${session.access_token}`
        }
        
        const response = await fetch(`/.netlify/functions/check-analysis-status?jobId=${jobId}`, {
          headers
        })
        
        const data = await response.json()
        
        if (!data.success) {
          if (response.status === 404) {
            error.value = '분석 작업을 찾을 수 없습니다.'
          } else if (response.status === 410) {
            error.value = '분석 작업이 만료되었습니다.'
          } else {
            error.value = data.error || '상태 확인 중 오류가 발생했습니다.'
          }
          stopPolling()
          return
        }
        
        // 상태 업데이트
        currentJob.value = {
          jobId: data.jobId,
          status: data.status,
          progress: data.progress,
          currentStep: data.currentStep,
          estimatedCompletionTime: data.estimatedCompletionTime,
          message: data.message,
          totalScenes: data.totalScenes,
          createdAt: data.createdAt,
          completedAt: data.completedAt
        }
        
        // 완료 또는 실패 시 폴링 중단
        if (data.status === 'completed') {
          console.log('Analysis completed!', data.totalScenes, 'scenes created')
          analysisResult.value = data.result
          stopPolling()
          isAnalyzing.value = false
          
          // 성공 알림
          if (data.totalScenes) {
            console.log(`✅ 분석 완료: ${data.totalScenes}개 씬 생성`)
          }
          
        } else if (data.status === 'failed') {
          console.error('Analysis failed:', data.error)
          error.value = data.error || '분석 작업이 실패했습니다.'
          stopPolling()
          isAnalyzing.value = false
        }
        
      } catch (err) {
        console.error('Polling error:', err)
        // 네트워크 오류 등은 계속 재시도
        if (Date.now() - startTime > MAX_POLLING_TIME) {
          error.value = '네트워크 오류로 상태 확인을 중단했습니다.'
          stopPolling()
        }
      }
    }
    
    // 즉시 한 번 실행하고 인터벌 설정
    poll()
    pollingInterval.value = setInterval(poll, POLLING_INTERVAL_MS)
  }
  
  // 폴링 중단
  const stopPolling = () => {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
  }
  
  // 특정 작업 상태 확인 (수동)
  const checkJobStatus = async (jobId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {}
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`
      }
      
      const response = await fetch(`/.netlify/functions/check-analysis-status?jobId=${jobId}`, {
        headers
      })
      
      const data = await response.json()
      return data
      
    } catch (err) {
      console.error('Failed to check job status:', err)
      throw err
    }
  }
  
  // 분석 취소/리셋
  const resetAnalysis = () => {
    stopPolling()
    currentJob.value = null
    isAnalyzing.value = false
    analysisResult.value = null
    error.value = null
  }
  
  // 컴포넌트 언마운트 시 정리
  onUnmounted(() => {
    stopPolling()
  })
  
  return {
    // 상태
    currentJob,
    isAnalyzing,
    analysisResult,
    error,
    
    // 계산된 속성
    progress,
    status,
    currentStep,
    isCompleted,
    isFailed,
    isPending,
    isProcessing,
    remainingTime,
    
    // 메서드
    startAnalysis,
    checkJobStatus,
    resetAnalysis,
    stopPolling
  }
}