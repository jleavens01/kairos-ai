// Supabase 클라이언트 import 추가
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    // HeyGen API 키 확인
    const heygenApiKey = process.env.HEYGEN_API_KEY
    if (!heygenApiKey) {
      console.error('HEYGEN_API_KEY is not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'HeyGen API key is not configured' })
      }
    }

    // 요청 데이터 파싱
    let requestData
    try {
      requestData = JSON.parse(event.body)
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      }
    }

    // 필수 필드 검증
    if (!requestData.video_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'video_id is required' })
      }
    }

    // HeyGen API 호출 - 일반 비디오 생성 상태 확인
    console.log('Checking HeyGen video status for video ID:', requestData.video_id)

    const heygenResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${requestData.video_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${heygenApiKey}`,
        'Accept': 'application/json'
      }
    })

    const responseText = await heygenResponse.text()
    console.log('HeyGen video status API response status:', heygenResponse.status)
    console.log('HeyGen video status API response text:', responseText)

    let heygenResult
    try {
      heygenResult = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse HeyGen video status API response:', parseError)
      
      // HTML 응답인 경우 404나 다른 HTTP 오류로 간주
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        return {
          statusCode: heygenResponse.status,
          headers,
          body: JSON.stringify({
            error: `HeyGen API endpoint not found (${heygenResponse.status})`,
            message: 'API endpoint may be incorrect or video is not ready yet',
            details: `HTTP ${heygenResponse.status}`,
            suggestion: 'The video generation may still be in progress'
          })
        }
      }
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response format from HeyGen API',
          details: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
        })
      }
    }

    if (!heygenResponse.ok) {
      console.error('HeyGen video status API error:', heygenResult)
      return {
        statusCode: heygenResponse.status,
        headers,
        body: JSON.stringify({
          error: 'HeyGen video status API request failed',
          message: heygenResult.message || heygenResult.error || 'Unknown error',
          details: heygenResult
        })
      }
    }

    // HeyGen API 응답 구조에 따라 상태 매핑
    const videoData = heygenResult.data || heygenResult
    let status = 'processing'
    let videoUrl = null
    let errorMessage = null
    let progress = 50

    console.log('HeyGen status response data:', videoData)

    // HeyGen 비디오 상태 매핑
    if (videoData.status) {
      switch (videoData.status.toLowerCase()) {
        case 'completed':
        case 'success':
        case 'done':
          status = 'completed'
          videoUrl = videoData.video_url || videoData.url || null
          progress = 100
          break
        case 'processing':
        case 'pending':
        case 'in_progress':
        case 'running':
          status = 'processing'
          break
        case 'failed':
        case 'error':
          status = 'failed'
          errorMessage = videoData.error_message || videoData.message || 'Video generation failed'
          break
        default:
          status = 'processing'
      }
    } else {
      // 상태 정보가 없으면 기본적으로 처리 중으로 간주
      console.log('No status found in response, defaulting to processing')
      status = 'processing'
    }

    // 데이터베이스 업데이트 시도
    let dbUpdateResult = null
    try {
      const updateData = {
        status,
        progress: videoData.progress || progress,
        updated_at: new Date().toISOString()
      }

      // 완료 상태인 경우 추가 정보 업데이트
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        updateData.video_url = videoUrl
        updateData.thumbnail_url = videoData.thumbnail_url || null
        updateData.gif_url = videoData.gif_url || null
        updateData.caption_url = videoData.caption_url || null
        updateData.duration = videoData.duration || null
        updateData.heygen_response = videoData
      }

      // 실패 상태인 경우 오류 메시지 저장
      if (status === 'failed') {
        updateData.error_message = errorMessage
      }

      const { data, error } = await supabase
        .from('gen_heygen_videos')
        .update(updateData)
        .eq('heygen_video_id', requestData.video_id)
        .select()

      if (error) {
        console.error('Database update error (non-fatal):', error)
      } else if (data && data.length > 0) {
        dbUpdateResult = data[0]
        console.log('HeyGen video status updated in database:', requestData.video_id)
      } else {
        console.log('No matching record found in database for video_id:', requestData.video_id)
      }
    } catch (dbError) {
      console.error('Database update error (non-fatal):', dbError)
      // DB 업데이트 실패해도 API 응답은 성공으로 처리
    }

    // 성공 응답
    const response = {
      success: true,
      video_id: requestData.video_id,
      status,
      progress: videoData.progress || progress,
      video_url: videoUrl,
      error_message: errorMessage,
      estimated_completion: videoData.estimated_completion || null,
      raw_response: videoData,
      database_updated: !!dbUpdateResult,
      database_id: dbUpdateResult?.id || null
    }

    console.log('HeyGen video status check successful:', response)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('HeyGen video status check error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}