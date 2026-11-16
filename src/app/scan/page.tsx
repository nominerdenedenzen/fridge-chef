import { auth } from '@clerk/nextjs/server';
import { ScanFlow } from '@/components/ScanFlow';
import { scansLeftToday } from '@/lib/pro';

export default async function ScanPage() {
  const { userId } = await auth();
  const left = await scansLeftToday(userId!);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scan your ingredients</h1>
        <p className="text-muted">One clear photo works best: good light, labels facing you, not too crowded.</p>
      </div>
      <ScanFlow scansLeft={left === Infinity ? null : left} />
    </div>
  );
}
