// 키워드 추출 백그라운드 처리 (웹훅 엔드포인트)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { jobId, projectId, sheetIds } = JSON.parse(event.body)
    
    if (!jobId || !projectId || !sheetIds) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Realtime 브로드캐스트로 클라이언트에 알림
    await supabase
      .channel('keyword-extraction')
      .send({
        type: 'broadcast',
        event: 'extraction-completed',
        payload: {
          projectId,
          jobId,
          status: 'completed',
          processedSheets: results.length
        }
      })

    console.log(`Job ${jobId} completed: ${results.length} scenes processed`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        jobId,
        processedSheets: results.length
      })
    }

  } catch (error) {
    console.error('Background processing error:', error)
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}