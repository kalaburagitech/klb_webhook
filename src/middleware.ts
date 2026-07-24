import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const adminAuth = request.cookies.get("admin_auth");
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isApiWebhook = request.nextUrl.pathname.startsWith("/api/webhook"); // if nextjs proxy is used

  if (isApiWebhook) {
    return NextResponse.next();
  }

  if (!adminAuth && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (adminAuth && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
