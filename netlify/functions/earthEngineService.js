// Earth Engine은 승인 대기 중이므로 일단 주석 처리
// import ee from '@google/earthengine'

// Earth Engine 초기화 (한 번만 실행)
let isInitialized = false

const initializeEarthEngine = async () => {
  // Earth Engine 승인 대기 중 - 폴백 모드 사용
  console.log('Earth Engine is pending approval, using fallback mode')
  isInitialized = true
  return false // Earth Engine 사용 불가
}

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
    const { action, params } = JSON.parse(event.body)
    
    // Earth Engine 초기화 시도
    const eeAvailable = await initializeEarthEngine()
    
    // Earth Engine 승인 대기 중 - 폴백 사용
    if (!eeAvailable) {
      console.log('Earth Engine not available, using fallback')
      
      // Static Maps API 폴백
      const fallbackUrl = getFallbackImageUrl(params)
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Earth Engine is pending approval, using Google Static Maps',
          fallback: fallbackUrl,
          data: {
            imageUrl: fallbackUrl,
            metadata: {
              satellite: 'Google Maps Satellite',
              resolution: 'Variable',
              date: new Date().toISOString(),
              provider: 'Google Static Maps API'
            }
          }
        })
      }
    }
    
    // Earth Engine이 사용 가능한 경우 (현재는 실행되지 않음)
    let result = {}
    
    switch (action) {
      case 'getTileUrl':
        result = await getTileUrl(params)
        break
        
      case 'getSatelliteImage':
        result = await getSatelliteImage(params)
        break
        
      case 'getHistoricalImagery':
        result = await getHistoricalImagery(params)
        break
        
      case 'getImageCollection':
        result = await getImageCollection(params)
        break
        
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result
      })
    }
    
  } catch (error) {
    console.error('Earth Engine Service Error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        fallback: getFallbackImageUrl(JSON.parse(event.body).params)
      })
    }
  }
}

// Earth Engine 함수들 - 승인 후 사용 가능
/* 
// 타일 URL 생성
async function getTileUrl(params) {
  const { lat, lng, zoom, satellite, startDate, endDate } = params
  
  try {
    // 위치 생성
    const point = ee.Geometry.Point([lng, lat])
    
    // 위성 선택
    let collection
    switch (satellite) {
      case 'sentinel2':
        // Sentinel-2: 10m 해상도, 2015년부터
        collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
          .filterBounds(point)
          .filterDate(startDate || '2020-01-01', endDate || new Date().toISOString())
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
          .select(['B4', 'B3', 'B2']) // RGB 밴드
        break
        
      case 'landsat9':
        // Landsat 9: 30m 해상도, 2021년부터
        collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
          .filterBounds(point)
          .filterDate(startDate || '2021-01-01', endDate || new Date().toISOString())
          .filter(ee.Filter.lt('CLOUD_COVER', 20))
          .select(['SR_B4', 'SR_B3', 'SR_B2']) // RGB 밴드
        break
        
      case 'landsat8':
        // Landsat 8: 30m 해상도, 2013년부터
        collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
          .filterBounds(point)
          .filterDate(startDate || '2013-01-01', endDate || new Date().toISOString())
          .filter(ee.Filter.lt('CLOUD_COVER', 20))
          .select(['SR_B4', 'SR_B3', 'SR_B2']) // RGB 밴드
        break
        
      default:
        // 기본: Sentinel-2
        collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
          .filterBounds(point)
          .filterDate(startDate || '2020-01-01', endDate || new Date().toISOString())
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
          .select(['B4', 'B3', 'B2'])
    }
    
    // 중간값 합성 (구름 제거)
    const image = collection.median()
    
    // 시각화 파라미터
    const visParams = {
      min: 0,
      max: 3000,
      gamma: 1.4
    }
    
    // 타일 URL 생성
    const mapId = await image.getMapId(visParams)
    const tileUrl = mapId.urlFormat
    
    return {
      tileUrl,
      mapId: mapId.mapid,
      satellite,
      dateRange: { start: startDate, end: endDate },
      metadata: {
        collection: collection.size(),
        centerPoint: { lat, lng }
      }
    }
    
  } catch (error) {
    console.error('getTileUrl error:', error)
    throw error
  }
}

// 특정 위치의 위성 이미지 가져오기
async function getSatelliteImage(params) {
  const { lat, lng, zoom, date, resolution } = params
  
  try {
    const point = ee.Geometry.Point([lng, lat])
    
    // 해상도에 따른 버퍼 크기 설정
    const bufferSizes = {
      low: 5000,    // 5km
      medium: 2000, // 2km
      high: 1000,   // 1km
      ultra: 500    // 500m
    }
    
    const bufferSize = bufferSizes[resolution] || 1000
    const region = point.buffer(bufferSize)
    
    // Sentinel-2 이미지 선택
    const image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(region)
      .filterDate(date || '2023-01-01', date ? ee.Date(date).advance(1, 'month') : new Date().toISOString())
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
      .first()
      .select(['B4', 'B3', 'B2'])
    
    // 이미지를 URL로 내보내기
    const url = await image.getThumbURL({
      region: region,
      dimensions: resolution === 'ultra' ? '2048x2048' : '1024x1024',
      format: 'png',
      min: 0,
      max: 3000,
      gamma: 1.4
    })
    
    return {
      imageUrl: url,
      metadata: {
        satellite: 'Sentinel-2',
        resolution: '10m',
        date: date || 'latest',
        cloudCover: await image.get('CLOUDY_PIXEL_PERCENTAGE'),
        bounds: region.bounds()
      }
    }
    
  } catch (error) {
    console.error('getSatelliteImage error:', error)
    throw error
  }
}

// 역사적 이미지 가져오기
async function getHistoricalImagery(params) {
  const { lat, lng, startYear, endYear } = params
  
  try {
    const point = ee.Geometry.Point([lng, lat])
    const region = point.buffer(2000)
    
    const images = []
    
    // 연도별로 이미지 수집
    for (let year = startYear; year <= endYear; year++) {
      const yearStart = `${year}-01-01`
      const yearEnd = `${year}-12-31`
      
      // Landsat 컬렉션 선택 (연도에 따라)
      let collection
      if (year >= 2021) {
        collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
      } else if (year >= 2013) {
        collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      } else if (year >= 1999) {
        collection = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
      } else {
        collection = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
      }
      
      const image = collection
        .filterBounds(region)
        .filterDate(yearStart, yearEnd)
        .filter(ee.Filter.lt('CLOUD_COVER', 30))
        .median()
      
      const url = await image.getThumbURL({
        region: region,
        dimensions: '512x512',
        format: 'png'
      })
      
      images.push({
        year,
        url,
        satellite: year >= 2021 ? 'Landsat 9' : year >= 2013 ? 'Landsat 8' : 'Landsat 7/5'
      })
    }
    
    return {
      images,
      location: { lat, lng },
      timeRange: { start: startYear, end: endYear }
    }
    
  } catch (error) {
    console.error('getHistoricalImagery error:', error)
    throw error
  }
}

// 이미지 컬렉션 정보 가져오기
async function getImageCollection(params) {
  const { lat, lng, satellite, days } = params
  
  try {
    const point = ee.Geometry.Point([lng, lat])
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    
    const collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(point)
      .filterDate(startDate.toISOString(), endDate.toISOString())
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 50))
    
    const count = await collection.size()
    const dates = await collection.aggregate_array('system:time_start')
    
    return {
      count,
      dates: dates.map(d => new Date(d).toISOString()),
      satellite: 'Sentinel-2',
      location: { lat, lng },
      period: { start: startDate.toISOString(), end: endDate.toISOString() }
    }
    
  } catch (error) {
    console.error('getImageCollection error:', error)
    throw error
  }
}
*/

// 폴백: Static Maps API 사용
function getFallbackImageUrl(params) {
  const { lat, lng, zoom } = params
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY
  
  if (!apiKey) return null
  
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap'
  const urlParams = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom || 18,
    size: '1024x1024',
    scale: 2,
    maptype: 'satellite',
    key: apiKey
  })
  
  return `${baseUrl}?${urlParams.toString()}`
}