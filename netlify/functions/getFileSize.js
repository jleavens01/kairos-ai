// 파일 사이즈 체크 함수
export async function getFileSize(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const contentLength = response.headers.get('content-length')
    
    if (contentLength) {
      return parseInt(contentLength, 10)
    }
    
    // Content-Length가 없는 경우 실제 다운로드로 크기 확인
    const fullResponse = await fetch(url)
    if (!fullResponse.ok) {
      throw new Error(`HTTP error! status: ${fullResponse.status}`)
    }
    
    const arrayBuffer = await fullResponse.arrayBuffer()
    return arrayBuffer.byteLength
    
  } catch (error) {
    console.error('Error getting file size:', error)
    return null
  }
}

// 이미지 메타데이터 체크 함수
export async function getImageMetadata(url) {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    
    img.onerror = () => {
      resolve({ width: null, height: null })
    }
    
    img.src = url
  })
}

// 파일 사이즈를 읽기 쉬운 형태로 변환
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }
  
  try {
    const { url, type } = JSON.parse(event.body)
    
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URL is required' })
      }
    }
    
    const fileSize = await getFileSize(url)
    let metadata = {}
    
    if (type === 'image') {
      metadata = await getImageMetadata(url)
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        fileSize,
        formattedSize: formatFileSize(fileSize),
        ...metadata
      })
    }
    
  } catch (error) {
    console.error('Error in getFileSize handler:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      })
    }
  }
}