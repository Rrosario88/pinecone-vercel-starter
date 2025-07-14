import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - can be extended to check database connections, etc.
    return NextResponse.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed' }, 
      { status: 500 }
    );
  }
}