// Test endpoint for Unsplash API
// This endpoint can be used to verify the API key is working

export const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    
    const testResults = {
      apiKeyExists: !!UNSPLASH_ACCESS_KEY,
      apiKeyLength: UNSPLASH_ACCESS_KEY ? UNSPLASH_ACCESS_KEY.length : 0,
      timestamp: new Date().toISOString()
    };

    if (!UNSPLASH_ACCESS_KEY) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'UNSPLASH_ACCESS_KEY not found in environment variables',
          ...testResults
        })
      };
    }

    // Test with a simple query
    const testQuery = 'nature';
    const testUrl = `https://api.unsplash.com/search/photos?` + new URLSearchParams({
      query: testQuery,
      per_page: '3'
    });

    console.log('Testing Unsplash API with query:', testQuery);
    
    const response = await fetch(testUrl, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1'
      }
    });
    
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: response.ok,
        message: response.ok ? 'Unsplash API is working' : 'Unsplash API request failed',
        test: {
          ...testResults,
          apiResponse: {
            status: response.status,
            statusText: response.statusText,
            total: data.total || 0,
            totalPages: data.total_pages || 0,
            resultsReturned: data.results?.length || 0,
            firstResult: data.results?.[0] ? {
              id: data.results[0].id,
              description: data.results[0].description,
              alt_description: data.results[0].alt_description,
              urls: {
                thumb: data.results[0].urls?.thumb,
                small: data.results[0].urls?.small
              },
              user: data.results[0].user?.name
            } : null
          }
        }
      })
    };

  } catch (error) {
    console.error('Test error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        message: 'Test failed',
        error: error.message
      })
    };
  }
};