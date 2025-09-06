// 파일 사이즈 포맷팅 유틸리티

/**
 * 바이트를 읽기 쉬운 형태로 변환
 * @param {number} bytes - 바이트 수
 * @param {number} decimals - 소수점 자리수 (기본값: 2)
 * @returns {string} 포맷된 파일 사이즈
 */
export function formatFileSize(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 파일 사이즈 비교를 위한 바이트 단위 파싱
 * @param {string} sizeString - "1.5 MB" 형태의 문자열
 * @returns {number} 바이트 수
 */
export function parseFileSize(sizeString) {
  if (!sizeString) return 0
  
  const units = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4 }
  const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*([A-Z]{1,2})$/)
  
  if (!match) return 0
  
  const [, value, unit] = match
  return parseFloat(value) * (units[unit] || 1)
}

/**
 * 파일 사이즈 범주 분류
 * @param {number} bytes - 바이트 수
 * @returns {string} 범주 ('small', 'medium', 'large', 'huge')
 */
export function getFileSizeCategory(bytes) {
  if (!bytes) return 'unknown'
  
  if (bytes < 1024 * 100) return 'small'      // < 100KB
  if (bytes < 1024 * 1024 * 5) return 'medium' // < 5MB
  if (bytes < 1024 * 1024 * 50) return 'large' // < 50MB
  return 'huge'                                 // >= 50MB
}

/**
 * 파일 사이즈에 따른 색상 클래스 반환
 * @param {number} bytes - 바이트 수
 * @returns {string} CSS 클래스
 */
export function getFileSizeColorClass(bytes) {
  const category = getFileSizeCategory(bytes)
  
  const colorMap = {
    small: 'text-green-500',
    medium: 'text-blue-500', 
    large: 'text-orange-500',
    huge: 'text-red-500',
    unknown: 'text-gray-400'
  }
  
  return colorMap[category]
}

/**
 * 여러 파일의 총 사이즈 계산
 * @param {Array} files - file_size 속성을 가진 객체 배열
 * @returns {number} 총 바이트 수
 */
export function calculateTotalSize(files) {
  if (!Array.isArray(files)) return 0
  
  return files.reduce((total, file) => {
    return total + (file.file_size || 0)
  }, 0)
}

/**
 * 압축률 계산
 * @param {number} originalSize - 원본 사이즈
 * @param {number} compressedSize - 압축된 사이즈
 * @returns {number} 압축률 (0-100%)
 */
export function calculateCompressionRatio(originalSize, compressedSize) {
  if (!originalSize || !compressedSize) return 0
  
  return Math.round((1 - compressedSize / originalSize) * 100)
}