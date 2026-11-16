import { SignInButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function Home() {
  const { userId } = await auth();

  const steps = [
    ['1', 'Snap your ingredients', 'Take a photo of your fridge, counter or shopping bag.'],
    ['2', 'Check the list', 'AI spots the ingredients. Untick mistakes, add anything it missed.'],
    ['3', 'Pick a recipe', 'We search recipe sites and rank by what you already have.'],
    ['4', 'See the nutrition', 'Calories, protein, fat and carbs per serving.'],
  ];

  return (
    <div className="space-y-12">
      <section className="space-y-5 pt-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">What can I cook with this?</h1>
        <p className="mx-auto max-w-xl text-lg text-muted">
          Upload a photo of your ingredients. Fridge Chef finds recipes you can make and shows the nutrition
          of each one.
        </p>
        {userId ? (
          <Link
            href="/scan"
            className="inline-block rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark"
          >
            Scan my ingredients
          </Link>
        ) : (
          <SignInButton mode="modal" forceRedirectUrl="/scan">
            <button className="rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
              Sign in to start
            </button>
          </SignInButton>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([n, title, text]) => (
          <div key={n} className="rounded-xl border border-line bg-white p-5">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-bold text-brand-dark">
              {n}
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
