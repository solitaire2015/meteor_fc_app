import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Allow access to login and welcome pages
    if (pathname === "/login" || pathname === "/welcome") {
      return NextResponse.next();
    }

    // If no token, redirect to login (except for login page)
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin routes
    if (pathname.startsWith("/admin")) {
      if (token.userType !== "ADMIN") {
        // Return 403 response for non-admin users trying to access admin routes
        return new NextResponse("Access Denied", { status: 403 });
      }
    }

    // Check admin API routes
    if (pathname.startsWith("/api/admin")) {
      if (token.userType !== "ADMIN") {
        return new NextResponse(
          JSON.stringify({ success: false, error: "Access denied. Admin privileges required." }),
          { 
            status: 403,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Always allow login and welcome pages
        if (pathname === "/login" || pathname === "/welcome") {
          return true;
        }
        
        // For all other pages, require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|meteor_fc.png).*)",
  ],
};