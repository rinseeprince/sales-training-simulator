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
  console.log('🔍 User search API called');
  
  try {
    const user = await authenticateWithRBAC(req);
    console.log('🔍 Authenticated user:', { userId: user?.user?.id, role: user?.userRole });
    
    if (!user) {
      console.log('❌ No authenticated user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can search users
    if (user.userRole !== 'manager' && user.userRole !== 'admin') {
      console.log('❌ User not authorized for search:', user.userRole);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const domain = searchParams.get('domain') || '';

    console.log('🔍 Search parameters:', { query, domain, queryLength: query.length });

    if (!query || query.length < 2) {
      console.log('❌ Query too short or empty');
      return NextResponse.json({ users: [] });
    }

    const supabase = createSupabaseAdmin();
    console.log('🔍 Supabase client created');

    // Let's first try a simple query to see if we can get any users at all
    console.log('🔍 Testing basic query...');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('simple_users')
      .select('id, name, email, role, email_verified')
      .limit(5);
    
    console.log('🔍 All users test:', { allUsers, allUsersError });

    // Now let's try the actual search query
    console.log('🔍 Building search query...');
    
    let searchQuery = supabase
      .from('simple_users')
      .select('id, name, email, role, email_verified')
      .eq('email_verified', true);

    console.log('🔍 Base query created');

    // Search in email primarily, and name if it's not null/empty
    searchQuery = searchQuery.or(`email.ilike.%${query}%,name.ilike.%${query}%`);
    console.log('🔍 Added search conditions');

    // Filter by domain if provided
    if (domain) {
      searchQuery = searchQuery.ilike('email', `%@${domain}`);
      console.log('🔍 Added domain filter:', domain);
    }

    // For admins, include all users (including other admins for testing)
    // For managers, only include users with 'user' role or null/empty roles
    if (user.userRole === 'admin') {
      // Admins can see all users, including other admins and managers
      console.log('🔍 Admin user - including all roles');
    } else {
      // Managers only see regular users
      searchQuery = searchQuery.or('role.eq.user,role.is.null');
      console.log('🔍 Manager user - filtering to user roles only');
    }

    // Order by email since name might be empty
    searchQuery = searchQuery.order('email');
    console.log('🔍 Added ordering');

    const { data: users, error } = await searchQuery.limit(20);

    console.log('🔍 Search results:', { 
      users, 
      error, 
      userCount: users?.length,
      searchQuery: `email.ilike.%${query}%,name.ilike.%${query}%`
    });

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: 'Failed to search users', details: error }, { status: 500 });
    }

    // Process results to handle empty names
    const processedUsers = (users || []).map(user => ({
      ...user,
      name: user.name || user.email?.split('@')[0] || 'Unknown User'
    }));

    console.log('🔍 Processed users:', processedUsers);

    return NextResponse.json({
      users: processedUsers,
      total: processedUsers.length,
      debug: {
        query,
        domain,
        rawResults: users?.length || 0,
        processedResults: processedUsers.length
      }
    });

  } catch (error) {
    console.error('❌ User search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 