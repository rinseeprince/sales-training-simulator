import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, corsHeaders, handleCors, validateEnvVars } from '@/lib/api-utils';

export async function DELETE(req: NextRequest) {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    validateEnvVars();

    const body = await req.json();
    const { callIds } = body;

    if (!callIds || !Array.isArray(callIds) || callIds.length === 0) {
      return errorResponse('Invalid call IDs provided', 400);
    }

    console.log('Batch deleting calls:', { callIds });

    const { error } = await supabase
      .from('calls')
      .delete()
      .in('id', callIds);

    if (error) {
      console.error('Supabase batch delete error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    console.log('Calls deleted successfully:', { callIds });

    return successResponse({ 
      message: `${callIds.length} simulation${callIds.length === 1 ? '' : 's'} deleted successfully`,
      deletedCount: callIds.length 
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Batch delete calls error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}