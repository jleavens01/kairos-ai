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

    const results = []
    
    for (const sheet of sheets) {
      const prompt = `
다음 씬 스크립트를 분석하여 이 씬을 시각화하는데 필요한 자료나 레퍼런스를 검색하기 위한 키워드를 추출해주세요.

씬 번호: ${sheet.scene_number}
씬 스크립트: ${sheet.original_script_text || '스크립트 없음'}

분석 기준:
1. 먼저 이 씬에서 시각적 자료가 필요한지 판단해주세요
2. 필요하다면 구체적인 검색 키워드를 추출해주세요
3. 키워드는 다음을 고려해주세요:
   - 장소/배경 (예: 도시 야경, 숲속, 사무실)
   - 시대/스타일 (예: 1950년대, 미래도시, 중세)
   - 오브젝트 (예: 빈티지 자동차, 우주선, 고대 유물)
   - 분위기/톤 (예: 어두운, 몽환적인, 활기찬)
   - 특정 문화/지역 (예: 일본 전통, 북유럽, 사이버펑크)

응답 형식 (JSON):
{
  "needs_reference": true/false,
  "reason": "자료가 필요한/불필요한 이유",
  "keywords": ["키워드1", "키워드2", ...] // 최대 5개, needs_reference가 false면 빈 배열
}

예시:
- "회사 사무실에서 회의하는 장면" → ["modern office", "business meeting", "conference room"]
- "우주선 내부" → ["spaceship interior", "sci-fi corridor", "futuristic control panel"]
- "단순 대화 장면" → needs_reference: false, keywords: []
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
              temperature: 0.3,
              maxOutputTokens: 500,
              responseMimeType: "application/json"
            }
          })
        })

        if (!response.ok) {
          console.error('Gemini API error for sheet', sheet.id)
          results.push({ 
            id: sheet.id, 
            keywords: [],
            error: 'AI 분석 실패'
          })
          continue
        }

        const data = await response.json()
        const aiResponse = JSON.parse(data.candidates[0].content.parts[0].text)
        
        // 키워드가 있는 경우만 저장
        const keywords = aiResponse.needs_reference ? (aiResponse.keywords || []) : []
        
        // DB에 키워드 저장
        const { error: updateError } = await supabase
          .from('production_sheets')
          .update({ reference_keywords: keywords })
          .eq('id', sheet.id)

        if (updateError) throw updateError

        results.push({
          id: sheet.id,
          scene_number: sheet.scene_number,
          needs_reference: aiResponse.needs_reference,
          reason: aiResponse.reason,
          keywords: keywords
        })

      } catch (aiError) {
        console.error('Error processing sheet:', sheet.id, aiError)
        results.push({ 
          id: sheet.id,
          scene_number: sheet.scene_number,
          keywords: [],
          error: '키워드 추출 실패'
        })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: results,
        message: `${results.length}개 씬의 자료 키워드를 추출했습니다`
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