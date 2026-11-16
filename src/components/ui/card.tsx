import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-line bg-white shadow-sm ${className}`} {...props} />;
}

export function Badge({
  className = '',
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'good' | 'warn' }) {
  const tones = {
    neutral: 'bg-gray-100 text-muted',
    good: 'bg-brand-soft text-brand-dark',
    warn: 'bg-amber-50 text-amber-800',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
