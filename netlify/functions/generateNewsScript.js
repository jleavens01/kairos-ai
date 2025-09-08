import * as cheerio from 'cheerio';

export const handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Method Not Allowed' 
      })
    }
  }

  try {
    // 요청 파라미터 파싱
    const { query, days = 7, maxResults = 10, scriptType = 'summary' } = JSON.parse(event.body || '{}')

    if (!query?.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '검색 키워드가 필요합니다.'
        })
      }
    }

    console.log(`뉴스 스크립트 생성 시작: "${query}", ${days}일, 최대 ${maxResults}개`)

    // 네이버 뉴스 검색
    const searchQuery = encodeURIComponent(query)
    const naverNewsUrl = `https://search.naver.com/search.naver?where=news&query=${searchQuery}&sort=1&start=1`

    console.log('네이버 뉴스 검색:', naverNewsUrl)

    const response = await fetch(naverNewsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`네이버 뉴스 검색 실패: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const newsResults = []

    // 뉴스 아이템 파싱
    $('.news_area').each((index, element) => {
      if (index >= parseInt(maxResults)) return false

      try {
        const $el = $(element)
        
        // 제목과 링크
        const titleLink = $el.find('.news_tit')
        const title = titleLink.text().trim()
        const url = titleLink.attr('href')
        
        // 요약
        const summary = $el.find('.news_dsc').text().trim() || 
                       $el.find('.api_txt_lines').text().trim() ||
                       '요약 없음'
        
        // 출처
        const source = $el.find('.press').text().trim() || '알 수 없는 출처'
        
        // 날짜 파싱
        const info = $el.find('.info_group').text().trim()
        let published_at = new Date().toISOString()
        const timeMatch = info.match(/(\d{1,2})시간 전|(\d{1,2})분 전|(\d{4}\.\d{2}\.\d{2})/)
        
        if (timeMatch) {
          if (timeMatch[1]) { // 시간 전
            const hoursAgo = parseInt(timeMatch[1])
            const date = new Date()
            date.setHours(date.getHours() - hoursAgo)
            published_at = date.toISOString()
          } else if (timeMatch[2]) { // 분 전
            const minutesAgo = parseInt(timeMatch[2])
            const date = new Date()
            date.setMinutes(date.getMinutes() - minutesAgo)
            published_at = date.toISOString()
          } else if (timeMatch[3]) { // 날짜 형식
            const dateStr = timeMatch[3].replace(/\./g, '-')
            published_at = new Date(dateStr).toISOString()
          }
        }

        if (title && url) {
          newsResults.push({
            title: title,
            summary: summary.substring(0, 300) + (summary.length > 300 ? '...' : ''),
            url: url,
            published_at: published_at,
            source: source
          })
        }
      } catch (itemError) {
        console.log('뉴스 아이템 파싱 오류:', itemError.message)
      }
    })

    console.log(`수집된 뉴스: ${newsResults.length}개`)

    // 스크립트 생성
    const script = generateScript(newsResults, query, scriptType)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        query: query,
        newsCount: newsResults.length,
        script: script,
        news: newsResults
      })
    }

  } catch (error) {
    console.error('뉴스 스크립트 생성 실패:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '뉴스 스크립트 생성 중 오류가 발생했습니다.'
      })
    }
  }
}

// 스크립트 생성 함수
function generateScript(newsResults, query, scriptType) {
  if (!newsResults || newsResults.length === 0) {
    return `${query}에 대한 최신 뉴스를 찾을 수 없습니다.`
  }

  const today = new Date().toLocaleDateString('ko-KR')
  
  let script = ''

  if (scriptType === 'summary') {
    // 요약형 스크립트
    script = `# ${query} 관련 최신 뉴스 (${today})\n\n`
    script += `안녕하세요. 오늘은 ${query}와 관련된 최신 뉴스를 정리해서 전해드리겠습니다.\n\n`

    newsResults.forEach((news, index) => {
      const newsDate = new Date(news.published_at).toLocaleDateString('ko-KR')
      script += `## ${index + 1}. ${news.title}\n`
      script += `**출처:** ${news.source} | **날짜:** ${newsDate}\n\n`
      script += `${news.summary}\n\n`
      script += `자세한 내용은 다음 링크에서 확인하실 수 있습니다: ${news.url}\n\n`
      script += `---\n\n`
    })

    script += `이상으로 ${query} 관련 최신 뉴스를 정리해 드렸습니다. 감사합니다.`

  } else if (scriptType === 'video') {
    // 비디오 스크립트
    script = `# ${query} 관련 뉴스 비디오 스크립트 (${today})\n\n`
    script += `## 오프닝\n`
    script += `안녕하세요! 오늘은 ${query}와 관련된 주요 뉴스들을 살펴보겠습니다.\n\n`

    newsResults.slice(0, 5).forEach((news, index) => {
      script += `## 뉴스 ${index + 1}: ${news.title}\n`
      script += `${news.summary}\n\n`
      script += `[화면: 관련 이미지 또는 그래픽]\n`
      script += `이 소식은 ${news.source}에서 보도되었습니다.\n\n`
    })

    script += `## 마무리\n`
    script += `${query} 관련 주요 뉴스들을 살펴보았습니다. 더 자세한 내용은 영상 설명란의 링크를 확인해 주세요. 구독과 좋아요 부탁드립니다!`

  } else if (scriptType === 'podcast') {
    // 팟캐스트 스크립트
    script = `# ${query} 뉴스 팟캐스트 스크립트 (${today})\n\n`
    script += `## 인트로\n`
    script += `안녕하세요, 청취자 여러분! 오늘 팟캐스트에서는 ${query}와 관련된 최신 뉴스들을 깊이 있게 다뤄보겠습니다.\n\n`

    newsResults.slice(0, 3).forEach((news, index) => {
      const newsDate = new Date(news.published_at).toLocaleDateString('ko-KR')
      script += `## 토픽 ${index + 1}: ${news.title}\n`
      script += `먼저 ${newsDate}에 ${news.source}에서 보도된 내용을 살펴보겠습니다.\n\n`
      script += `${news.summary}\n\n`
      script += `이 소식에 대해 어떻게 생각하시는지요? [잠시 멈춤]\n\n`
      script += `이런 상황이 ${query} 업계에 미칠 영향을 생각해보면...\n\n`
    })

    script += `## 아웃트로\n`
    script += `오늘은 ${query} 관련 주요 이슈들을 살펴보았습니다. 여러분의 의견이나 질문이 있으시면 댓글로 남겨주세요. 다음 시간에 더 흥미로운 주제로 찾아뵙겠습니다!`
  }

  return script
}