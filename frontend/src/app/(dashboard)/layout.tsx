'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Database,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Risks', href: '/risks', icon: FileText },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Admin', href: '/admin/users', icon: Settings, adminOnly: true },
  { name: 'Objects', href: '/admin/objects', icon: Database, adminOnly: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">RiskTracker</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
            {navigation.map((item) => {
              if (item.adminOnly && user?.role !== 'ADMIN') return null;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Button
                  key={item.name}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-10 text-sm font-medium',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/15'
                  )}
                  asChild
                >
                  <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>

          <Separator />

          <div className="p-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.full_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role?.toLowerCase() || 'user'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={logout}
                aria-label="Log out"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <div className="flex-1" />
          <div className="hidden sm:block text-sm text-muted-foreground">
            {user?.full_name}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
