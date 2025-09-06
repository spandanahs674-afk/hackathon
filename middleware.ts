import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define protected routes that require authentication
const protectedRoutes = ["/dashboard", "/projects", "/tasks", "/profile", "/settings"]

// Define public routes that don't require authentication
const publicRoutes = ["/auth/login", "/auth/register", "/"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Check if the current path is public
  const isPublicRoute = publicRoutes.includes(pathname)

  // Get the authentication token from cookies
  const token = request.cookies.get("auth-token")?.value

  // If accessing a protected route without authentication
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If accessing auth pages while already authenticated
  if (token && (pathname.startsWith("/auth/") || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
