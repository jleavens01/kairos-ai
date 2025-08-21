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

    // 씬을 배치로 나누어 병렬 처리 (3개씩으로 줄임)
    const BATCH_SIZE = 3
    const MAX_SCENES = 30  // 최대 30개 씬만 처리 (타임아웃 방지)
    
    // 너무 많은 씬이면 일부만 처리
    const scenesToProcess = sheets.slice(0, MAX_SCENES)
    
    const batches = []
    for (let i = 0; i < scenesToProcess.length; i += BATCH_SIZE) {
      batches.push(scenesToProcess.slice(i, i + BATCH_SIZE))
    }
    
    console.log(`Processing ${scenesToProcess.length} of ${sheets.length} scenes in ${batches.length} batches`)
    
    if (sheets.length > MAX_SCENES) {
      console.log(`Note: Processing first ${MAX_SCENES} scenes to avoid timeout`);
    }
    
    const results = []
    
    // 각 배치를 순차적으로 처리하되, 배치 내에서는 병렬 처리
    for (const batch of batches) {
      const batchPromises = batch.map(async (sheet) => {
        // 스크립트 길이 제한 (너무 긴 스크립트는 줄임)
        let scriptText = sheet.original_script_text || '스크립트 없음'
        if (scriptText.length > 300) {
          scriptText = scriptText.substring(0, 300) + '...'
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
                maxOutputTokens: 100,  // 간단한 JSON 응답이므로 줄임
                responseMimeType: "application/json"
              }
            })
          })

          if (!response.ok) {
            console.error('Gemini API error for sheet', sheet.id, response.status)
            return { 
              id: sheet.id,
              scene_number: sheet.scene_number,
              keywords: [],
              error: `AI 분석 실패 (${response.status})`
            }
          }

          const data = await response.json()
          
          // 응답 구조 안전하게 파싱
          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Invalid Gemini response structure:', data)
            return { 
              id: sheet.id,
              scene_number: sheet.scene_number,
              keywords: [],
              error: 'AI 응답 구조 오류'
            }
          }
          
          // parts가 없는 경우 체크 (MAX_TOKENS 에러)
          if (!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            console.error('No parts in response (MAX_TOKENS error):', data.candidates[0])
            return { 
              id: sheet.id,
              scene_number: sheet.scene_number,
              keywords: [],
              error: 'AI 응답 불완전 (토큰 제한)'
            }
          }
          
          let aiResponse
          try {
            aiResponse = JSON.parse(data.candidates[0].content.parts[0].text)
          } catch (parseError) {
            console.error('Failed to parse AI response:', data.candidates[0].content.parts[0].text)
            return { 
              id: sheet.id,
              scene_number: sheet.scene_number,
              keywords: [],
              error: 'AI 응답 파싱 실패'
            }
          }
          
          // 키워드가 있는 경우만 저장 (needs 또는 needs_reference 모두 체크)
          const needsRef = aiResponse.needs || aiResponse.needs_reference
          const keywords = needsRef ? (aiResponse.keywords || []).slice(0, 2) : []  // 최대 2개로 제한
          
          // DB에 키워드 저장
          const { error: updateError } = await supabase
            .from('production_sheets')
            .update({ reference_keywords: keywords })
            .eq('id', sheet.id)

          if (updateError) {
            console.error('DB update error:', updateError)
            return {
              id: sheet.id,
              scene_number: sheet.scene_number,
              keywords: [],
              error: 'DB 업데이트 실패'
            }
          }

          return {
            id: sheet.id,
            scene_number: sheet.scene_number,
            needs_reference: needsRef,
            keywords: keywords
          }

        } catch (aiError) {
          console.error('Error processing sheet:', sheet.id, aiError)
          return { 
            id: sheet.id,
            scene_number: sheet.scene_number,
            keywords: [],
            error: '키워드 추출 실패: ' + aiError.message
          }
        }
      })
      
      // 배치 내 모든 씬을 병렬로 처리
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // 배치 간 짧은 지연 (API rate limiting 방지)
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))  // 지연 시간 줄임
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: results,
        message: sheets.length > MAX_SCENES 
          ? `${results.length}개 씬의 자료 키워드를 추출했습니다 (전체 ${sheets.length}개 중)`
          : `${results.length}개 씬의 자료 키워드를 추출했습니다`,
        totalScenes: sheets.length,
        processedScenes: results.length
      })
    }

  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || '키워드 추출 중 오류가 발생했습니다'
      })
    }
  }
}