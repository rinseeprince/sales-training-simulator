import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithRBAC, logActivity, canAccessResource } from '@/lib/rbac-middleware';
import { createClient } from '@supabase/supabase-js';
import { SimulationFeedback } from '@/lib/types';

// Create Supabase admin client
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Fetch feedback for a simulation
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

    // Check if user can read this simulation's feedback
    const canRead = await canAccessResource(user, 'simulation', simulationId, 'read');
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();

    const { data: feedback, error } = await supabase
      .from('simulation_feedback')
      .select(`
        *,
        author:simple_users!author_id(id, name, email, role)
      `)
      .eq('simulation_id', simulationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    return NextResponse.json({
      feedback: feedback || []
    });

  } catch (error) {
    console.error('Feedback GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Add feedback to a simulation
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can add feedback
    if (!user.isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const simulationId = params.id;
    const body = await req.json();
    const { body: feedbackBody, feedbackType = 'comment' } = body;

    if (!feedbackBody) {
      return NextResponse.json({ error: 'Feedback body is required' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Verify simulation exists
    const { data: simulation } = await supabase
      .from('calls')
      .select('id, rep_id')
      .eq('id', simulationId)
      .single();

    if (!simulation) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }

    // Create feedback
    const feedbackData: Partial<SimulationFeedback> = {
      simulation_id: simulationId,
      author_id: user.user.id,
      body: feedbackBody,
      feedback_type: feedbackType
    };

    const { data, error } = await supabase
      .from('simulation_feedback')
      .insert([feedbackData])
      .select(`
        *,
        author:simple_users!author_id(id, name, email, role)
      `)
      .single();

    if (error) {
      console.error('Error creating feedback:', error);
      return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 });
    }

    // Create notification for the rep
    if (simulation.rep_id !== user.user.id) {
      await supabase.rpc('create_notification', {
        p_recipient_id: simulation.rep_id,
        p_type: 'feedback_received',
        p_entity_type: 'feedback',
        p_entity_id: data.id,
        p_title: 'New Feedback Received',
        p_message: `${user.user.name} left feedback on your simulation`,
        p_payload: {
          simulation_id: simulationId,
          feedback_id: data.id,
          author_id: user.user.id
        }
      });
    }

    // Log activity
    await logActivity(
      user.user.id,
      'add_feedback',
      'simulation_feedback',
      data.id,
      { simulationId, feedbackType },
      req
    );

    return NextResponse.json({ 
      success: true, 
      feedback: data 
    });

  } catch (error) {
    console.error('Feedback POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update feedback
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { feedbackId, body: feedbackBody } = body;

    if (!feedbackId || !feedbackBody) {
      return NextResponse.json({ error: 'feedbackId and body are required' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Check if user owns this feedback or is admin
    const { data: feedback } = await supabase
      .from('simulation_feedback')
      .select('author_id')
      .eq('id', feedbackId)
      .single();

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    if (feedback.author_id !== user.user.id && !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update feedback
    const { data, error } = await supabase
      .from('simulation_feedback')
      .update({ body: feedbackBody })
      .eq('id', feedbackId)
      .select()
      .single();

    if (error) {
      console.error('Error updating feedback:', error);
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
    }

    // Log activity
    await logActivity(
      user.user.id,
      'update_feedback',
      'simulation_feedback',
      feedbackId,
      {},
      req
    );

    return NextResponse.json({ success: true, feedback: data });

  } catch (error) {
    console.error('Feedback PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete feedback
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const feedbackId = searchParams.get('feedbackId');

    if (!feedbackId) {
      return NextResponse.json({ error: 'feedbackId is required' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Check if user owns this feedback or is admin
    const { data: feedback } = await supabase
      .from('simulation_feedback')
      .select('author_id')
      .eq('id', feedbackId)
      .single();

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    if (feedback.author_id !== user.user.id && !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete feedback
    const { error } = await supabase
      .from('simulation_feedback')
      .delete()
      .eq('id', feedbackId);

    if (error) {
      console.error('Error deleting feedback:', error);
      return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
    }

    // Log activity
    await logActivity(
      user.user.id,
      'delete_feedback',
      'simulation_feedback',
      feedbackId,
      {},
      req
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Feedback DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 