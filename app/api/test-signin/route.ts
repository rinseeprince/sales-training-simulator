import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmail } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    console.log('Testing signin with:', { email });
    
    const result = await signInWithEmail(email, password);
    
    console.log('Signin result:', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Test signin error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Test signin failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
