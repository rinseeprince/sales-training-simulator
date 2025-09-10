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

    console.log('Search query:', { query, domain });

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const supabase = createSupabaseAdmin();

    // Build search query - focus on email since name might be empty
    let searchQuery = supabase
      .from('simple_users')
      .select('id, name, email, role')
      .eq('email_verified', true);

    // Search in email primarily, and name if it's not null/empty
    searchQuery = searchQuery.or(`email.ilike.%${query}%,name.ilike.%${query}%`);

    // Filter by domain if provided
    if (domain) {
      searchQuery = searchQuery.ilike('email', `%@${domain}`);
    }

    // Only include users with 'user' role if the role column exists and is set
    // But don't exclude users if role is null/empty (for backward compatibility)
    searchQuery = searchQuery.or('role.eq.user,role.is.null');

    // Order by email since name might be empty
    searchQuery = searchQuery.order('email');

    const { data: users, error } = await searchQuery.limit(20);

    console.log('Search results:', { users, error });

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
    }

    // Process results to handle empty names
    const processedUsers = (users || []).map(user => ({
      ...user,
      name: user.name || user.email?.split('@')[0] || 'Unknown User'
    }));

    console.log('Processed users:', processedUsers);

    return NextResponse.json({
      users: processedUsers,
      total: processedUsers.length
    });

  } catch (error) {
    console.error('User search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 