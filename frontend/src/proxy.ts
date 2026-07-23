import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Bu Next.js sürümünde middleware.ts kullanımdan kalktı, yerine proxy.ts geldi
// (dosya adı ve export ismi değişti, davranış aynı - bkz. node_modules/next/dist/docs).
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
