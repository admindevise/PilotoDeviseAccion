import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import NextAuthProvider from '@/components/providers/next-auth-provider';

const montserrat = Montserrat({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FiduConciliation — Plataforma de Conciliación Fiduciaria',
  description: 'Conciliación integral de operaciones fiduciarias colombianas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={montserrat.className}>
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
