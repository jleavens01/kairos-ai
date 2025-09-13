// 비디오 썸네일 일괄 생성 함수
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // 1. 썸네일이 없는 비디오들 조회 (최근 50개)
    const { data: videos, error: fetchError } = await supabase
      .from('gen_videos')
      .select('id, result_video_url, storage_video_url, reference_image_url, project_id, created_at')
      .is('thumbnail_url', null)
      .not('reference_image_url', 'is', null)  // 참조 이미지가 있는 것만
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) {
      throw new Error(`Failed to fetch videos: ${fetchError.message}`)
    }

    console.log(`비디오 썸네일 생성 대상: ${videos?.length || 0}개`)

    if (!videos || videos.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No videos need thumbnails',
          processed: 0
        })
      }
    }

    // 2. 각 비디오에 대해 썸네일 생성 요청 (reference_image_url 사용)
    const results = []
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app'
    
    for (const video of videos.slice(0, 10)) { // 한 번에 10개만 처리
      try {
        console.log(`비디오 썸네일 생성 시작: ${video.id}`)
        
        const response = await fetch(`${baseUrl}/.netlify/functions/generateThumbnail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            videoId: video.id,  // videoId로 전달
            imageUrl: video.reference_image_url,  // 참조 이미지 사용
            projectId: video.project_id,
            isVideo: true  // 비디오임을 표시
          })
        })

        const result = await response.json()
        
        if (result.success) {
          console.log(`✅ 비디오 ${video.id} 썸네일 생성 성공`)
          results.push({ id: video.id, success: true })
        } else {
          console.error(`❌ 비디오 ${video.id} 썸네일 생성 실패:`, result.error)
          results.push({ id: video.id, success: false, error: result.error })
        }
        
        // API 호출 간격 두기 (1초)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`비디오 ${video.id} 처리 중 오류:`, error)
        results.push({ id: video.id, success: false, error: error.message })
      }
    }

    // 3. 결과 반환
    const successCount = results.filter(r => r.success).length
    console.log(`비디오 썸네일 생성 완료: ${successCount}/${results.length}개 성공`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Processed ${successCount} videos`,
        processed: successCount,
        total: results.length,
        results
      })
    }

  } catch (error) {
    console.error('Batch video thumbnail generation error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}