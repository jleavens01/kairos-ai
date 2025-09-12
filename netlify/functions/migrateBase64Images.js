// Base64 이미지를 Supabase Storage로 마이그레이션
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
    // 1. Base64 이미지들 조회
    const { data: base64Images, error: fetchError } = await supabase
      .from('gen_images')
      .select('id, result_image_url, project_id, element_name, created_at')
      .like('result_image_url', 'data:image%')
      .order('created_at', { ascending: false })
      .limit(20) // 한 번에 20개만 처리

    if (fetchError) {
      throw new Error(`Failed to fetch base64 images: ${fetchError.message}`)
    }

    console.log(`Base64 마이그레이션 대상: ${base64Images?.length || 0}개`)

    if (!base64Images || base64Images.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No base64 images to migrate',
          migrated: 0
        })
      }
    }

    // 2. 각 Base64 이미지를 Storage로 마이그레이션
    const results = []
    
    for (const image of base64Images) {
      try {
        console.log(`마이그레이션 시작: ${image.id}`)
        
        // Base64 데이터 파싱
        const base64Data = image.result_image_url.replace(/^data:image\/\w+;base64,/, '')
        const mimeMatch = image.result_image_url.match(/data:image\/(\w+);base64,/)
        const mimeType = mimeMatch ? mimeMatch[1] : 'png'
        
        // Buffer로 변환
        const buffer = Buffer.from(base64Data, 'base64')
        const fileSizeKB = (buffer.length / 1024).toFixed(2)
        
        console.log(`이미지 크기: ${fileSizeKB} KB, 타입: ${mimeType}`)
        
        // 파일명 생성
        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2, 9)
        const fileName = `migrated/${image.project_id}/${timestamp}_${randomId}.${mimeType}`
        
        // Supabase Storage에 업로드
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('ref-images')
          .upload(fileName, buffer, {
            contentType: `image/${mimeType}`,
            cacheControl: '31536000' // 1년 캐시
          })

        if (uploadError) {
          console.error('Storage upload error details:', {
            error: uploadError,
            fileName: fileName,
            bucketName: 'gen-images',
            supabaseUrl: process.env.VITE_SUPABASE_URL ? 'SET' : 'MISSING',
            serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'
          })
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        // Public URL 생성
        const { data: { publicUrl } } = supabase
          .storage
          .from('gen-images')
          .getPublicUrl(fileName)

        // 데이터베이스 업데이트
        const { error: updateError } = await supabase
          .from('gen_images')
          .update({
            result_image_url: publicUrl,
            updated_at: new Date().toISOString(),
            metadata: {
              ...image.metadata,
              migrated_from_base64: true,
              original_size_kb: fileSizeKB,
              migrated_at: new Date().toISOString()
            }
          })
          .eq('id', image.id)

        if (updateError) {
          // 업로드된 파일 삭제 (롤백)
          await supabase.storage.from('gen-images').remove([fileName])
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        results.push({
          imageId: image.id,
          success: true,
          originalSize: `${fileSizeKB} KB`,
          newUrl: publicUrl,
          saved: `${((base64Data.length - buffer.length) / base64Data.length * 100).toFixed(1)}%`
        })

        console.log(`✅ 마이그레이션 완료: ${image.id} (${fileSizeKB} KB → Storage)`)

        // 섬네일 자동 생성 요청
        try {
          const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app'
          await fetch(`${baseUrl}/.netlify/functions/generateThumbnail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageId: image.id,
              imageUrl: publicUrl,
              projectId: image.project_id
            })
          })
          console.log(`🖼️ 섬네일 생성 요청: ${image.id}`)
        } catch (thumbnailError) {
          console.warn(`섬네일 생성 실패: ${thumbnailError.message}`)
        }

        // 처리 간격 (부하 방지)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        results.push({
          imageId: image.id,
          success: false,
          error: error.message
        })
        console.error(`❌ 마이그레이션 실패: ${image.id} - ${error.message}`)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`마이그레이션 완료: 성공 ${successCount}개, 실패 ${failCount}개`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        total: base64Images.length,
        migrated: successCount,
        failed: failCount,
        results: results,
        message: `Migrated ${successCount} base64 images to storage`
      })
    }

  } catch (error) {
    console.error('Base64 마이그레이션 오류:', error)
    
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