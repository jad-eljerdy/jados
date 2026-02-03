import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that don't require auth
const publicPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // For protected paths, we'll handle auth client-side
  // (Convex doesn't have server-side session validation easily)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
