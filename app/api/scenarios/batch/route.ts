import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function DELETE(req: NextRequest) {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const body = await req.json();
    const { scenarioIds } = body;

    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length === 0) {
      return errorResponse('Invalid scenario IDs provided', 400);
    }

    const { error } = await supabase
      .from('scenarios')
      .delete()
      .in('id', scenarioIds);

    if (error) {
      console.error('Supabase batch delete error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({ 
      message: `${scenarioIds.length} scenario${scenarioIds.length === 1 ? '' : 's'} deleted successfully`,
      deletedCount: scenarioIds.length 
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Batch delete scenarios error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}