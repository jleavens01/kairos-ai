// 썸네일 배치 생성 디버깅
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
    console.log('🔍 디버깅 시작...')

    // 1. 모든 이미지 개수 확인
    const { count: totalCount } = await supabase
      .from('gen_images')
      .select('*', { count: 'exact', head: true })

    console.log(`총 이미지 개수: ${totalCount}`)

    // 2. completed 상태 이미지 개수
    const { count: completedCount } = await supabase
      .from('gen_images')
      .select('*', { count: 'exact', head: true })
      .eq('generation_status', 'completed')

    console.log(`completed 상태 이미지: ${completedCount}`)

    // 3. 썸네일이 null인 이미지 개수
    const { count: nullThumbnailCount } = await supabase
      .from('gen_images')
      .select('*', { count: 'exact', head: true })
      .is('thumbnail_url', null)

    console.log(`thumbnail_url이 null인 이미지: ${nullThumbnailCount}`)

    // 4. 조건에 맞는 이미지들 조회
    const { data: targetImages, error: fetchError } = await supabase
      .from('gen_images')
      .select('id, result_image_url, storage_image_url, project_id, image_type, created_at, generation_status, thumbnail_url')
      .is('thumbnail_url', null)
      .or('result_image_url.not.is.null,storage_image_url.not.is.null')
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10)

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`)
    }

    console.log(`조건에 맞는 이미지: ${targetImages?.length || 0}개`)

    // 5. 최근 10개 이미지 상태 확인
    const { data: recentImages } = await supabase
      .from('gen_images')
      .select('id, generation_status, thumbnail_url, result_image_url, storage_image_url')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('최근 10개 이미지 상태:')
    recentImages?.forEach(img => {
      console.log(`- ID: ${img.id}, Status: ${img.generation_status}, Thumbnail: ${img.thumbnail_url ? 'exists' : 'null'}, Image: ${img.result_image_url || img.storage_image_url ? 'exists' : 'null'}`)
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        debug: {
          totalCount,
          completedCount,
          nullThumbnailCount,
          targetImagesCount: targetImages?.length || 0,
          recentImages: recentImages?.map(img => ({
            id: img.id,
            status: img.generation_status,
            hasThumbnail: !!img.thumbnail_url,
            hasImage: !!(img.result_image_url || img.storage_image_url)
          }))
        }
      })
    }

  } catch (error) {
    console.error('디버깅 오류:', error)

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