import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    // req.nextUrl.origin reflects Next.js's own internal bind address
    // (localhost:3000 in the container), not the public domain — behind
    // a reverse proxy that sends the app on a redirect loop to localhost.
    // NEXTAUTH_URL is set to the real public URL; prefer it, and only
    // fall back to req.nextUrl.origin for local dev without a proxy.
    const baseUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin;
    const loginUrl = new URL("/login", baseUrl);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
