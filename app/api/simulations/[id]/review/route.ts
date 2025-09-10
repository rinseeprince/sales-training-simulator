import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithRBAC, logActivity } from '@/lib/rbac-middleware';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// POST: Review actions (approve, reject, certify, request retry)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can review simulations
    if (!user.isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const simulationId = params.id;
    const body = await req.json();
    const { action, feedback, score } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const validActions = ['approve', 'reject', 'certify', 'request_retry'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Verify simulation exists
    const { data: simulation } = await supabase
      .from('calls')
      .select('id, rep_id, scenario_assignment_id')
      .eq('id', simulationId)
      .single();

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    // Prepare update data based on action
    const updateData: any = {
      reviewed_by: user.user.id,
      reviewed_at: new Date().toISOString(),
      status: 'reviewed'
    };

    let notificationType = 'simulation_reviewed';
    let notificationTitle = 'Simulation Reviewed';
    let notificationMessage = '';
    let feedbackType = 'comment';

    switch (action) {
      case 'approve':
        updateData.approved = true;
        updateData.certified = false;
        updateData.request_retry = false;
        notificationType = 'simulation_approved';
        notificationTitle = 'Simulation Approved';
        notificationMessage = `Your simulation has been approved by ${user.user.name}`;
        feedbackType = 'approval';
        break;

      case 'reject':
        updateData.approved = false;
        updateData.certified = false;
        updateData.request_retry = false;
        notificationType = 'simulation_rejected';
        notificationTitle = 'Simulation Rejected';
        notificationMessage = `Your simulation has been rejected by ${user.user.name}`;
        feedbackType = 'rejection';
        break;

      case 'certify':
        updateData.approved = true;
        updateData.certified = true;
        updateData.request_retry = false;
        notificationTitle = 'Simulation Certified';
        notificationMessage = `Congratulations! Your simulation has been certified by ${user.user.name}`;
        feedbackType = 'approval';
        break;

      case 'request_retry':
        updateData.approved = false;
        updateData.certified = false;
        updateData.request_retry = true;
        notificationType = 'retry_requested';
        notificationTitle = 'Retry Requested';
        notificationMessage = `${user.user.name} has requested you retry this simulation`;
        feedbackType = 'coaching';
        break;
    }

    // Update simulation
    const { error: updateError } = await supabase
      .from('calls')
      .update(updateData)
      .eq('id', simulationId);

    if (updateError) {
      console.error('Error updating simulation:', updateError);
      return NextResponse.json({ error: 'Failed to update simulation' }, { status: 500 });
    }

    // If there's an assignment, update its status
    if (simulation.scenario_assignment_id) {
      const assignmentUpdate: any = {};
      
      if (action === 'approve' || action === 'certify') {
        assignmentUpdate.status = 'completed';
        assignmentUpdate.result = 'pass';
        assignmentUpdate.completed_at = new Date().toISOString();
        if (score !== undefined) {
          assignmentUpdate.score = score;
        }
      } else if (action === 'reject') {
        assignmentUpdate.result = 'fail';
      }

      if (Object.keys(assignmentUpdate).length > 0) {
        await supabase
          .from('scenario_assignments')
          .update(assignmentUpdate)
          .eq('id', simulation.scenario_assignment_id);
      }
    }

    // Add feedback if provided
    if (feedback) {
      await supabase
        .from('simulation_feedback')
        .insert([{
          simulation_id: simulationId,
          author_id: user.user.id,
          body: feedback,
          feedback_type: feedbackType
        }]);
    }

    // Create notification for the rep
    await supabase.rpc('create_notification', {
      p_recipient_id: simulation.rep_id,
      p_type: notificationType,
      p_entity_type: 'simulation',
      p_entity_id: simulationId,
      p_title: notificationTitle,
      p_message: notificationMessage,
      p_payload: {
        simulation_id: simulationId,
        reviewer_id: user.user.id,
        action: action
      }
    });

    // Log activity
    await logActivity(
      user.user.id,
      `${action}_simulation`,
      'simulation',
      simulationId,
      { action, feedback: !!feedback },
      req
    );

    return NextResponse.json({ 
      success: true,
      message: `Simulation ${action}ed successfully`
    });

  } catch (error) {
    console.error('Review POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get review status of a simulation
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const simulationId = params.id;
    const supabase = createSupabaseAdmin();

    // Get simulation review status
    const { data: simulation, error } = await supabase
      .from('calls')
      .select(`
        id,
        status,
        approved,
        certified,
        request_retry,
        reviewed_by,
        reviewed_at,
        reviewer:simple_users!reviewed_by(id, name, email)
      `)
      .eq('id', simulationId)
      .single();

    if (error) {
      console.error('Error fetching simulation:', error);
      return NextResponse.json({ error: 'Failed to fetch simulation' }, { status: 500 });
    }

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    // Check if user can view this simulation
    const { data: callData } = await supabase
      .from('calls')
      .select('rep_id')
      .eq('id', simulationId)
      .single();

    if (callData?.rep_id !== user.user.id && !user.isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      reviewStatus: {
        status: simulation.status,
        approved: simulation.approved,
        certified: simulation.certified,
        requestRetry: simulation.request_retry,
        reviewedBy: simulation.reviewer,
        reviewedAt: simulation.reviewed_at
      }
    });

  } catch (error) {
    console.error('Review GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 