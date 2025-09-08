// HeyGen 비디오 데이터베이스 저장 함수
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

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const requestData = JSON.parse(event.body)

    // 필수 필드 검증
    if (!requestData.user_id || !requestData.heygen_video_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'user_id and heygen_video_id are required' 
        })
      }
    }

    console.log('Saving HeyGen video to database:', requestData.heygen_video_id)

    // 데이터베이스 저장용 객체 구성
    const videoData = {
      user_id: requestData.user_id,
      heygen_video_id: requestData.heygen_video_id,
      callback_id: requestData.callback_id,
      
      // 아바타 설정
      avatar_id: requestData.avatar_id,
      avatar_style: requestData.avatar_style || 'normal',
      avatar_scale: requestData.avatar_scale || 1.0,
      
      // 음성 설정
      voice_id: requestData.voice_id,
      voice_type: requestData.voice_type || 'text',
      input_text: requestData.input_text,
      voice_speed: requestData.voice_speed || 1.0,
      voice_pitch: requestData.voice_pitch || 0,
      voice_emotion: requestData.voice_emotion,
      voice_locale: requestData.voice_locale,
      
      // 비디오 설정
      title: requestData.title,
      dimension_width: requestData.dimension_width || 1280,
      dimension_height: requestData.dimension_height || 720,
      has_caption: requestData.has_caption || false,
      
      // 배경 설정
      background_type: requestData.background_type || 'color',
      background_value: requestData.background_value || '#f6f6fc',
      
      // 초기 상태
      status: 'processing',
      progress: 0,
      
      // 메타데이터
      generation_params: requestData.generation_params || {},
      
      // 타임스탬프
      created_at: new Date().toISOString()
    }

    // Supabase에 저장
    const { data, error } = await supabase
      .from('gen_heygen_videos')
      .insert([videoData])
      .select()
      .single()

    if (error) {
      console.error('Database save error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to save to database',
          details: error.message
        })
      }
    }

    console.log('HeyGen video saved successfully:', data.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        id: data.id,
        heygen_video_id: data.heygen_video_id,
        message: 'HeyGen video saved to database successfully'
      })
    }

  } catch (error) {
    console.error('Save HeyGen video error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    }
  }
}

// HeyGen 비디오 상태 업데이트 함수
export async function updateHeyGenVideoStatus(heygenVideoId, statusData) {
  try {
    const updateData = {
      updated_at: new Date().toISOString()
    }

    // 상태 정보 업데이트
    if (statusData.status) {
      updateData.status = statusData.status
      if (statusData.status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (statusData.progress !== undefined) {
      updateData.progress = statusData.progress
    }

    if (statusData.error_message) {
      updateData.error_message = statusData.error_message
    }

    // URL 정보 업데이트
    if (statusData.video_url) {
      updateData.video_url = statusData.video_url
    }

    if (statusData.thumbnail_url) {
      updateData.thumbnail_url = statusData.thumbnail_url
    }

    if (statusData.gif_url) {
      updateData.gif_url = statusData.gif_url
    }

    if (statusData.caption_url) {
      updateData.caption_url = statusData.caption_url
    }

    // 파일 정보 업데이트
    if (statusData.duration) {
      updateData.duration = statusData.duration
    }

    // HeyGen 응답 전체 저장
    if (statusData.heygen_response) {
      updateData.heygen_response = statusData.heygen_response
    }

    const { data, error } = await supabase
      .from('gen_heygen_videos')
      .update(updateData)
      .eq('heygen_video_id', heygenVideoId)
      .select()

    if (error) {
      console.error('Failed to update HeyGen video status:', error)
      return { success: false, error: error.message }
    }

    console.log('HeyGen video status updated:', heygenVideoId)
    return { success: true, data }

  } catch (error) {
    console.error('Update HeyGen video status error:', error)
    return { success: false, error: error.message }
  }
}