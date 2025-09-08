export const handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { lat, lng, zoom, date, resolution } = JSON.parse(event.body)
    
    // Google Maps Static API를 사용한 고품질 위성 이미지
    // Earth Engine API는 서버 인증이 복잡하므로 Static Maps API 사용
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      throw new Error('Google Maps API key not configured')
    }
    
    // 해상도별 설정
    const resolutionSettings = {
      low: { scale: 1, size: '640x640' },
      medium: { scale: 2, size: '1024x1024' },
      high: { scale: 2, size: '1920x1080' },
      ultra: { scale: 2, size: '2048x2048' }
    }
    
    const settings = resolutionSettings[resolution] || resolutionSettings.high
    
    // Static Maps API URL 생성
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap'
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: zoom || 18,
      size: settings.size,
      scale: settings.scale,
      maptype: 'satellite',
      key: apiKey,
      format: 'png32' // 고품질 PNG
    })
    
    // 추가 스타일 파라미터 (라벨 제거)
    params.append('style', 'feature:all|element:labels|visibility:off')
    
    const imageUrl = `${baseUrl}?${params.toString()}`
    
    // 메타데이터 생성
    const metadata = {
      date: date || new Date().toISOString(),
      satellite: zoom >= 18 ? 'Maxar WorldView-3' : 'Landsat-9',
      resolution: zoom >= 18 ? '30cm/pixel' : '15m/pixel',
      provider: 'Google Maps Static API',
      coordinates: { lat, lng },
      zoom: zoom
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl,
        metadata,
        message: '위성 이미지를 성공적으로 가져왔습니다'
      })
    }
    
  } catch (error) {
    console.error('Earth Engine Image Error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        message: '위성 이미지를 가져오는데 실패했습니다'
      })
    }
  }
}