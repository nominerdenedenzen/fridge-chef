// Clerk runs on every request so `auth()` works everywhere.
// Next.js 16 calls this file proxy.ts. On Next.js 15 or older, rename it to middleware.ts
// (the code stays the same).
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Pages that need a signed-in user. API routes check the user themselves
// (n8n and Wire.mn call some of them without a Clerk session).
const isProtectedPage = createRouteMatcher(['/scan(.*)', '/recipes(.*)', '/favourites(.*)', '/pro(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedPage(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
