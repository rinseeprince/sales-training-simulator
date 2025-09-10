import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithRBAC } from '@/lib/rbac-middleware';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Search users
export async function GET(req: NextRequest) {
  try {
    const user = await authenticateWithRBAC(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can search users
    if (user.userRole !== 'manager' && user.userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const domain = searchParams.get('domain') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const supabase = createSupabaseAdmin();

    // Build search query
    let searchQuery = supabase
      .from('simple_users')
      .select('id, name, email, role')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('email_verified', true)
      .order('name');

    // Filter by domain if provided
    if (domain) {
      searchQuery = searchQuery.ilike('email', `%@${domain}`);
    }

    // Limit to users with 'user' role (not managers/admins)
    searchQuery = searchQuery.eq('role', 'user');

    const { data: users, error } = await searchQuery.limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    return NextResponse.json({
      users: users || [],
      total: users?.length || 0
    });

  } catch (error) {
    console.error('User search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 