import { ClerkProvider, SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fridge Chef: recipes from a photo of your ingredients',
  description: 'Snap your ingredients, get recipes and their nutrition.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen font-sans antialiased">
          <header className="border-b border-line bg-white">
            <nav className="mx-auto flex max-w-5xl items-center gap-5 px-4 py-3 text-sm">
              <Link href="/" className="text-lg font-bold text-brand-dark">
                Fridge Chef
              </Link>
              {userId && (
                <>
                  <Link href="/scan" className="hover:text-brand">Scan</Link>
                  <Link href="/favourites" className="hover:text-brand">Favourites</Link>
                  <Link href="/pro" className="hover:text-brand">Pro</Link>
                </>
              )}
              <div className="ml-auto">
                {userId ? (
                  <UserButton />
                ) : (
                  <SignInButton mode="modal">
                    <button className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">
                      Sign in
                    </button>
                  </SignInButton>
                )}
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">
            Recipes from TheMealDB and Spoonacular. Nutrition from USDA FoodData Central; values are estimates.
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
