import { NextRequest } from 'next/server';
import { supabase } from '@/lib/api-utils';
import {
  extractSessionToken,
  createResponse
} from '@/lib/simple-auth';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = extractSessionToken(request);

    if (!sessionToken) {
      return createResponse(false, 'No session token provided', {}, 401);
    }

    // Delete the session from database
    const { error } = await supabase
      .from('simple_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Session deletion error:', error);
      // Don't fail logout even if session deletion fails
    }

    return createResponse(true, 'Logged out successfully');

  } catch (error) {
    console.error('Logout error:', error);
    // Always return success for logout to avoid client issues
    return createResponse(true, 'Logged out successfully');
  }
}

export async function OPTIONS() {
  return createResponse(true, 'OK');
}
