'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IngredientList } from './IngredientList';
import { Button } from './ui/button';
import { Card } from './ui/card';

/** Shrink phone photos (often 5-10 MB) to ~1024 px JPEG before upload. Faster and cheaper for the AI. */
async function resizeImage(file: File, maxSide = 1024): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('resize failed'))), 'image/jpeg', 0.85),
    );
  } catch {
    return file; // some formats (e.g. HEIC on desktop Chrome) cannot be drawn; send as-is
  }
}

type Item = { name: string; checked: boolean };

export function ScanFlow({ scansLeft }: { scansLeft: number | null }) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'reading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [needPro, setNeedPro] = useState(false);
  const [left, setLeft] = useState(scansLeft);

  async function handleFile(file: File) {
    setError(null);
    setNeedPro(false);
    setPreview(URL.createObjectURL(file));
    setStatus('uploading');

    try {
      const blob = await resizeImage(file);
      const form = new FormData();
      form.append('photo', blob, 'photo.jpg');
      const up = await fetch('/api/upload', { method: 'POST', body: form });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || 'Upload failed');

      setStatus('reading');
      const scan = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: upData.scanId }),
      });
      const scanData = await scan.json();
      if (!scan.ok) {
        if (scanData.needPro) setNeedPro(true);
        throw new Error(scanData.error || 'Could not read the photo');
      }
      const found: string[] = scanData.ingredients ?? [];
      setItems((old) => [
        ...old,
        ...found.filter((n) => !old.some((o) => o.name === n)).map((name) => ({ name, checked: true })),
      ]);
      if (scanData.scansLeft !== undefined) setLeft(scanData.scansLeft);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setStatus('done');
    }
  }

  const chosen = items.filter((i) => i.checked).map((i) => i.name);
  const busy = status === 'uploading' || status === 'reading';

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">1. Your photo</h2>
        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-paper text-center text-sm text-muted hover:border-brand">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your ingredients" className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="text-3xl">📷</span>
              <span className="mt-2">Tap to take a photo or choose one</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </label>
        <p className="mt-3 text-xs text-muted">
          {status === 'uploading' && 'Uploading…'}
          {status === 'reading' && 'Looking for ingredients… (up to 30 seconds)'}
          {!busy && (left === null ? 'Pro: unlimited scans.' : `${left} free scan${left === 1 ? '' : 's'} left today.`)}
          {!busy && ' You can add another photo to add more ingredients.'}
        </p>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error} {needPro && <Link href="/pro" className="font-medium underline">Go Pro</Link>}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">2. Check your ingredients</h2>
        <p className="mb-4 text-sm text-muted">AI can miss or misname things. Untick mistakes and add what is missing.</p>
        <IngredientList items={items} onChange={setItems} />
        <Button
          className="mt-6 w-full"
          disabled={chosen.length === 0 || busy}
          onClick={() => router.push(`/recipes?i=${encodeURIComponent(chosen.join(','))}`)}
        >
          Find recipes with {chosen.length} ingredient{chosen.length === 1 ? '' : 's'}
        </Button>
      </Card>
    </div>
  );
}
