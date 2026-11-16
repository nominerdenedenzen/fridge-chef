import type { ButtonHTMLAttributes } from 'react';

// A small shadcn-style button. You can swap it for the real one with `npx shadcn@latest add button`.
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' };

const styles = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:opacity-50',
  outline: 'border border-line bg-white text-ink hover:bg-brand-soft disabled:opacity-50',
  ghost: 'text-ink hover:bg-brand-soft disabled:opacity-50',
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
