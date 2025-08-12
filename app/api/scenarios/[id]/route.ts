import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const { id } = params;
    
    const { error } = await supabase
      .from('scenarios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({ message: 'Scenario deleted successfully' }, 200, corsHeaders);
  } catch (error) {
    console.error('Delete scenario error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}