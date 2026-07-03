import { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'RiskTracker - Sign In',
  description: 'Sign in to RiskTracker',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-xl text-gray-900 dark:text-white">
          <Shield className="h-7 w-7 text-blue-600" />
          <span>RiskTracker</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center">
        {children}
      </main>
    </div>
  );
}
