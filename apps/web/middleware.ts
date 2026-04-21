import { withAuth } from "next-auth/middleware";

if (!process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL_INTERNAL) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL_INTERNAL;
}

export default withAuth({
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "fidu-conciliation-super-secret-key-2026",
});

export const config = {
  // Protect all routes except login, api, _next/static, _next/image, favicon.ico and images
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
