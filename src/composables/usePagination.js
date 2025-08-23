import { ref, computed, watch } from 'vue'

export function usePagination(fetchFunction, options = {}) {
  const page = ref(1)
  const pageSize = ref(options.pageSize || 20)
  const totalCount = ref(0)
  const items = ref([])
  const loading = ref(false)
  const hasMore = ref(true)
  const error = ref(null)
  
  // 총 페이지 수
  const totalPages = computed(() => 
    Math.ceil(totalCount.value / pageSize.value)
  )
  
  // 다음 페이지 존재 여부
  const canLoadMore = computed(() => 
    hasMore.value && !loading.value && page.value < totalPages.value
  )
  
  // 데이터 로드
  const loadData = async (reset = false) => {
    if (loading.value) return
    
    loading.value = true
    error.value = null
    
    try {
      if (reset) {
        page.value = 1
        items.value = []
      }
      
      const result = await fetchFunction({
        page: page.value,
        pageSize: pageSize.value,
        ...options.params
      })
      
      if (result) {
        if (reset) {
          items.value = result.data || []
        } else {
          items.value = [...items.value, ...(result.data || [])]
        }
        
        totalCount.value = result.count || result.total || 0
        hasMore.value = result.hasMore !== undefined ? 
          result.hasMore : 
          (page.value * pageSize.value < totalCount.value)
      }
    } catch (err) {
      console.error('Pagination load error:', err)
      error.value = err
    } finally {
      loading.value = false
    }
  }
  
  // 다음 페이지 로드
  const loadMore = async () => {
    if (!canLoadMore.value) return
    
    page.value++
    await loadData()
  }
  
  // 새로고침
  const refresh = async () => {
    await loadData(true)
  }
  
  // 페이지 크기 변경 시 리셋
  watch(pageSize, () => {
    refresh()
  })
  
  return {
    items,
    loading,
    error,
    hasMore,
    page,
    pageSize,
    totalCount,
    totalPages,
    canLoadMore,
    loadData,
    loadMore,
    refresh
  }
}