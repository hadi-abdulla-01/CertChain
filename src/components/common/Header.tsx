'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Lock, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { WalletButton } from '@/components/common/WalletButton';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <header className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">CertChain</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-3">
          {isAdmin ? (
            /* On admin pages: show wallet connect button */
            <WalletButton />
          ) : (
            /* On public pages: show Admin Login button */
            <Button asChild variant="outline" size="sm">
              <Link href="/login">
                <Lock className="mr-2 h-4 w-4" />
                Admin Login
              </Link>
            </Button>
          )}

          {/* Always show verify link */}
          <Button asChild variant="ghost" size="sm">
            <Link href="/verify">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verify
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
