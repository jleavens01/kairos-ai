// FAL AI 작업 상태 확인 함수
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { requestId, type = 'auto' } = JSON.parse(event.body || '{}');

    if (!requestId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'requestId is required' })
      };
    }

    console.log(`Checking FAL status for request: ${requestId}, type: ${type}`);

    // FAL AI 상태 확인
    const statusUrl = `https://queue.fal.ai/requests/${requestId}/status`;
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${process.env.FAL_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    const statusText = await statusResponse.text();
    let statusData;
    
    try {
      statusData = JSON.parse(statusText);
    } catch (e) {
      console.error('Failed to parse FAL status response:', statusText);
      statusData = { raw_response: statusText };
    }

    console.log('FAL Status Response:', statusData);

    // 완료된 경우 결과 가져오기
    let resultData = null;
    if (statusData.status === 'COMPLETED' || statusData.completed_at) {
      const resultUrl = `https://queue.fal.ai/requests/${requestId}`;
      const resultResponse = await fetch(resultUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${process.env.FAL_API_KEY}`,
          'Accept': 'application/json'
        }
      });

      const resultText = await resultResponse.text();
      try {
        resultData = JSON.parse(resultText);
      } catch (e) {
        console.error('Failed to parse FAL result response:', resultText);
        resultData = { raw_response: resultText };
      }

      console.log('FAL Result Retrieved');
    }

    // 데이터베이스에서 해당 레코드 찾기
    let dbRecord = null;
    let recordType = null;

    // 먼저 이미지에서 찾기
    const { data: imageByRequestId } = await supabase
      .from('gen_images')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (imageByRequestId) {
      dbRecord = imageByRequestId;
      recordType = 'image';
    } else {
      // upscale_id로 찾기
      const { data: imageByUpscaleId } = await supabase
        .from('gen_images')
        .select('*')
        .eq('upscale_id', requestId)
        .single();

      if (imageByUpscaleId) {
        dbRecord = imageByUpscaleId;
        recordType = 'image_upscale';
      }
    }

    // 이미지에서 못 찾으면 비디오에서 찾기
    if (!dbRecord) {
      const { data: videoByRequestId } = await supabase
        .from('gen_videos')
        .select('*')
        .eq('request_id', requestId)
        .single();

      if (videoByRequestId) {
        dbRecord = videoByRequestId;
        recordType = 'video';
      } else {
        // metadata에서 upscale_request_id로 찾기
        const { data: videos } = await supabase
          .from('gen_videos')
          .select('*')
          .or(`metadata->upscale_request_id.eq.${requestId},upscale_id.eq.${requestId}`);

        if (videos && videos.length > 0) {
          dbRecord = videos[0];
          recordType = 'video_upscale';
        }
      }
    }

    // 수동으로 웹훅 트리거 (완료된 경우)
    let webhookTriggered = false;
    if (resultData && (statusData.status === 'COMPLETED' || statusData.completed_at)) {
      console.log('Attempting to manually trigger webhook handler...');
      
      const webhookPayload = {
        request_id: requestId,
        status: 'COMPLETED',
        output: resultData.output || resultData.result || resultData,
        data: resultData.data,
        result: resultData.result
      };

      const baseUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kairos-ai-pd.netlify.app';
      const webhookResponse = await fetch(`${baseUrl}/.netlify/functions/fal-webhook-handler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      if (webhookResponse.ok) {
        const webhookResult = await webhookResponse.json();
        webhookTriggered = true;
        console.log('Webhook manually triggered successfully:', webhookResult);
      } else {
        console.error('Failed to trigger webhook:', await webhookResponse.text());
      }
    }

    const response = {
      requestId,
      falStatus: statusData,
      falResult: resultData,
      dbRecord: dbRecord ? {
        id: dbRecord.id,
        type: recordType,
        status: recordType?.includes('upscale') ? dbRecord.upscale_status : dbRecord.generation_status,
        created_at: dbRecord.created_at,
        updated_at: dbRecord.updated_at
      } : null,
      webhookTriggered,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2)
    };

  } catch (error) {
    console.error('Error checking FAL status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};