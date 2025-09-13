// 이미지 섬네일 자동 생성 및 최적화
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

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
    const { imageId, videoId, imageUrl, projectId, isVideo } = JSON.parse(event.body)
    
    const resourceId = imageId || videoId
    if (!resourceId || !imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'resourceId and imageUrl are required' })
      }
    }

    console.log('섬네일 생성 시작:', { 
      resourceId, 
      type: isVideo ? 'video' : 'image',
      imageUrl: imageUrl.substring(0, 100) + '...' 
    })

    let finalProjectId = projectId
    let category = 'images'

    if (isVideo) {
      // 비디오 정보를 데이터베이스에서 가져와서 프로젝트ID 확인
      const { data: videoData, error: videoError } = await supabase
        .from('gen_videos')
        .select('project_id')
        .eq('id', videoId)
        .single()

      if (videoError || !videoData) {
        throw new Error(`Failed to fetch video data: ${videoError?.message}`)
      }

      finalProjectId = projectId || videoData.project_id
      category = 'videos' // 비디오 썸네일은 videos 카테고리로
    } else {
      // 이미지 정보를 데이터베이스에서 가져와서 프로젝트ID와 카테고리 확인
      const { data: imageData, error: imageError } = await supabase
        .from('gen_images')
        .select('project_id, image_type')
        .eq('id', imageId)
        .single()

      if (imageError || !imageData) {
        throw new Error(`Failed to fetch image data: ${imageError?.message}`)
      }

      finalProjectId = projectId || imageData.project_id
      category = imageData.image_type || 'images'
    }

    if (!finalProjectId) {
      throw new Error('Project ID is required for thumbnail generation')
    }

    // 1. 원본 이미지 다운로드
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const imageBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(imageBuffer)
    
    console.log(`원본 이미지 크기: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)

    // 2. 섬네일 생성 (WebP 형식, 최적화)
    const thumbnailBuffer = await sharp(buffer)
      .resize(400, 400, { 
        fit: 'cover', 
        position: 'center' 
      })
      .webp({ 
        quality: 85, 
        effort: 6 
      })
      .toBuffer()

    console.log(`섬네일 크기: ${(thumbnailBuffer.length / 1024).toFixed(2)} KB`)

    // 3. Supabase Storage에 업로드 (gen-images 버킷의 구조적 경로)
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 9)
    const fileName = `${finalProjectId}/${category}/thumbnails/${resourceId}_${timestamp}_${randomId}.webp`
    
    console.log(`썸네일 저장 경로: ${fileName}`)
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('gen-images')
      .upload(fileName, thumbnailBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000' // 1년 캐시
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload thumbnail: ${uploadError.message}`)
    }

    // 4. Public URL 생성
    const { data: { publicUrl } } = supabase
      .storage
      .from('gen-images')
      .getPublicUrl(fileName)

    console.log('썸네일 URL:', publicUrl)

    // 5. 데이터베이스 업데이트
    if (isVideo) {
      // 비디오 테이블 업데이트
      const { error: dbError } = await supabase
        .from('gen_videos')
        .update({
          thumbnail_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId)

      if (dbError) {
        console.error('Database update error:', dbError)
        // 이미 업로드된 썸네일 파일 삭제
        await supabase.storage.from('gen-images').remove([fileName])
        throw new Error(`Failed to update database: ${dbError.message}`)
      }
    } else {
      // 이미지 테이블 업데이트
      const { error: dbError } = await supabase
        .from('gen_images')
        .update({
          thumbnail_url: publicUrl,
          thumbnail_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', imageId)

      if (dbError) {
        console.error('Database update error:', dbError)
        // 이미 업로드된 썸네일 파일 삭제
        await supabase.storage.from('gen-images').remove([fileName])
        throw new Error(`Failed to update database: ${dbError.message}`)
      }
    }

    console.log('썸네일 생성 완료:', resourceId, isVideo ? '(video)' : '(image)')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        resourceId,
        resourceType: isVideo ? 'video' : 'image',
        thumbnailUrl: publicUrl,
        originalSize: `${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
        thumbnailSize: `${(thumbnailBuffer.length / 1024).toFixed(2)} KB`,
        compression: `${(((buffer.length - thumbnailBuffer.length) / buffer.length) * 100).toFixed(1)}%`
      })
    }

  } catch (error) {
    console.error('섬네일 생성 오류:', error)
    
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