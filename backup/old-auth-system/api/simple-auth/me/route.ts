import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  extractSessionToken,
  createResponse,
  sanitizeUser
} from '@/lib/simple-auth';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = extractSessionToken(request);

    if (!sessionToken) {
      return createResponse(false, 'No session token provided', {}, 401);
    }

    // Get session and user
    const { data: session, error: sessionError } = await supabase
      .from('simple_sessions')
      .select(`
        *,
        simple_users (*)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.simple_users) {
      return createResponse(false, 'Invalid or expired session', {}, 401);
    }

    // Update last activity
    await supabase
      .from('simple_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('id', session.id);

    return createResponse(
      true, 
      'User data retrieved successfully', 
      { user: sanitizeUser(session.simple_users) }
    );

  } catch (error) {
    console.error('Get user error:', error);
    return createResponse(false, 'Internal server error', {}, 500);
  }
}

export async function OPTIONS() {
  return createResponse(true, 'OK');
}
