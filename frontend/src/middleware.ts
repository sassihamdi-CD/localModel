import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Get token from cookie (if you store it there) or check other auth
    // Since we store token in localStorage (common in client-side auth), middleware can't easily access it unless we use cookies.
    // We used 'auth-provider' which uses localStorage (implied in previous turns or standard pattern).
    // If using localStorage, middleware cannot check auth state effectively for purely client-side apps.
    // However, we can check for a cookie if we set one.

    // For this implementation, we will rely on Client-Side protection in AuthProvider.
    // Middleware is useful if we use HttpOnly cookies.
    // Given the `api.ts` implementation using Bearer token likely from localStorage, 
    // we'll skip middleware for auth check to avoid complexity of syncing localStorage to cookies.
    // But we can use it for simple redirects if needed.

    return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: '/:path*',
}
