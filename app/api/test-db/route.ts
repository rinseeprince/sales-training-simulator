import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Create Supabase admin client for server-side operations
 */
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(_request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin();

    // Check table structure
    let columnError = null;
    let columns = null;
    try {
      const result = await supabaseAdmin
        .rpc('get_table_columns', { table_name: 'simple_users' });
      columns = result.data;
      columnError = result.error;
    } catch (e) {
      columnError = 'RPC not available';
    }

    // Try to get table info using a different approach
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('simple_users')
      .select('*')
      .limit(0);

    // Test if we can insert a minimal record
    const { error: insertError } = await supabaseAdmin
      .from('simple_users')
      .insert({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'dummy_hash', // Add this if the column exists
        email_verified: false,
        subscription_status: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    return NextResponse.json({ 
      success: true,
      tableExists: true,
      insertError: insertError ? insertError.message : null,
      insertErrorCode: insertError ? insertError.code : null,
      tableInfo: tableInfo ? 'Table accessible' : 'Table not accessible',
      columnError: columnError ? (typeof columnError === 'string' ? columnError : columnError.message) : null
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }, { status: 500 });
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { 
    status: 200, 
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}