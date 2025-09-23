import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, corsHeaders, handleCors, validateEnvVars } from '@/lib/api-utils';

export async function DELETE(req: NextRequest) {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    validateEnvVars();

    const body = await req.json();
    const { callIds, userId } = body;

    if (!callIds || !Array.isArray(callIds) || callIds.length === 0) {
      return errorResponse('Invalid call IDs provided', 400);
    }

    console.log('Batch deleting calls:', { callIds, userId });

    // First verify all calls belong to the user (if userId provided)
    if (userId) {
      const { data: userCalls, error: verifyError } = await supabase
        .from('calls')
        .select('id, rep_id')
        .in('id', callIds);

      if (verifyError) {
        console.error('Error verifying call ownership:', verifyError);
        return errorResponse(`Verification error: ${verifyError.message}`, 500);
      }

      // Check if all calls belong to the user
      const unauthorizedCalls = userCalls?.filter(call => call.rep_id !== userId);
      if (unauthorizedCalls && unauthorizedCalls.length > 0) {
        console.error('User attempting to delete calls they don\'t own:', unauthorizedCalls);
        return errorResponse('Unauthorized: You can only delete your own simulations', 403);
      }
    }

    // First, update any scenario_assignments that reference these calls to set call_id to NULL
    const { error: updateError } = await supabase
      .from('scenario_assignments')
      .update({ call_id: null })
      .in('call_id', callIds);

    if (updateError) {
      console.error('Error updating scenario assignments:', updateError);
      return errorResponse(`Failed to update assignments: ${updateError.message}`, 500);
    }

    // Now delete the calls
    const { data, error } = await supabase
      .from('calls')
      .delete()
      .in('id', callIds)
      .select('id');

    if (error) {
      console.error('Supabase batch delete error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    const deletedCount = data?.length || 0;
    console.log('Calls deleted successfully:', { deletedCount, deletedIds: data?.map(d => d.id) });

    return successResponse({ 
      message: `${deletedCount} simulation${deletedCount === 1 ? '' : 's'} deleted successfully`,
      deletedCount: deletedCount,
      deletedIds: data?.map(d => d.id) 
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Batch delete calls error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}