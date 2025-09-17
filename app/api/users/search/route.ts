import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

function extractDomain(email: string): string {
  return email.split('@')[1];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Support both new format (for rep filtering) and old format (for user assignments)
    const currentUserEmail = searchParams.get('currentUserEmail');
    const currentUserRole = searchParams.get('currentUserRole');
    const query = searchParams.get('q'); // Old format
    const domain = searchParams.get('domain'); // Old format
    
    console.log('🔍 User search API called with params:', {
      currentUserEmail,
      currentUserRole,
      query,
      domain,
      url: request.url
    });
    
    // New format: for rep filtering
    if (currentUserEmail && currentUserRole) {
      // Only allow admin and manager roles to access this endpoint
      if (!['admin', 'manager'].includes(currentUserRole)) {
        return NextResponse.json({ 
          error: 'Unauthorized - only admins and managers can access this endpoint',
          success: false 
        }, { status: 403 });
      }

      const supabaseAdmin = createSupabaseAdmin();
      const currentUserDomain = extractDomain(currentUserEmail);

      // Get all users from the same domain
      // Don't require email_verified for admin/manager searches
      const { data: users, error } = await supabaseAdmin
        .from('simple_users')
        .select('id, name, email, role, email_verified')
        .like('email', `%@${currentUserDomain}`)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching domain users:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch users',
          details: error.message,
          success: false 
        }, { status: 500 });
      }

      console.log(`🔍 Found ${users?.length || 0} users in domain "${currentUserDomain}"`);

      // Filter out the current user from the results
      // Also process names to handle null/empty names
      const filteredUsers = (users?.filter(user => user.email !== currentUserEmail) || [])
        .map(user => ({
          ...user,
          name: user.name || user.email?.split('@')[0] || 'Unknown User'
        }));

      return NextResponse.json({ 
        success: true,
        users: filteredUsers
      });
    }
    
    // Old format: for user assignments (backward compatibility)
    if (query && domain) {
      if (query.length < 2) {
        return NextResponse.json({ users: [] });
      }

      const supabaseAdmin = createSupabaseAdmin();

      console.log('🔍 User search request:', { query, domain });

      // Build the search query - search by email OR name containing the query
      // Don't require email_verified for admin searches
      let searchQuery = supabaseAdmin
        .from('simple_users')
        .select('id, name, email, role, email_verified')
        .like('email', `%@${domain}`);

      // Apply search filter - search in email OR name
      // Using two separate queries combined with OR for better compatibility
      if (query) {
        searchQuery = searchQuery.or(`email.ilike.%${query}%,name.ilike.%${query}%`);
      }

      searchQuery = searchQuery.order('email').limit(20);

      const { data: users, error } = await searchQuery;

      if (error) {
        console.error('Error searching users:', error);
        return NextResponse.json({ 
          error: 'Failed to search users',
          details: error.message
        }, { status: 500 });
      }

      console.log(`🔍 Found ${users?.length || 0} users matching query "${query}" in domain "${domain}"`);

      // Process results to handle empty names
      const processedUsers = (users || []).map(user => ({
        ...user,
        name: user.name || user.email?.split('@')[0] || 'Unknown User'
      }));

      return NextResponse.json({
        users: processedUsers,
        total: processedUsers.length
      });
    }

    // Neither format provided
    return NextResponse.json({ 
      error: 'Either (currentUserEmail and currentUserRole) or (q and domain) parameters are required',
      success: false 
    }, { status: 400 });

  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search users',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
} 