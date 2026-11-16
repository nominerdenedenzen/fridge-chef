import { auth } from '@clerk/nextjs/server';
import { ProCheckout } from '@/components/ProCheckout';
import { Card } from '@/components/ui/card';
import { proUntil, scansLeftToday } from '@/lib/pro';

export default async function ProPage() {
  const { userId } = await auth();
  const [until, left] = await Promise.all([proUntil(userId!), scansLeftToday(userId!)]);
  const active = !!until && until > new Date();
  const price = Number(process.env.PRO_PRICE_MNT || 9900);
  const days = Number(process.env.PRO_DAYS || 30);
  const free = Number(process.env.FREE_SCANS_PER_DAY || 5);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Fridge Chef Pro</h1>
      <Card className="space-y-4 p-6">
        <p className="text-3xl font-bold">
          {price.toLocaleString()}₮ <span className="text-base font-medium text-muted">/ {days} days</span>
        </p>
        <ul className="space-y-1 text-sm">
          <li>✓ Unlimited photo scans (free: {free} per day)</li>
          <li>✓ Pay with any Mongolian bank app through Wire.mn</li>
          <li>✓ No card, no subscription. It simply ends after {days} days</li>
        </ul>
        {active ? (
          <p className="rounded-lg bg-brand-soft p-4 text-brand-dark">
            You are Pro until <strong>{until!.toLocaleDateString()}</strong>. Paying again adds {days} more days.
          </p>
        ) : (
          <p className="text-sm text-muted">Free scans left today: {left}</p>
        )}
        <ProCheckout price={price} />
      </Card>
    </div>
  );
}
