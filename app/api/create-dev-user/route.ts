import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    console.log('Creating development user...');
    
    // Validate environment variables
    validateEnvVars();

    // Try to create the user directly with SQL to bypass foreign key constraints
    const { data, error } = await supabase
      .rpc('create_dev_user', {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        user_name: 'samuel.k',
        user_email: 'samuel.k@example.com',
        user_role: 'rep',
        user_department: 'Sales'
      });

    if (error) {
      console.error('Failed to create dev user:', error);
      
      // Fallback: try direct insert (this will fail if foreign key constraint exists)
      const testUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'samuel.k',
        email: 'samuel.k@example.com',
        role: 'rep',
        department: 'Sales',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert(testUser)
        .select()
        .single();

      if (insertError) {
        return errorResponse(`Failed to create test user. Please run the development setup script in Supabase SQL Editor: ${insertError.message}`, 500);
      }

      return successResponse({
        success: true,
        message: 'Test user created successfully',
        user: insertData
      }, 200, corsHeaders);
    }

    return successResponse({
      success: true,
      message: 'Development user created successfully',
      user: data
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Create dev user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 