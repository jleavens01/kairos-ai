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
    const { query, days = 7, maxResults = 20 } = JSON.parse(event.body || '{}')

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

    console.log(`뉴스 검색 시작: "${query}", ${days}일, 최대 ${maxResults}개 - RSS 기반`)

    const newsResults = []

    // RSS 피드 기반 뉴스 검색 (네이버 API 대안)
    const rssFeeds = [
      'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' 브랜드') + '&hl=ko&gl=KR&ceid=KR:ko',
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.bbci.co.uk/news/rss.xml'
    ]

    console.log('RSS 피드 검색 시작:', rssFeeds.length, '개 소스')

    for (const feedUrl of rssFeeds.slice(0, 1)) { // Google News만 사용
      try {
        console.log('RSS 피드 요청:', feedUrl)
        
        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Kairos-AI/1.0)'
          },
          timeout: 10000
        })

        if (!response.ok) {
          console.log(`RSS 피드 응답 실패: ${response.status}`)
          continue
        }

        const xmlText = await response.text()
        console.log('RSS XML 길이:', xmlText.length)
        
        // XML 파싱 (간단한 정규식 사용)
        const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []
        console.log('RSS 아이템 개수:', itemMatches.length)

        for (const itemXml of itemMatches.slice(0, parseInt(maxResults))) {
          try {
            const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                         itemXml.match(/<title>(.*?)<\/title>/)?.[1] || ''
            const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || ''
            const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''
            const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || 
                               itemXml.match(/<description>(.*?)<\/description>/)?.[1] || ''

            if (title && link) {
              // 한국 관련 뉴스만 필터링
              if (title.includes('한국') || title.includes('브랜드') || title.includes('Korea') || 
                  description.includes('한국') || description.includes('브랜드')) {
                
                let published_at = new Date().toISOString()
                if (pubDate) {
                  try {
                    published_at = new Date(pubDate).toISOString()
                  } catch (dateError) {
                    console.log('날짜 파싱 오류:', dateError.message)
                  }
                }

                newsResults.push({
                  title: title.replace(/<\/?[^>]+(>|$)/g, '').trim(),
                  summary: description.replace(/<\/?[^>]+(>|$)/g, '').substring(0, 300),
                  url: link,
                  published_at: published_at,
                  source: 'Google News RSS',
                  author: null,
                  image_url: null
                })
              }
            }
          } catch (itemError) {
            console.log('RSS 아이템 처리 오류:', itemError.message)
          }
        }
      } catch (feedError) {
        console.log('RSS 피드 오류:', feedError.message)
      }
    }

    console.log(`RSS 기반 뉴스 수집 완료: ${newsResults.length}개`)

    // 네이버 API 시도 (RSS 결과가 부족한 경우에만)
    if (newsResults.length < 5) {
      console.log('RSS 결과 부족, 네이버 API 시도...')
      
      const naverClientId = process.env.NAVER_CLIENT_ID
      const naverClientSecret = process.env.NAVER_CLIENT_SECRET
      
      if (naverClientId && naverClientSecret) {
        try {
          const searchQuery = encodeURIComponent(query)
          const naverApiUrl = `https://openapi.naver.com/v1/search/news.json?query=${searchQuery}&display=${Math.min(parseInt(maxResults) - newsResults.length, 100)}&start=1&sort=date`

          console.log('네이버 뉴스 API 시도:', naverApiUrl)
          
          const response = await fetch(naverApiUrl, {
            headers: {
              'X-Naver-Client-Id': naverClientId,
              'X-Naver-Client-Secret': naverClientSecret,
              'User-Agent': 'Mozilla/5.0 (compatible; Kairos-AI/1.0)'
            }
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`네이버 API 응답: ${data.items?.length || 0}개 뉴스`)

            // 네이버 API 결과 추가
            if (data.items && data.items.length > 0) {
              for (const item of data.items) {
                try {
                  const cleanTitle = item.title.replace(/<\/?[^>]+(>|$)/g, '').trim()
                  const cleanDescription = item.description.replace(/<\/?[^>]+(>|$)/g, '').trim()
                  
                  let published_at = new Date().toISOString()
                  if (item.pubDate) {
                    try {
                      published_at = new Date(item.pubDate).toISOString()
                    } catch (dateError) {
                      console.log('날짜 파싱 오류:', dateError.message)
                    }
                  }

                  if (cleanTitle && item.link) {
                    newsResults.push({
                      title: cleanTitle,
                      summary: cleanDescription.length > 300 ? cleanDescription.substring(0, 300) + '...' : cleanDescription,
                      url: item.originallink || item.link,
                      published_at: published_at,
                      source: '네이버 뉴스',
                      author: null,
                      image_url: null
                    })
                  }
                } catch (itemError) {
                  console.log('네이버 아이템 처리 오류:', itemError.message)
                }
              }
            }
          } else {
            console.log(`네이버 API 실패 (${response.status}), RSS 결과로 진행`)
          }
        } catch (naverError) {
          console.log('네이버 API 오류:', naverError.message)
        }
      } else {
        console.log('네이버 API 키 없음, RSS 결과만 사용')
      }
    }

    console.log(`최종 뉴스 수집: ${newsResults.length}개 (RSS + 네이버)`)

    // 날짜 필터링 (지정된 기간 내의 뉴스만)
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - parseInt(days))
    
    const filteredNews = newsResults.filter(news => {
      const newsDate = new Date(news.published_at)
      return newsDate >= daysAgo
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        query: query,
        searchPeriod: `최근 ${days}일`,
        totalFound: filteredNews.length,
        news: filteredNews
      })
    }

  } catch (error) {
    console.error('뉴스 검색 실패:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '뉴스 검색 중 오류가 발생했습니다.'
      })
    }
  }
}