import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Server-only client with the service role key. Never import this in a 'use client' file.
// Created on first use, so a missing key gives a clear error at runtime instead of breaking the build.
let client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return client;
}

export const BUCKET = process.env.SUPABASE_BUCKET || 'fridge-photos';

export async function uploadPhoto(path: string, bytes: ArrayBuffer, contentType: string) {
  const { error } = await supabase().storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
}

/** Download a photo and return it as a data URL that AI models accept. */
export async function photoAsDataUrl(path: string): Promise<string> {
  const { data, error } = await supabase().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Could not read photo: ${error?.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:${data.type || 'image/jpeg'};base64,${buf.toString('base64')}`;
}

/** Short-lived link so the page can show a private photo. */
export async function signedPhotoUrl(path: string, seconds = 3600): Promise<string | null> {
  const { data } = await supabase().storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
