import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return 'N/A';
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return String(date); // Fallback si no se puede parsear
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
  }).format(parsedDate);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function severityClass(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critica':
    case 'crítica':
    case 'critico':
    case 'crítico':
      return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50';
    case 'alta':
    case 'alto':
      return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50';
    case 'media':
    case 'medio':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800/50';
    case 'baja':
    case 'bajo':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

export function estadoColor(estado: string): string {
  switch (estado.toLowerCase()) {
    case 'abierto':
      return 'destructive';
    case 'en_progreso':
    case 'en progreso':
      return 'default';
    case 'resuelto':
      return 'secondary';
    case 'cerrado':
      return 'outline';
    default:
      return 'outline';
  }
}
