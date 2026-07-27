import { NextResponse, NextRequest } from "next/server";

const COOKIE_NAME = "auth_session_token";

// Edge-safe JWT decoder using Web APIs (no Node.js crypto dependencies)
function decodeJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const jsonPayload = decodeURIComponent(
      raw
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const isAuthPage = pathname.startsWith("/login");
  const isDashboardPage = pathname.startsWith("/dashboard");

  let user = null;
  if (token) {
    user = decodeJwt(token);
  }

  if (isDashboardPage && !user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
