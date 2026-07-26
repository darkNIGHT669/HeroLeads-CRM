import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "auth_session_token";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secret-key-1234-change-in-prod";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Let public routes pass
  const isAuthPage = pathname.startsWith("/login");
  const isDashboardPage = pathname.startsWith("/dashboard");

  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, JWT_SECRET) as {
        id: string;
        name: string;
        email: string;
        role: "ADMIN" | "MEMBER";
      };
    } catch (e) {
      // Invalid token
    }
  }

  if (isDashboardPage && !user) {
    // Redirect to login if trying to access dashboard while unauthenticated
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Clear cookie just in case it was invalid
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  if (isAuthPage && user) {
    // Redirect to dashboard if logged in
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
