'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bell, ChevronRight, User, LogOut } from 'lucide-react';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  fideicomisos: 'Fideicomisos',
  conciliacion: 'Conciliaci\u00f3n',
  hallazgos: 'Hallazgos',
  revenue: 'Revenue',
  conocimiento: 'Conocimiento',
  'variables-macro': 'Variables Macro',
  reportes: 'Reportes',
  nuevo: 'Nuevo',
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let currentPath = '';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label =
      breadcrumbMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({ label, href: currentPath });
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const breadcrumbs = getBreadcrumbs(pathname || '/dashboard');
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const userName = session?.user?.name || "Cargando...";
  const userRole = (session?.user as any)?.role?.replace('_', ' ') || "Usuario";
  const userInitials = userName !== "Cargando..." 
    ? userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : "US";

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#333333] bg-[#1C1C1C] px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-white/40" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-white">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-white/60 hover:text-white transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
          <Bell className="h-4 w-4 text-white" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fidu-accent text-[10px] text-white">
            3
          </span>
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 h-auto py-2 px-3 hover:bg-white/10"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <span className="text-xs font-bold text-white shadow-sm">{userInitials}</span>
            </div>
            <div className="flex flex-col items-start leading-none group-hover:text-white transition-colors">
              <span className="text-sm font-semibold text-white">{userName}</span>
              <span className="text-[10px] text-white/60 mt-1 capitalize">{userRole.toLowerCase()}</span>
            </div>
          </Button>

          {showUserMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-[#333333] bg-[#222222] p-1 shadow-lg">
              <button className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white">
                <User className="h-4 w-4" />
                Mi Perfil
              </button>
              <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
