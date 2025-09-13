import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Debug users data
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug endpoint called');
    const supabase = createSupabaseAdmin();

    // Test 1: Get all users
    console.log('🔍 Test 1: Getting all users...');
    const { data: allUsers, error: allUsersError } = await supabase
      .from('simple_users')
      .select('*')
      .limit(10);

    console.log('🔍 All users result:', { allUsers, allUsersError });

    // Test 2: Search for specific email
    console.log('🔍 Test 2: Searching for jay.grant...');
    const { data: jayUsers, error: jayError } = await supabase
      .from('simple_users')
      .select('*')
      .ilike('email', '%jay.grant%');

    console.log('🔍 Jay search result:', { jayUsers, jayError });

    // Test 3: Search for taboola domain
    console.log('🔍 Test 3: Searching for taboola.com domain...');
    const { data: taboolaUsers, error: taboolaError } = await supabase
      .from('simple_users')
      .select('*')
      .ilike('email', '%@taboola.com');

    console.log('🔍 Taboola domain result:', { taboolaUsers, taboolaError });

    // Test 4: Test the exact search query from the search API
    console.log('🔍 Test 4: Testing exact search query...');
    const { data: searchTest, error: searchError } = await supabase
      .from('simple_users')
      .select('id, name, email, role, email_verified')
      .or('email.ilike.%jay%,name.ilike.%jay%')
      .eq('email_verified', true)
      .ilike('email', '%@taboola.com')
      .or('role.eq.user,role.is.null');

    console.log('🔍 Exact search test result:', { searchTest, searchError });

    return NextResponse.json({
      debug: 'User debug endpoint',
      tests: {
        allUsers: { data: allUsers, error: allUsersError },
        jaySearch: { data: jayUsers, error: jayError },
        taboolaSearch: { data: taboolaUsers, error: taboolaError },
        exactSearchTest: { data: searchTest, error: searchError }
      }
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug endpoint failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 