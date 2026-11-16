import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/** In an API route: get the signed-in user, or a 401 response to return. */
export async function requireUser(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const { userId } = await auth();
  if (!userId) {
    return { userId: null, error: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) };
  }
  return { userId, error: null };
}

/** For routes n8n calls: check the shared secret header. */
export function checkN8nSecret(req: Request): NextResponse | null {
  const secret = process.env.N8N_SECRET;
  if (!secret || req.headers.get('x-n8n-secret') !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
