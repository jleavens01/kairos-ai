import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { 
      videoId, 
      projectId,
      productionSheetId,
      frameTime,
      frameTimestamp,
      videoDuration,
      videoModel,
      videoPrompt,
      imageBase64 
    } = JSON.parse(event.body)

    if (!videoId || !projectId || !imageBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // Base64를 Buffer로 변환
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Supabase Admin 클라이언트 생성
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 파일명 생성
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 9)
    const fileName = `${projectId}/video-frames/${timestamp}-${randomId}.jpg`

    // Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('gen-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // 공개 URL 가져오기
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('gen-images')
      .getPublicUrl(fileName)

    // gen_images 테이블에 저장
    const { data: imageRecord, error: dbError } = await supabaseAdmin
      .from('gen_images')
      .insert({
        project_id: projectId,
        production_sheet_id: productionSheetId,
        image_type: 'video-frame',
        element_name: `Video Frame - ${frameTime}s`,
        generation_status: 'completed',
        prompt_used: videoPrompt || '',
        custom_prompt: `Frame captured from video at ${frameTime} seconds`,
        generation_model: 'video-frame-capture',
        result_image_url: publicUrl,
        
        thumbnail_url: publicUrl,
        metadata: {
          source_video_id: videoId,
          source_video_model: videoModel,
          capture_time: frameTime,
          capture_timestamp: frameTimestamp,
          video_duration: videoDuration || 0
        },
        tags: ['video-frame', `${frameTime}s`, videoModel || 'unknown']
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Storage에서 파일 삭제 (롤백)
      await supabaseAdmin.storage
        .from('gen-images')
        .remove([fileName])
      throw dbError
    }

    console.log('Frame saved successfully:', imageRecord.id)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageId: imageRecord.id,
        publicUrl: publicUrl,
        message: '프레임이 이미지 갤러리에 저장되었습니다.'
      })
    }

  } catch (error) {
    console.error('Error saving video frame:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to save video frame'
      })
    }
  }
}