import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  const buildTime = process.env.BUILD_TIME || new Date().toISOString();
  
  return NextResponse.json({
    version,
    buildTime,
    timestamp: new Date().toISOString()
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
