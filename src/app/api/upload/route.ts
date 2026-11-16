import { NextResponse } from 'next/server';
import { db, scans } from '@/db';
import { requireUser } from '@/lib/auth';
import { uploadPhoto } from '@/lib/supabase';

// POST /api/upload  (form-data: photo=<file>)  ->  { scanId }
export async function POST(req: Request) {
  const { userId, error } = await requireUser();
  if (!userId) return error!;

  const form = await req.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No photo sent' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'That file is not an image' }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Photo is too large (max 4 MB)' }, { status: 413 });
  }

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  await uploadPhoto(path, await file.arrayBuffer(), file.type);

  const [scan] = await db.insert(scans).values({ userId, photoPath: path }).returning({ id: scans.id });
  return NextResponse.json({ scanId: scan.id });
}
