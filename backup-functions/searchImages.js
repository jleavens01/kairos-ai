// 통합 이미지/비디오 검색 서비스
// Pixabay, Unsplash, Pexels 등의 API를 활용한 미디어 검색

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { query, page = 1, per_page = 20, sources = ['pixabay', 'unsplash'], mediaType = 'image' } = JSON.parse(event.body);
    // sources is an array of enabled sources

    if (!query || query.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Search query is required' })
      };
    }

    // API 키 확인 (환경 변수에서 가져오기)
    const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
    const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
    const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
    // Wikimedia Commons는 API 키 불필요
    
    console.log('Environment check:');
    console.log('- Enabled sources:', sources);
    console.log('- Search query:', query);
    console.log('- Page:', page);
    
    // 결과를 저장할 배열
    let allResults = [];
    let totalHits = 0;
    const errors = [];

    // 비디오 검색인 경우
    if (mediaType === 'video') {
      // Pixabay 비디오 검색
      if (sources.includes('pixabay') && PIXABAY_API_KEY) {
        try {
          const params = {
            key: PIXABAY_API_KEY,
            q: query.trim(),
            video_type: 'all', // film, animation 등
            safesearch: 'true',
            page: page.toString(),
            per_page: Math.min(Math.max(per_page, 3), 200).toString() // Pixabay는 최소 3개 필요
          };
          
          const searchUrl = `https://pixabay.com/api/videos/?` + new URLSearchParams(params);
          console.log('Pixabay video search URL:', searchUrl.replace(PIXABAY_API_KEY, 'XXX'));
          
          const response = await fetch(searchUrl);
          console.log('Pixabay video API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Pixabay video response:', {
              total: data.total,
              totalHits: data.totalHits,
              hits: data.hits?.length || 0
            });
            if (data.hits && data.hits.length > 0) {
              console.log('First video object:', JSON.stringify(data.hits[0], null, 2).substring(0, 500));
            }
            const pixabayVideos = data.hits.map(video => ({
              id: `pixabay_${video.id}`,
              type: 'video',
              source: 'pixabay',
              url: video.videos.medium.url || video.videos.small.url,
              thumbnail: video.videos.tiny.url, // 작은 비디오를 썸네일로 사용
              preview_url: video.videos.tiny.url,
              width: video.videos.medium.width || 640,
              height: video.videos.medium.height || 360,
              duration: video.duration,
              user: video.user,
              tags: video.tags,
              likes: video.likes,
              downloads: video.downloads,
              views: video.views,
              pageURL: video.pageURL
            }));
            
            allResults = allResults.concat(pixabayVideos);
            totalHits += data.totalHits;
          } else {
            console.error('Pixabay video API error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error response:', errorText);
          }
        } catch (error) {
          console.error('Pixabay video search error:', error);
          errors.push({ source: 'pixabay', error: error.message });
        }
      }
      
      // Pexels 비디오 검색
      if (sources.includes('pexels') && PEXELS_API_KEY) {
        try {
          const pexelsUrl = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}`;
          
          const response = await fetch(pexelsUrl, {
            headers: {
              'Authorization': PEXELS_API_KEY
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const pexelsVideos = data.videos.map(video => ({
              id: `pexels_${video.id}`,
              type: 'video',
              source: 'pexels',
              url: video.video_files[0]?.link || video.url,
              thumbnail: video.image,
              preview_url: video.video_files.find(f => f.quality === 'sd')?.link || video.video_files[0]?.link,
              width: video.width,
              height: video.height,
              duration: video.duration,
              user: video.user.name,
              user_url: video.user.url,
              pageURL: video.url
            }));
            
            allResults = allResults.concat(pexelsVideos);
            totalHits += data.total_results || data.videos.length;
          }
        } catch (error) {
          console.error('Pexels video search error:', error);
          errors.push({ source: 'pexels', error: error.message });
        }
      }
    }
    
    // 이미지 검색 (비디오가 아닌 경우)
    if (mediaType === 'image') {
      // Pixabay 이미지 검색
      if (sources.includes('pixabay') && PIXABAY_API_KEY) {
        try {
          const params = {
            key: PIXABAY_API_KEY,
            q: query.trim(),
            image_type: 'photo',
            orientation: 'all',
            safesearch: 'true',
            page: page.toString(),
            per_page: Math.min(Math.max(per_page, 3), 200).toString() // Pixabay는 최소 3개 필요
          };
          
          const searchUrl = `https://pixabay.com/api/?` + new URLSearchParams(params);

    console.log('API Request Details:');
    console.log('- Base URL: https://pixabay.com/api/');
    console.log('- Query param:', params.q);
    console.log('- Full URL (with masked key):', searchUrl.replace(PIXABAY_API_KEY, 'XXXX-API-KEY-XXXX'));
    
    const response = await fetch(searchUrl);
    
    console.log('API Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pixabay API error:', response.status, response.statusText);
      console.error('Error response body:', errorText);
      throw new Error(`Pixabay API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Pixabay API response data:');
    console.log('- Total hits:', data.total);
    console.log('- Total hits (exact):', data.totalHits);
    console.log('- Hits returned:', data.hits?.length || 0);
    console.log('- First hit (if any):', data.hits?.[0] ? {
      id: data.hits[0].id,
      tags: data.hits[0].tags,
      pageURL: data.hits[0].pageURL
    } : 'No hits');

        // Pixabay 결과 포맷팅
        const pixabayResults = data.hits?.map(hit => ({
      id: hit.id.toString(),
      title: hit.tags || 'Untitled',
      description: `Tags: ${hit.tags}`,
      image: hit.webformatURL,
      thumbnail: hit.previewURL,
      original: hit.largeImageURL,
      url: hit.pageURL,
      width: hit.imageWidth,
      height: hit.imageHeight,
      size: hit.imageSize,
      user: hit.user,
      source: 'pixabay',
      sourceLabel: 'Pixabay',
      license: 'Pixabay License'
        })) || [];
        
        allResults = allResults.concat(pixabayResults);
        totalHits += data.total || 0;
        
      } catch (pixabayError) {
        console.error('Pixabay API error:', pixabayError.message);
        errors.push(`Pixabay: ${pixabayError.message}`);
      }
    }
    
    // Unsplash API 호출
    if (sources.includes('unsplash') && UNSPLASH_ACCESS_KEY) {
      try {
        const unsplashParams = new URLSearchParams({
          query: query.trim(),
          page: page.toString(),
          per_page: Math.min(per_page, 30).toString()
        });
        
        const unsplashUrl = `https://api.unsplash.com/search/photos?${unsplashParams}`;
        
        console.log('Calling Unsplash API...');
        
        const unsplashResponse = await fetch(unsplashUrl, {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            'Accept-Version': 'v1'
          }
        });
        
        if (unsplashResponse.ok) {
          const unsplashData = await unsplashResponse.json();
          console.log('Unsplash results:', unsplashData.results?.length || 0);
          
          // Unsplash 결과 포맷팅
          const unsplashResults = unsplashData.results?.map(photo => ({
            id: `unsplash_${photo.id}`,
            title: photo.description || photo.alt_description || 'Untitled',
            description: `Photo by ${photo.user.name} on Unsplash`,
            image: photo.urls.regular,
            thumbnail: photo.urls.small,
            original: photo.urls.full,
            url: photo.links.html,
            width: photo.width,
            height: photo.height,
            size: null,
            user: photo.user.name,
            source: 'unsplash',
            sourceLabel: 'Unsplash',
            license: 'Unsplash License',
            attribution: {
              photographer: photo.user.name,
              photographerUrl: photo.user.links.html
            }
          })) || [];
          
          allResults = allResults.concat(unsplashResults);
          totalHits += unsplashData.total || 0;
        }
      } catch (unsplashError) {
        console.error('Unsplash API error:', unsplashError.message);
        errors.push(`Unsplash: ${unsplashError.message}`);
      }
    }
    
    // Pexels API 호출
    if (sources.includes('pexels') && PEXELS_API_KEY) {
      try {
        const pexelsParams = new URLSearchParams({
          query: query.trim(),
          page: page.toString(),
          per_page: Math.min(per_page, 80).toString()
        });
        
        const pexelsUrl = `https://api.pexels.com/v1/search?${pexelsParams}`;
        
        console.log('Calling Pexels API...');
        
        const pexelsResponse = await fetch(pexelsUrl, {
          headers: {
            'Authorization': PEXELS_API_KEY
          }
        });
        
        if (pexelsResponse.ok) {
          const pexelsData = await pexelsResponse.json();
          console.log('Pexels results:', pexelsData.photos?.length || 0);
          
          const pexelsResults = pexelsData.photos?.map(photo => ({
            id: `pexels_${photo.id}`,
            title: photo.alt || 'Pexels Photo',
            description: `Photo by ${photo.photographer}`,
            image: photo.src.large,
            thumbnail: photo.src.medium,
            original: photo.src.original,
            url: photo.url,
            width: photo.width,
            height: photo.height,
            user: photo.photographer,
            source: 'pexels',
            sourceLabel: 'Pexels',
            license: 'Pexels License'
          })) || [];
          
          allResults = allResults.concat(pexelsResults);
          totalHits += pexelsData.total_results || 0;
        }
      } catch (pexelsError) {
        console.error('Pexels API error:', pexelsError.message);
        errors.push(`Pexels: ${pexelsError.message}`);
      }
    }
    
    // Flickr API 호출
    if (sources.includes('flickr') && FLICKR_API_KEY) {
      try {
        const flickrParams = new URLSearchParams({
          method: 'flickr.photos.search',
          api_key: FLICKR_API_KEY,
          text: query.trim(),
          page: page.toString(),
          per_page: Math.min(per_page, 100).toString(),
          format: 'json',
          nojsoncallback: '1',
          safe_search: '1',
          content_type: '1',
          license: '1,2,3,4,5,6,7,8,9,10',
          extras: 'url_l,url_m,owner_name'
        });
        
        const flickrUrl = `https://api.flickr.com/services/rest/?${flickrParams}`;
        
        console.log('Calling Flickr API...');
        
        const flickrResponse = await fetch(flickrUrl);
        
        if (flickrResponse.ok) {
          const flickrData = await flickrResponse.json();
          
          if (flickrData.stat === 'ok') {
            console.log('Flickr results:', flickrData.photos.photo?.length || 0);
            
            const flickrResults = flickrData.photos.photo?.map(photo => {
              const baseUrl = `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}`;
              return {
                id: `flickr_${photo.id}`,
                title: photo.title || 'Flickr Photo',
                description: `Photo by ${photo.ownername}`,
                image: photo.url_l || `${baseUrl}_b.jpg`,
                thumbnail: photo.url_m || `${baseUrl}_m.jpg`,
                original: photo.url_l || `${baseUrl}_b.jpg`,
                url: `https://www.flickr.com/photos/${photo.owner}/${photo.id}`,
                user: photo.ownername,
                source: 'flickr',
                sourceLabel: 'Flickr',
                license: 'CC Licensed'
              };
            }) || [];
            
            allResults = allResults.concat(flickrResults);
            totalHits += parseInt(flickrData.photos.total) || 0;
          }
        }
      } catch (flickrError) {
        console.error('Flickr API error:', flickrError.message);
        errors.push(`Flickr: ${flickrError.message}`);
      }
    }
    
    // Google 이미지 검색
    if (sources.includes('google') && GOOGLE_CUSTOM_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID) {
      try {
        // Google API는 한 번에 최대 10개만 반환
        const googleResults = [];
        const requestsNeeded = 1; // 1번 요청으로 10개만
        
        for (let i = 0; i < requestsNeeded; i++) {
          const startIndex = ((page - 1) * 10) + (i * 10) + 1;
          
          // Google API는 최대 100개까지만 검색 가능 (start는 91이 최대)
          if (startIndex > 91) break;
          
          const googleParams = new URLSearchParams({
            key: GOOGLE_CUSTOM_SEARCH_API_KEY,
            cx: GOOGLE_SEARCH_ENGINE_ID,
            q: query.trim(),
            searchType: 'image',
            num: '10', // 항상 10개씩 요청
            start: startIndex.toString(),
            safe: 'active',
            imgSize: 'large',
            fileType: 'jpg|png|jpeg'
          });
        
          const googleUrl = `https://www.googleapis.com/customsearch/v1?${googleParams}`;
          
          console.log(`Google API request ${i + 1}/${requestsNeeded}, start: ${startIndex}`);
          
          const googleResponse = await fetch(googleUrl);
          
          if (googleResponse.ok) {
            const googleData = await googleResponse.json();
            console.log(`Google batch ${i + 1} results:`, googleData.items?.length || 0);
            
            const batchResults = googleData.items?.map(item => {
              // Google 검색 결과 포맷팅
              return {
                id: `google_${item.cacheId || item.link}_${i}`,
                title: item.title || 'Google Image',
                description: item.snippet || '',
                image: item.link,
                thumbnail: item.image?.thumbnailLink || item.link,
                original: item.link,
                url: item.image?.contextLink || item.displayLink,
                width: item.image?.width,
                height: item.image?.height,
                size: item.image?.byteSize,
                user: item.displayLink,
                source: 'google',
                sourceLabel: 'Google',
                license: 'Check source for license',
                mime: item.mime,
                fileFormat: item.fileFormat
              };
            }) || [];
            
            googleResults.push(...batchResults);
            
            // 첫 번째 요청에서만 totalResults 저장
            if (i === 0) {
              totalHits += parseInt(googleData.searchInformation?.totalResults || 0);
            }
          } else {
            const errorText = await googleResponse.text();
            console.error(`Google API error (batch ${i + 1}):`, googleResponse.status, errorText);
            // 첫 번째 요청이 실패하면 중단, 아니면 계속
            if (i === 0) {
              errors.push(`Google: ${googleResponse.status} error`);
              break;
            }
          }
        }
        
        // 수집된 모든 Google 결과를 allResults에 추가
        allResults = allResults.concat(googleResults);
        console.log('Total Google results collected:', googleResults.length);
        
      } catch (googleError) {
        console.error('Google search error:', googleError.message);
        errors.push(`Google: ${googleError.message}`);
      }
    }
    
    // Wikimedia Commons API 호출 (API 키 불필요)
    if (sources.includes('commons')) {
      try {
        const offset = (page - 1) * per_page;
        const commonsParams = new URLSearchParams({
          action: 'query',
          format: 'json',
          generator: 'search',
          gsrsearch: query.trim(),
          gsrnamespace: '6',
          gsrlimit: Math.min(per_page, 50).toString(),
          gsroffset: offset.toString(),
          prop: 'imageinfo',
          iiprop: 'url|size|mime|user',
          iiurlwidth: '640',
          origin: '*'
        });
        
        const commonsUrl = `https://commons.wikimedia.org/w/api.php?${commonsParams}`;
        
        console.log('Calling Wikimedia Commons API...');
        
        const commonsResponse = await fetch(commonsUrl);
        
        if (commonsResponse.ok) {
          const commonsData = await commonsResponse.json();
          
          if (commonsData.query && commonsData.query.pages) {
            const commonsResults = Object.values(commonsData.query.pages).map(page => {
              if (page.imageinfo && page.imageinfo[0]) {
                const info = page.imageinfo[0];
                return {
                  id: `commons_${page.pageid}`,
                  title: page.title.replace('File:', '').replace(/\.[^.]+$/, ''),
                  description: `Uploaded by ${info.user}`,
                  image: info.thumburl || info.url,
                  thumbnail: info.thumburl || info.url,
                  original: info.url,
                  url: info.descriptionurl,
                  width: info.width,
                  height: info.height,
                  user: info.user,
                  source: 'commons',
                  sourceLabel: 'Commons',
                  license: 'CC/Public Domain'
                };
              }
              return null;
            }).filter(Boolean);
            
            console.log('Commons results:', commonsResults.length);
            allResults = allResults.concat(commonsResults);
            totalHits += commonsResults.length * 10; // 추정치
          }
        }
      } catch (commonsError) {
        console.error('Commons API error:', commonsError.message);
        errors.push(`Commons: ${commonsError.message}`);
      }
    }
    } // 이미지 검색 블록 끝
    
    // 결과를 섞어서 다양성 확보
    const mixedResults = [];
    // 각 소스별로 결과 분리
    const resultsBySource = {};
    sources.forEach(src => {
      resultsBySource[src] = allResults.filter(r => r.source === src);
    });
    
    // Round-robin 방식으로 믹싱
    const maxLength = Math.max(...Object.values(resultsBySource).map(arr => arr.length));
    
    for (let i = 0; i < maxLength; i++) {
      for (const source of sources) {
        if (resultsBySource[source] && i < resultsBySource[source].length) {
          mixedResults.push(resultsBySource[source][i]);
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          query: query.trim(),
          results: sources.length > 1 ? mixedResults : allResults,
          total: totalHits,
          totalPages: Math.ceil(totalHits / per_page),
          currentPage: page,
          sources: {
            pixabay: !!PIXABAY_API_KEY,
            unsplash: !!UNSPLASH_ACCESS_KEY,
            pexels: !!PEXELS_API_KEY,
            flickr: !!FLICKR_API_KEY,
            google: !!(GOOGLE_CUSTOM_SEARCH_API_KEY && GOOGLE_SEARCH_ENGINE_ID),
            commons: true
          },
          enabledSources: sources,
          errors: errors.length > 0 ? errors : undefined
        }
      })
    };
  } catch (error) {
    console.error('Image search error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Image search failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};