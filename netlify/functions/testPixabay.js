// Test endpoint for Pixabay API
// This endpoint can be used to verify the API key is working

export const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
    
    const testResults = {
      apiKeyExists: !!PIXABAY_API_KEY,
      apiKeyLength: PIXABAY_API_KEY ? PIXABAY_API_KEY.length : 0,
      timestamp: new Date().toISOString()
    };

    if (!PIXABAY_API_KEY) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          message: 'PIXABAY_API_KEY not found in environment variables',
          ...testResults
        })
      };
    }

    // Test with a simple query
    const testQuery = 'flower';
    const testUrl = `https://pixabay.com/api/?` + new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: testQuery,
      per_page: '3',
      image_type: 'photo'
    });

    console.log('Testing Pixabay API with query:', testQuery);
    
    const response = await fetch(testUrl);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: response.ok,
        message: response.ok ? 'Pixabay API is working' : 'Pixabay API request failed',
        test: {
          ...testResults,
          apiResponse: {
            status: response.status,
            statusText: response.statusText,
            totalHits: data.totalHits || 0,
            total: data.total || 0,
            hitsReturned: data.hits?.length || 0,
            firstHit: data.hits?.[0] ? {
              id: data.hits[0].id,
              tags: data.hits[0].tags,
              previewURL: data.hits[0].previewURL
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