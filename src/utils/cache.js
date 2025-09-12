// 간단한 메모리 캐시 구현 (성능 최적화용)

class SimpleCache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5분 TTL
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  set(key, value) {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    const item = {
      value,
      timestamp: Date.now()
    }
    
    this.cache.set(key, item)
  }

  get(key) {
    const item = this.cache.get(key)
    
    if (!item) return null

    // TTL 체크
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  has(key) {
    const item = this.cache.get(key)
    
    if (!item) return false

    // TTL 체크
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  clear() {
    this.cache.clear()
  }

  // 프로젝트별 캐시 클리어
  clearByProject(projectId) {
    for (const [key] of this.cache) {
      if (key.includes(projectId)) {
        this.cache.delete(key)
      }
    }
  }
}

// 전역 캐시 인스턴스들
export const imageCache = new SimpleCache(50, 3 * 60 * 1000) // 3분 캐시
export const videoCache = new SimpleCache(30, 3 * 60 * 1000) // 3분 캐시  
export const libraryCache = new SimpleCache(20, 2 * 60 * 1000) // 2분 캐시

// 캐시 키 생성 헬퍼
export const createCacheKey = (table, projectId, filters = {}) => {
  const filterStr = Object.entries(filters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join(',')
  
  return `${table}:${projectId}:${filterStr}`
}

// 캐시된 Supabase 쿼리 헬퍼
export const cachedQuery = async (cache, key, queryFn, options = {}) => {
  const { forceRefresh = false } = options
  
  // 캐시에서 확인
  if (!forceRefresh && cache.has(key)) {
    console.log(`Cache hit: ${key}`)
    return cache.get(key)
  }

  // 실제 쿼리 실행
  console.log(`Cache miss: ${key}`)
  try {
    const result = await queryFn()
    cache.set(key, result)
    return result
  } catch (error) {
    console.error(`Query failed for ${key}:`, error)
    throw error
  }
}

export default SimpleCache