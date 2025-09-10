import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithRBAC } from '@/lib/rbac-middleware';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Fetch teams
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from('teams')
      .select('*')
      .order('name');

    // Regular users can only see their own team
    if (user.userRole === 'user' && user.teamId) {
      query = query.eq('id', user.teamId);
    }
    // Managers and admins can see all teams

    const { data: teams, error } = await query;

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    return NextResponse.json({
      teams: teams || [],
      total: teams?.length || 0
    });

  } catch (error) {
    console.error('Teams API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 