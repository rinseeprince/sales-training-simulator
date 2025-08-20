import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test 1: Check if we can connect
    const { data: testData, error: testError } = await supabase
      .from('simple_users')
      .select('count(*)')
      .limit(1);
    
    console.log('Connection test:', { testData, testError });
    
    // Test 2: Check table structure
    const { data: structure, error: structureError } = await supabase
      .from('simple_users')
      .select('*')
      .limit(0);
    
    console.log('Structure test:', { structure, structureError });
    
    // Test 3: Try to insert a test record
    const testRecord = {
      id: 'test-' + Date.now(),
      auth_user_id: 'test-auth-' + Date.now(),
      email: 'test@test.com',
      name: 'Test User',
      email_verified: false,
      subscription_status: 'free',
      password_hash: 'supabase_auth',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('simple_users')
      .insert(testRecord)
      .select();
    
    console.log('Insert test:', { insertData, insertError });
    
    // Clean up test record
    if (insertData) {
      await supabase
        .from('simple_users')
        .delete()
        .eq('id', testRecord.id);
    }
    
    return NextResponse.json({
      connection: !testError,
      structure: !structureError,
      insert: !insertError,
      testError,
      structureError,
      insertError
    });
    
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
