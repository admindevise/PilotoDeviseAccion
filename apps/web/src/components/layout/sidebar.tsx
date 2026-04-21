'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  GitCompareArrows,
  AlertTriangle,
  DollarSign,
  BookOpen,
  TrendingUp,
  FileText,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

import { LogOut } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Fideicomisos',
    href: '/fideicomisos',
    icon: Building2,
  },
  {
    label: 'Conciliación',
    href: '/conciliacion',
    icon: GitCompareArrows,
  },
  {
    label: 'Hallazgos',
    href: '/hallazgos',
    icon: AlertTriangle,
  },
  {
    label: 'Revenue',
    href: '/revenue',
    icon: DollarSign,
  },
  {
    label: 'Contabilidad',
    href: '/contabilidad',
    icon: CreditCard,
  },
  {
    label: 'Conocimiento',
    href: '/conocimiento',
    icon: BookOpen,
  },
  {
    label: 'Variables Macro',
    href: '/variables-macro',
    icon: TrendingUp,
  },
  {
    label: 'Reportes',
    href: '/reportes',
    icon: FileText,
  },
  {
    label: 'Administración',
    href: '/admin',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userName = session?.user?.name || "Cargando...";
  const userRole = (session?.user as any)?.role?.replace('_', ' ') || "Usuario";
  const userInitials = userName !== "Cargando..." 
    ? userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : "US";

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col bg-[#1C1C1C] text-white border-r border-[#333333] transition-all duration-300 ease-in-out z-20',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-[#333333] bg-[#1C1C1C] text-white/70 hover:bg-white/10 hover:text-white transition-colors z-30"
        title={isCollapsed ? "Expandir" : "Colapsar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Logo / Brand */}
      <div className="flex h-16 items-center justify-center border-b border-[#333333] px-2 overflow-hidden">
        <Link href="/dashboard" className="flex items-center justify-center w-full">
          <div className="relative h-14 w-full flex items-center justify-center">
            {isCollapsed ? (
              <img
                src="/AccionLogoSq.png"
                alt="AF"
                className="h-10 w-10 object-contain bg-white p-1 rounded-md shadow-sm mx-auto transition-all duration-300"
              />
            ) : (
               <img
                src="/logo.png"
                alt="Acción Fiduciaria"
                className="h-14 w-auto max-w-full object-contain bg-white px-2 py-1 rounded-md shadow-sm transition-all duration-300"
              />
            )}
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 py-4 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <div key={item.href} className="relative group">
              <Link
                href={item.href}
                className={cn(
                  'flex items-center rounded-md py-2.5 transition-colors',
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  isActive
                    ? 'bg-fidu-accent text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className={cn("shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                {!isCollapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
              {isCollapsed && (
                <div className="absolute left-full top-1/2 ml-4 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#222222] border border-[#444444] px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-50 shadow-xl">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer User Profile */}
      <div
        className={cn(
          'border-t border-[#333333] mt-auto transition-all duration-300',
          isCollapsed ? 'p-4' : 'p-4'
        )}
      >
        <div
          className={cn(
            'flex items-center rounded-lg border border-[#444444] bg-[#222222] shadow-sm transition-all duration-300 overflow-hidden',
            isCollapsed ? 'p-1.5 justify-center' : 'gap-3 p-3'
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <span className="text-sm font-bold text-white shadow-sm">{userInitials}</span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-sm font-semibold leading-none text-white truncate">
                {userName}
              </span>
              <span className="text-[11px] text-white/60 mt-1 truncate capitalize">
                {userRole.toLowerCase()}
              </span>
            </div>
          )}
          
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={cn(
              "ml-auto flex shrink-0 items-center justify-center rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors",
              isCollapsed && "hidden"
            )}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
