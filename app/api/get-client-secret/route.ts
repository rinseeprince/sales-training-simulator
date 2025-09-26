import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return errorResponse('OpenAI API key not configured', 500);
    }

    // Create an ephemeral client secret for the client using the correct endpoint
    // This is a short-lived token that the client can use to connect to the Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime'
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      // Handle different types of OpenAI errors
      if (response.status === 401) {
        return errorResponse('Invalid OpenAI API key', 401);
      } else if (response.status === 429) {
        return errorResponse('Rate limit exceeded. Please try again later.', 429);
      } else if (response.status === 403) {
        return errorResponse('Access denied. Realtime API may not be enabled for this account.', 403);
      }

      return errorResponse(
        errorData?.error?.message || `OpenAI API error: ${response.statusText}`,
        response.status
      );
    }

    const ephemeralKey = await response.json();

    return successResponse({
      client_secret: ephemeralKey.value,
      expires_at: ephemeralKey.expires_at,
    }, 200, corsHeaders);

  } catch (error: any) {
    console.error('Error creating ephemeral key:', error);

    return errorResponse(
      error?.message || 'Failed to create ephemeral key',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}