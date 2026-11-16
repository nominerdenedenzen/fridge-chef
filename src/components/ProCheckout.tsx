'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';

type Invoice = { orderId: string; payUrl: string | null; qrImage: string | null; mode: 'mock' | 'live' };

export function ProCheckout({ price }: { price: number }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    const res = await fetch('/api/pay/create', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Could not start payment');
    setInvoice(data);
    setStatus('pending');
  }

  // Ask our server every 3 seconds whether the webhook has marked the order paid.
  useEffect(() => {
    if (!invoice || status !== 'pending') return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/pay/create?orderId=${invoice.orderId}`);
      const data = await res.json();
      if (data.status && data.status !== 'pending') {
        setStatus(data.status);
        if (data.status === 'paid') router.refresh();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [invoice, status, router]);

  async function simulate() {
    if (!invoice) return;
    await fetch('/api/pay/mock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: invoice.orderId }),
    });
  }

  if (status === 'paid') {
    return <p className="rounded-lg bg-brand-soft p-4 font-medium text-brand-dark">Payment received. You are Pro! 🎉</p>;
  }

  if (!invoice) {
    return (
      <div className="space-y-2">
        <Button onClick={start}>Pay {price.toLocaleString()}₮ with my bank app</Button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invoice.qrImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={invoice.qrImage} alt="Scan with your bank app" className="h-48 w-48 rounded-lg border border-line" />
      )}
      {invoice.payUrl && (
        <a href={invoice.payUrl} target="_blank" rel="noreferrer" className="inline-block rounded-lg bg-brand px-4 py-2 font-medium text-white">
          Open my bank app
        </a>
      )}
      <p className="text-sm text-muted">Waiting for your payment… this page updates by itself.</p>
      {invoice.mode === 'mock' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="mb-2 text-amber-900">Test mode (WIRE_MODE=mock): no real payment happens.</p>
          <Button variant="outline" onClick={simulate}>Simulate a successful payment</Button>
        </div>
      )}
      {status === 'failed' && <p className="text-sm text-red-700">The payment failed. Please try again.</p>}
    </div>
  );
}
