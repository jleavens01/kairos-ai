// 기존 이미지들의 섬네일을 배치로 생성
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    // 1. 섬네일이 없는 이미지들 조회 (최근 50개) - 프로젝트ID와 카테고리 정보 포함
    const { data: images, error: fetchError } = await supabase
      .from('gen_images')
      .select('id, result_image_url, storage_image_url, project_id, image_type, created_at')
      .is('thumbnail_url', null)
      .or('result_image_url.not.is.null,storage_image_url.not.is.null')
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`)
    }

    console.log(`섬네일 생성 대상: ${images?.length || 0}개`)

    if (!images || images.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No images need thumbnails',
          processed: 0
        })
      }
    }

    // 2. 각 이미지에 대해 섬네일 생성 요청
    const results = []
    const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app'
    
    for (const image of images.slice(0, 10)) { // 한 번에 10개만 처리
      try {
        console.log(`섬네일 생성 시작: ${image.id}`)
        
        const response = await fetch(`${baseUrl}/.netlify/functions/generateThumbnail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageId: image.id,
            imageUrl: image.result_image_url || image.storage_image_url,
            projectId: image.project_id
          })
        })

        if (response.ok) {
          const result = await response.json()
          results.push({
            imageId: image.id,
            success: true,
            thumbnailUrl: result.thumbnailUrl,
            compression: result.compression
          })
          console.log(`✅ 섬네일 생성 완료: ${image.id} (${result.compression} 압축)`)
        } else {
          const error = await response.json()
          results.push({
            imageId: image.id,
            success: false,
            error: error.error || 'Unknown error'
          })
          console.error(`❌ 섬네일 생성 실패: ${image.id} - ${error.error}`)
        }

        // 요청 간 딜레이 (API 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        results.push({
          imageId: image.id,
          success: false,
          error: error.message
        })
        console.error(`❌ 섬네일 생성 오류: ${image.id} - ${error.message}`)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`배치 완료: 성공 ${successCount}개, 실패 ${failCount}개`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total: images.length,
        processed: results.length,
        successful: successCount,
        failed: failCount,
        results: results,
        message: `Processed ${results.length} images: ${successCount} successful, ${failCount} failed`
      })
    }

  } catch (error) {
    console.error('배치 섬네일 생성 오류:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}