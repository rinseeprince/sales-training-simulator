import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    console.log('Setting up test user...');
    
    // Validate environment variables
    validateEnvVars();

    // Insert test user
    const testUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'samuel.k',
      email: 'samuel.k@example.com',
      role: 'rep',
      department: 'Sales',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // First try to insert, if it fails due to foreign key constraint, 
    // we'll need to run the development setup script
    const { data, error } = await supabase
      .from('users')
      .upsert(testUser, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert test user:', error);
      return errorResponse(`Failed to create test user: ${error.message}`, 500);
    }

    console.log('Test user created successfully:', data);

    return successResponse({
      success: true,
      message: 'Test user created successfully',
      user: data
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Setup test user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 