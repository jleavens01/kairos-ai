// FAL AI 생성 실패 복구 시스템
import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'

export function useFailureRecovery(options = {}) {
  const {
    // 체크 간격 (밀리초, 기본값: 5분)
    checkInterval = 5 * 60 * 1000,
    // 자동 시작 여부
    autoStart = true,
    // 디버그 모드
    debug = false
  } = options

  const isChecking = ref(false)
  const lastCheckTime = ref(null)
  const checkResults = ref(null)
  const error = ref(null)

  let intervalId = null

  // 실패한 생성 체크 함수 호출
  const checkFailedGenerations = async () => {
    if (isChecking.value) {
      if (debug) console.log('Already checking, skipping...')
      return
    }

    // 개발 환경에서는 실패 복구 시스템 완전 비활성화
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1'

    if (isLocalhost) {
      if (debug) console.log('Development environment detected, skipping failure recovery check')
      return
    }

    try {
      isChecking.value = true
      error.value = null

      if (debug) console.log('Checking for failed generations...')

      const response = await fetch('/.netlify/functions/checkFailedGenerations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        checkResults.value = result
        lastCheckTime.value = new Date()

        if (debug || result.summary.completed > 0 || result.summary.failed > 0) {
          console.log('Failed generations check completed:', {
            checked: result.summary.checked,
            completed: result.summary.completed,
            failed: result.summary.failed,
            errors: result.summary.errors,
            timestamp: result.timestamp
          })
        }

        // 복구된 항목이 있으면 관련 스토어들 새로고침
        if (result.summary.completed > 0 || result.summary.failed > 0) {
          await refreshStores()
        }
      } else {
        throw new Error(result.error || 'Failed to check generations')
      }

    } catch (err) {
      error.value = err.message
      
      // 404 에러는 함수가 없는 경우이므로 경고만 표시
      if (err.message.includes('404')) {
        console.warn('checkFailedGenerations function not available:', err.message)
      } else {
        console.error('Failed to check failed generations:', err)
      }
    } finally {
      isChecking.value = false
    }
  }

  // 관련 스토어들 새로고침
  const refreshStores = async () => {
    try {
      // 현재 사용자 확인
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 이미지와 비디오 갱신 이벤트 발생
      // 다른 컴포넌트들이 이 이벤트를 듣고 있다가 갱신할 수 있도록
      window.dispatchEvent(new CustomEvent('generation-status-updated', {
        detail: {
          type: 'recovery',
          timestamp: new Date()
        }
      }))

      if (debug) console.log('Dispatched generation-status-updated event')

    } catch (err) {
      console.error('Failed to refresh stores:', err)
    }
  }

  // 폴링 시작
  const startPolling = () => {
    if (intervalId) {
      console.warn('Polling already started')
      return
    }

    // 함수 가용성을 먼저 체크한 후 폴링 시작
    checkFailedGenerations().then(() => {
      // 첫 번째 체크가 성공적이면 주기적 체크 시작
      if (!error.value || !error.value.includes('404')) {
        intervalId = setInterval(() => {
          checkFailedGenerations()
        }, checkInterval)

        if (debug) {
          console.log(`Started failure recovery polling (interval: ${checkInterval / 1000}s)`)
        }
      } else {
        if (debug) {
          console.log('Failure recovery function not available, polling disabled')
        }
      }
    })
  }

  // 폴링 중지
  const stopPolling = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
      
      if (debug) {
        console.log('Stopped failure recovery polling')
      }
    }
  }

  // 수동으로 즉시 체크
  const checkNow = async () => {
    await checkFailedGenerations()
  }

  // 컴포넌트 마운트/언마운트 처리
  onMounted(() => {
    if (autoStart) {
      // 약간의 지연 후 시작 (초기 로딩 완료 후)
      setTimeout(() => {
        startPolling()
      }, 3000)
    }
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    // 상태
    isChecking: readonly(isChecking),
    lastCheckTime: readonly(lastCheckTime),
    checkResults: readonly(checkResults),
    error: readonly(error),

    // 메서드
    startPolling,
    stopPolling,
    checkNow,
    checkFailedGenerations
  }
}

// 전역 실패 복구 시스템 (앱 전체에서 한 번만 실행)
let globalRecoveryInstance = null

export function useGlobalFailureRecovery() {
  if (!globalRecoveryInstance) {
    globalRecoveryInstance = useFailureRecovery({
      checkInterval: 5 * 60 * 1000, // 5분
      autoStart: true,
      debug: false
    })
  }
  
  return globalRecoveryInstance
}