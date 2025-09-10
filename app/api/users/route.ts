import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithRBAC } from '@/lib/rbac-middleware';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Fetch users (for managers/admins)
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role'); // Filter by role
    const teamId = searchParams.get('teamId'); // Filter by team

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from('simple_users')
      .select('id, name, email, role, team_id, manager_id');

    // Apply filters based on user's role
    if (user.userRole === 'manager') {
      // Managers can see their team members
      if (user.teamId) {
        query = query.eq('team_id', user.teamId);
      } else {
        // Manager without team - show users they manage
        query = query.eq('manager_id', user.user.id);
      }
    } else if (user.userRole === 'admin') {
      // Admins can see all users
      // Apply optional filters
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
    } else {
      // Regular users can only see themselves
      query = query.eq('id', user.user.id);
    }

    // Filter by role if specified
    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error } = await query.order('name');

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({
      users: users || [],
      total: users?.length || 0
    });

  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 