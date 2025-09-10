import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithRBAC, logActivity, canAccessResource } from '@/lib/rbac-middleware';
import { createClient } from '@supabase/supabase-js';
import { ScenarioAssignment } from '@/lib/types';

// Create Supabase admin client
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Fetch scenario assignments
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'my'; // 'my', 'team', 'all'
    const status = searchParams.get('status');
    const repId = searchParams.get('repId');
    const teamId = searchParams.get('teamId');
    const includeCompleted = searchParams.get('includeCompleted') !== 'false';

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from('scenario_assignments')
      .select(`
        *,
        scenario:scenarios!scenario_id(id, title, prompt, is_company_generated),
        assigned_by_user:simple_users!assigned_by(id, name, email),
        assigned_to_user_data:simple_users!assigned_to_user(id, name, email),
        assigned_to_team_data:teams!assigned_to_team(id, name)
      `)
      .order('deadline', { ascending: true, nullsFirst: false });

    // Apply scope filters
    if (scope === 'my') {
      // User's own assignments
      query = query.or(`assigned_to_user.eq.${user.user.id},assigned_to_team.eq.${user.teamId}`);
    } else if (scope === 'team' && user.teamId) {
      // Team assignments (for managers)
      if (!user.isManager) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query = query.eq('assigned_to_team', user.teamId);
    } else if (scope === 'all') {
      // All assignments (for managers/admins)
      if (!user.isManager) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // No additional filter needed
    }

    // Apply additional filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (repId && user.isManager) {
      query = query.eq('assigned_to_user', repId);
    }
    
    if (teamId && user.isManager) {
      query = query.eq('assigned_to_team', teamId);
    }

    if (!includeCompleted) {
      query = query.neq('status', 'completed');
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    // Check for overdue assignments and update their status
    const now = new Date();
    const overdueAssignments = assignments?.filter(
      a => a.deadline && new Date(a.deadline) < now && a.status !== 'completed' && a.status !== 'overdue'
    ) || [];

    if (overdueAssignments.length > 0) {
      const overdueIds = overdueAssignments.map(a => a.id);
      await supabase
        .from('scenario_assignments')
        .update({ status: 'overdue' })
        .in('id', overdueIds);

      // Update local data
      assignments?.forEach(a => {
        if (overdueIds.includes(a.id)) {
          a.status = 'overdue';
        }
      });
    }

    return NextResponse.json({
      assignments: assignments || [],
      total: assignments?.length || 0
    });

  } catch (error) {
    console.error('Assignments GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new scenario assignment
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can create assignments
    if (!user.isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      scenarioId, 
      assignToUsers, 
      assignToTeam, 
      deadline,
      assignerName // Add assigner name
    } = body;

    if (!scenarioId || (!assignToUsers && !assignToTeam)) {
      return NextResponse.json(
        { error: 'Scenario ID and assignment target required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const assignments = [];

    // Create assignments for individual users
    if (assignToUsers && Array.isArray(assignToUsers)) {
      for (const userId of assignToUsers) {
        const { data, error } = await supabase
          .from('scenario_assignments')
          .insert({
            scenario_id: scenarioId,
            assigned_by: user.user.id,
            assigned_to_user: userId,
            deadline: deadline || null,
            status: 'not_started'
          })
          .select()
          .single();

        if (!error && data) {
          assignments.push(data);
          
          // Create notification for the assigned user with assigner's name
          await supabase
            .from('notifications')
            .insert({
              recipient_id: userId,
              type: 'assignment_created',
              entity_type: 'scenario_assignment',
              entity_id: data.id,
              payload: {
                scenario_id: scenarioId,
                assignment_id: data.id,
                deadline: deadline,
                assigned_by_name: assignerName || 'Your manager' // Use assigner name
              },
              triggered_at: new Date().toISOString()
            });
        }
      }
    }

    // Create assignment for team
    if (assignToTeam) {
      // Get all users in the team
      const { data: teamUsers } = await supabase
        .from('simple_users')
        .select('id')
        .eq('team_id', assignToTeam);

      if (teamUsers) {
        for (const teamUser of teamUsers) {
          const { data, error } = await supabase
            .from('scenario_assignments')
            .insert({
              scenario_id: scenarioId,
              assigned_by: user.user.id,
              assigned_to_user: teamUser.id,
              assigned_to_team: assignToTeam,
              deadline: deadline || null,
              status: 'not_started'
            })
            .select()
            .single();

          if (!error && data) {
            assignments.push(data);
            
            // Create notification with assigner's name
            await supabase
              .from('notifications')
              .insert({
                recipient_id: teamUser.id,
                type: 'assignment_created',
                entity_type: 'scenario_assignment',
                entity_id: data.id,
                payload: {
                  scenario_id: scenarioId,
                  assignment_id: data.id,
                  deadline: deadline,
                  assigned_by_name: assignerName || 'Your manager', // Use assigner name
                  team_assignment: true
                },
                triggered_at: new Date().toISOString()
              });
          }
        }
      }
    }

    // Log activity
    await logActivity(
      user.user.id,
      'create_assignment',
      'scenario_assignment',
      scenarioId,
      {
        assignments_created: assignments.length,
        assigned_to_users: assignToUsers,
        assigned_to_team: assignToTeam
      },
      req
    );

    return NextResponse.json({
      assignments,
      message: `Successfully created ${assignments.length} assignment(s)`,
      total: assignments.length
    });

  } catch (error) {
    console.error('Assignment creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update assignment (complete, update status, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assignmentId, status, result, score } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    // Check if user can access this assignment
    const canAccess = await canAccessResource(user, 'assignment', assignmentId, 'write');
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();

    // Get current assignment
    const { data: assignment } = await supabase
      .from('scenario_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    
    if (result !== undefined) {
      updateData.result = result;
    }
    
    if (score !== undefined) {
      updateData.score = score;
    }

    // Update assignment
    const { data, error } = await supabase
      .from('scenario_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    // Log activity
    await logActivity(
      user.user.id,
      'update_assignment',
      'scenario_assignment',
      assignmentId,
      updateData,
      req
    );

    return NextResponse.json({ success: true, assignment: data });

  } catch (error) {
    console.error('Assignments PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete assignment
export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('id');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Check if user can delete this assignment
    const canDelete = await canAccessResource(user, 'assignment', assignmentId, 'delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('scenario_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting assignment:', error);
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }

    // Log activity
    await logActivity(
      user.user.id,
      'delete_assignment',
      'scenario_assignment',
      assignmentId,
      {},
      req
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Assignments DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 