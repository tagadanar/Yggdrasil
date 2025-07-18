// packages/frontend/middleware.ts
// Next.js middleware to handle authentication headers for API requests

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only process API routes that need authentication
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Clone the request to add headers
    const requestHeaders = new Headers(request.headers);
    
    // Get access token from cookies
    const accessToken = request.cookies.get('yggdrasil_access_token')?.value;
    
    if (accessToken) {
      // Add Authorization header for microservice authentication
      requestHeaders.set('Authorization', `Bearer ${accessToken}`);
    }

    // Return the response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/api/users/:path*',
    '/api/news/:path*',
    '/api/courses/:path*',
    '/api/planning/:path*',
    '/api/statistics/:path*',
  ],
};