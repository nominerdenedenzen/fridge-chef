'use client';

import { useState } from 'react';
import { Button } from './ui/button';

export function FavouriteButton({ recipeId, initial }: { recipeId: string; initial: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await fetch('/api/favourites', {
      method: saved ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId }),
    });
    if (res.ok) setSaved(!saved);
    setBusy(false);
  }

  return (
    <Button variant={saved ? 'primary' : 'outline'} onClick={toggle} disabled={busy}>
      {saved ? '♥ Saved' : '♡ Save'}
    </Button>
  );
}
