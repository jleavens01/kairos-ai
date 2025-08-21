// 자료 키워드 추출 (비동기 웹훅 방식)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const handler = async (event) => {
  // CORS 처리
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
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
    const { sheetIds, projectId } = JSON.parse(event.body)
    
    if (!sheetIds || !Array.isArray(sheetIds) || sheetIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '처리할 씬이 선택되지 않았습니다' })
      }
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 작업 ID 생성
    const jobId = `keyword_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // 작업 상태를 DB에 저장 (projects 테이블의 metadata에 저장)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('metadata')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    const metadata = project.metadata || {}
    metadata.keyword_extraction_jobs = metadata.keyword_extraction_jobs || {}
    metadata.keyword_extraction_jobs[jobId] = {
      status: 'processing',
      sheetIds: sheetIds,
      totalSheets: sheetIds.length,
      processedSheets: 0,
      startedAt: new Date().toISOString()
    }

    await supabase
      .from('projects')
      .update({ metadata })
      .eq('id', projectId)

    // 백그라운드 처리를 위한 웹훅 URL
    const isDevelopment = process.env.CONTEXT === 'dev' || 
                         process.env.NETLIFY_DEV === 'true' ||
                         (process.env.URL && process.env.URL.includes('localhost'))

    if (!isDevelopment) {
      // 프로덕션: 웹훅 호출로 백그라운드 처리
      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai.netlify.app'
      const webhookUrl = `${baseUrl}/.netlify/functions/processKeywordExtraction`
      
      // 비동기로 웹훅 호출 (응답 기다리지 않음)
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          projectId,
          sheetIds
        })
      }).catch(err => console.error('Webhook call failed:', err))
    } else {
      // 개발 환경: 직접 처리 함수 호출
      // 별도의 처리 함수를 비동기로 실행
      processKeywordsInBackground(jobId, projectId, sheetIds, supabase)
        .catch(err => console.error('Background processing failed:', err))
    }

    // 즉시 응답 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        jobId: jobId,
        message: `${sheetIds.length}개 씬의 키워드 추출이 시작되었습니다. 백그라운드에서 처리됩니다.`,
        status: 'processing'
      })
    }

  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || '키워드 추출 시작 중 오류가 발생했습니다'
      })
    }
  }
}

// 백그라운드 처리 함수
async function processKeywordsInBackground(jobId, projectId, sheetIds, supabase) {
  try {
    // 선택된 씬들의 정보 가져오기
    const { data: sheets, error: fetchError } = await supabase
      .from('production_sheets')
      .select('id, scene_number, original_script_text')
      .in('id', sheetIds)
      .order('scene_number')

    if (fetchError) throw fetchError

    // Gemini API로 각 씬의 자료 키워드 추출
    const GEMINI_API_KEY = process.env.GENERATIVE_LANGUAGE_API_KEY
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const BATCH_SIZE = 5
    const results = []
    let processedCount = 0

    // 배치 처리
    for (let i = 0; i < sheets.length; i += BATCH_SIZE) {
      const batch = sheets.slice(i, i + BATCH_SIZE)
      
      const batchPromises = batch.map(async (sheet) => {
        let scriptText = sheet.original_script_text || '스크립트 없음'
        if (scriptText.length > 400) {
          scriptText = scriptText.substring(0, 400) + '...'
        }
        
        const prompt = `
씬 ${sheet.scene_number}: ${scriptText}

위 씬의 시각 자료가 필요한지 판단하고, 필요하면 검색 키워드 2개를 추출하세요.
키워드는 영어로, 구체적이고 검색 가능한 형태로 작성하세요.

JSON 형식으로만 응답:
{"needs":true/false,"keywords":["키워드1","키워드2"]}

자료 불필요시: {"needs":false,"keywords":[]}
`

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 100,
                responseMimeType: "application/json"
              }
            })
          })

          if (!response.ok) {
            return { id: sheet.id, keywords: [], error: 'API 오류' }
          }

          const data = await response.json()
          
          if (!data.candidates?.[0]?.content?.parts?.[0]) {
            return { id: sheet.id, keywords: [], error: '응답 형식 오류' }
          }
          
          const aiResponse = JSON.parse(data.candidates[0].content.parts[0].text)
          const keywords = aiResponse.needs ? (aiResponse.keywords || []).slice(0, 2) : []
          
          // DB에 키워드 저장
          await supabase
            .from('production_sheets')
            .update({ reference_keywords: keywords })
            .eq('id', sheet.id)

          return { id: sheet.id, scene_number: sheet.scene_number, keywords }

        } catch (error) {
          console.error('Error processing sheet:', sheet.id, error)
          return { id: sheet.id, keywords: [], error: error.message }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      processedCount += batch.length

      // 진행 상황 업데이트
      const { data: project } = await supabase
        .from('projects')
        .select('metadata')
        .eq('id', projectId)
        .single()

      const metadata = project.metadata || {}
      if (metadata.keyword_extraction_jobs?.[jobId]) {
        metadata.keyword_extraction_jobs[jobId].processedSheets = processedCount
        metadata.keyword_extraction_jobs[jobId].lastUpdatedAt = new Date().toISOString()
        
        await supabase
          .from('projects')
          .update({ metadata })
          .eq('id', projectId)
      }

      // 배치 간 지연
      if (i + BATCH_SIZE < sheets.length) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    // 작업 완료 상태 업데이트
    const { data: finalProject } = await supabase
      .from('projects')
      .select('metadata')
      .eq('id', projectId)
      .single()

    const finalMetadata = finalProject.metadata || {}
    if (finalMetadata.keyword_extraction_jobs?.[jobId]) {
      finalMetadata.keyword_extraction_jobs[jobId].status = 'completed'
      finalMetadata.keyword_extraction_jobs[jobId].completedAt = new Date().toISOString()
      finalMetadata.keyword_extraction_jobs[jobId].results = results
      
      await supabase
        .from('projects')
        .update({ metadata: finalMetadata })
        .eq('id', projectId)
    }

    console.log(`Job ${jobId} completed: ${results.length} scenes processed`)

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error)
    
    // 실패 상태 업데이트
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('metadata')
        .eq('id', projectId)
        .single()

      const metadata = project.metadata || {}
      if (metadata.keyword_extraction_jobs?.[jobId]) {
        metadata.keyword_extraction_jobs[jobId].status = 'failed'
        metadata.keyword_extraction_jobs[jobId].error = error.message
        metadata.keyword_extraction_jobs[jobId].failedAt = new Date().toISOString()
        
        await supabase
          .from('projects')
          .update({ metadata })
          .eq('id', projectId)
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError)
    }
  }
}