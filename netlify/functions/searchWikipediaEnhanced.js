// Wikipedia API 검색 - 페이지의 모든 이미지 가져오기
export const handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { query: searchTerm, language = 'ko' } = JSON.parse(event.body);

    if (!searchTerm) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Search term is required' })
      };
    }

    // 1. OpenSearch API로 검색
    const searchUrl = `https://${language}.wikipedia.org/w/api.php?` + 
      new URLSearchParams({
        action: 'opensearch',
        search: searchTerm,
        limit: '5',
        format: 'json'
      });

    const searchResponse = await fetch(searchUrl);
    const [query, titles, descriptions, urls] = await searchResponse.json();

    if (!titles || titles.length === 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: {
            query: searchTerm,
            results: []
          }
        })
      };
    }

    // 2. 각 페이지의 상세 정보와 모든 이미지 가져오기
    const pageResults = await Promise.all(
      titles.slice(0, 3).map(async (title, index) => {
        try {
          // 페이지 기본 정보 가져오기
          const pageUrl = `https://${language}.wikipedia.org/w/api.php?` + 
            new URLSearchParams({
              action: 'query',
              titles: title,
              prop: 'extracts|pageimages|info|images',
              format: 'json',
              exintro: 'true',
              explaintext: 'true',
              piprop: 'original|name',
              inprop: 'url',
              imlimit: 'max' // 모든 이미지 파일명 가져오기
            });

          const pageResponse = await fetch(pageUrl);
          const pageData = await pageResponse.json();
          const pages = pageData.query?.pages;
          
          if (!pages) return null;

          const pageId = Object.keys(pages)[0];
          const page = pages[pageId];

          if (pageId === '-1' || !page) return null;

          // 3. 페이지에 포함된 이미지 파일들의 URL 가져오기
          let allImages = [];
          
          if (page.images && page.images.length > 0) {
            // 이미지 파일명들을 가져와서 실제 URL로 변환
            const imageFiles = page.images
              .filter(img => {
                const filename = img.title.toLowerCase();
                // 아이콘, 로고 등 작은 이미지 제외
                return !filename.includes('icon') && 
                       !filename.includes('logo') &&
                       !filename.includes('.svg') &&
                       !filename.includes('commons-logo') &&
                       !filename.includes('wikimedia');
              })
              .slice(0, 30) // 최대 30개 이미지만
              .map(img => img.title);

            if (imageFiles.length > 0) {
              // 이미지 URL과 라이선스 정보 가져오기
              const imageInfoUrl = `https://${language}.wikipedia.org/w/api.php?` + 
                new URLSearchParams({
                  action: 'query',
                  titles: imageFiles.join('|'),
                  prop: 'imageinfo',
                  iiprop: 'url|size|mime|extmetadata|user|timestamp|sha1',
                  iiextmetadatafilter: 'License|LicenseShortName|LicenseUrl|Artist|Credit|Attribution|Copyrighted|UsageTerms|Restrictions',
                  format: 'json'
                });

              const imageInfoResponse = await fetch(imageInfoUrl);
              const imageInfoData = await imageInfoResponse.json();
              
              if (imageInfoData.query?.pages) {
                Object.values(imageInfoData.query.pages).forEach(imagePage => {
                  if (imagePage.imageinfo && imagePage.imageinfo[0]) {
                    const imageInfo = imagePage.imageinfo[0];
                    // 최소 크기 필터링 (너무 작은 이미지 제외)
                    if (imageInfo.width > 200 && imageInfo.height > 200) {
                      // 라이선스 정보 추출
                      const metadata = imageInfo.extmetadata || {};
                      
                      allImages.push({
                        url: imageInfo.url,
                        width: imageInfo.width,
                        height: imageInfo.height,
                        mime: imageInfo.mime,
                        title: imagePage.title.replace('File:', ''),
                        uploadedBy: imageInfo.user,
                        timestamp: imageInfo.timestamp,
                        sha1: imageInfo.sha1,
                        // 라이선스 정보
                        license: {
                          name: metadata.LicenseShortName?.value || metadata.License?.value || 'Unknown',
                          url: metadata.LicenseUrl?.value || null,
                          copyrighted: metadata.Copyrighted?.value || null,
                          usageTerms: metadata.UsageTerms?.value || null,
                          restrictions: metadata.Restrictions?.value || null
                        },
                        // 저작자 정보
                        attribution: {
                          artist: metadata.Artist?.value || null,
                          credit: metadata.Credit?.value || null,
                          attribution: metadata.Attribution?.value || null
                        },
                        // 위키미디어 페이지 URL
                        descriptionUrl: `https://commons.wikimedia.org/wiki/${imagePage.title}`
                      });
                    }
                  }
                });
              }
            }
          }

          // 대표 이미지도 라이선스 정보와 함께 포함
          if (page.original?.source && page.title) {
            // 대표 이미지의 파일명 찾기
            const mainImageFilename = `File:${page.pageimage}`;
            
            // 대표 이미지의 라이선스 정보 가져오기
            try {
              const mainImageInfoUrl = `https://${language}.wikipedia.org/w/api.php?` + 
                new URLSearchParams({
                  action: 'query',
                  titles: mainImageFilename,
                  prop: 'imageinfo',
                  iiprop: 'url|size|mime|extmetadata|user|timestamp',
                  iiextmetadatafilter: 'License|LicenseShortName|LicenseUrl|Artist|Credit|Attribution|Copyrighted|UsageTerms',
                  format: 'json'
                });

              const mainImageResponse = await fetch(mainImageInfoUrl);
              const mainImageData = await mainImageResponse.json();
              
              if (mainImageData.query?.pages) {
                const mainImagePage = Object.values(mainImageData.query.pages)[0];
                if (mainImagePage?.imageinfo?.[0]) {
                  const mainImageInfo = mainImagePage.imageinfo[0];
                  const mainMetadata = mainImageInfo.extmetadata || {};
                  
                  allImages.unshift({
                    url: page.original.source,
                    width: mainImageInfo.width,
                    height: mainImageInfo.height,
                    title: 'Main Image - ' + page.title,
                    isMain: true,
                    uploadedBy: mainImageInfo.user,
                    timestamp: mainImageInfo.timestamp,
                    license: {
                      name: mainMetadata.LicenseShortName?.value || mainMetadata.License?.value || 'Unknown',
                      url: mainMetadata.LicenseUrl?.value || null,
                      copyrighted: mainMetadata.Copyrighted?.value || null,
                      usageTerms: mainMetadata.UsageTerms?.value || null
                    },
                    attribution: {
                      artist: mainMetadata.Artist?.value || null,
                      credit: mainMetadata.Credit?.value || null,
                      attribution: mainMetadata.Attribution?.value || null
                    },
                    descriptionUrl: `https://commons.wikimedia.org/wiki/${mainImageFilename}`
                  });
                }
              }
            } catch (error) {
              // 라이선스 정보를 가져오지 못한 경우 기본 정보만 추가
              allImages.unshift({
                url: page.original.source,
                title: 'Main Image - ' + page.title,
                isMain: true,
                license: { name: 'Unknown' }
              });
            }
          }

          return {
            id: pageId,
            title: page.title,
            description: descriptions[index] || '',
            extract: page.extract || '',
            url: page.fullurl || urls[index],
            mainImage: page.original?.source || null,
            thumbnail: page.thumbnail?.source || null,
            images: allImages, // 모든 이미지 배열
            imageCount: allImages.length,
            source: 'wikipedia',
            language: language
          };
        } catch (error) {
          console.error(`Error fetching page data for ${title}:`, error);
          return null;
        }
      })
    );

    // null 결과 필터링
    const validResults = pageResults.filter(result => result !== null);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          query: searchTerm,
          language: language,
          results: validResults
        }
      })
    };

  } catch (error) {
    console.error('Wikipedia search error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to search Wikipedia',
        message: error.message 
      })
    };
  }
};