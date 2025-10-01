import { NextRequest, NextResponse } from 'next/server';
import { withOrganizationAuth } from '@/lib/organization-middleware';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Save manager feedback for a call
 * POST /api/manager-feedback
 */
async function handleManagerFeedback(request: any) {
  try {
    const body = await request.json();
    const { callId, feedback } = body;

    if (!callId || !feedback?.trim()) {
      return NextResponse.json(
        { error: 'Call ID and feedback are required' },
        { status: 400 }
      );
    }

    // Verify the call exists and user has access to it within their organization
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        id,
        rep_id,
        manager_feedback,
        simple_users!calls_rep_id_fkey (
          organization_id
        )
      `)
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Verify the call belongs to the same organization
    const callOrganizationId = (call as any).simple_users?.organization_id;
    if (callOrganizationId !== request.user.organization_id) {
      return NextResponse.json(
        { error: 'Cannot access call from different organization' },
        { status: 403 }
      );
    }

    // Update the call with manager feedback
    const { data: updatedCall, error: updateError } = await supabase
      .from('calls')
      .update({
        manager_feedback: feedback.trim(),
        manager_feedback_by: request.user.id,
        manager_feedback_at: new Date().toISOString()
      })
      .eq('id', callId)
      .select(`
        id,
        manager_feedback,
        manager_feedback_at,
        simple_users!calls_manager_feedback_by_fkey (
          name,
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating call with manager feedback:', updateError);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      call: updatedCall,
      message: 'Manager feedback saved successfully'
    });

  } catch (error) {
    console.error('Error in manager feedback API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get manager feedback for a call
 * GET /api/manager-feedback?callId=xxx
 */
async function getManagerFeedback(request: any) {
  try {
    const url = new URL(request.url);
    const callId = url.searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    // Get the call with manager feedback
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select(`
        id,
        manager_feedback,
        manager_feedback_at,
        rep_id,
        simple_users!calls_rep_id_fkey (
          organization_id
        ),
        manager_feedback_user:simple_users!calls_manager_feedback_by_fkey (
          name,
          email
        )
      `)
      .eq('id', callId)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Verify access - either own call or manager/admin in same organization
    const callOrganizationId = (call as any).simple_users?.organization_id;
    const isOwnCall = call.rep_id === request.user.id;
    const isManagerInSameOrg = ['manager', 'admin'].includes(request.user.role) && 
                               request.user.organization_id === callOrganizationId;

    if (!isOwnCall && !isManagerInSameOrg) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: {
        content: call.manager_feedback,
        createdAt: call.manager_feedback_at,
        manager: call.manager_feedback_user
      }
    });

  } catch (error) {
    console.error('Error getting manager feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export with organization auth middleware
export const POST = withOrganizationAuth(handleManagerFeedback, {
  requiredRoles: ['manager', 'admin'],
  logAction: 'manager_feedback_added'
});

export const GET = withOrganizationAuth(getManagerFeedback, {
  requiredRoles: ['user', 'manager', 'admin']
});