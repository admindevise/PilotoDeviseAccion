'use client';

import React, { useEffect, useState } from 'react';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { RecentHallazgos } from '@/components/dashboard/recent-hallazgos';
import {
  Building2,
  GitCompareArrows,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { apiGet, apiGetWithMeta } from '@/lib/api';

interface DashboardStats {
  totalFideicomisos: number;
  conciliacionesMes: number;
  hallazgosAbiertos: number;
  revenuePotencial: number;
}

interface RevenueByCategoria {
  categoria: string;
  monto: number;
  cantidad: number;
}

interface RevenueBySubcategoria {
  subcategoria: string;
  monto: number;
  cantidad: number;
}

interface RevenueSummary {
  byCategoria: RevenueByCategoria[];
  bySubcategoria?: RevenueBySubcategoria[];
}

import { Divider } from '@/components/ui/divider';

const CATEGORY_COLORS: Record<string, string> = {
  CONCILIACION: '#ef4444',
  REVENUE: '#10b981',
  ANOMALIA: '#f59e0b',
  CONSISTENCIA: '#6366f1',
  REVENUE_NO_CAPTURADO: '#10b981',
  CARTERA_VENCIDA: '#ef4444',
  RIESGO_NEGATIVO: '#f59e0b',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalFideicomisos: 0,
    conciliacionesMes: 0,
    hallazgosAbiertos: 0,
    revenuePotencial: 0,
  });
  const [hallazgos, setHallazgos] = useState<never[]>([]);
  const [subcategorias, setSubcategorias] = useState<
    { subcategoria: string; monto: number; cantidad: number }[]
  >([]);
  const [totalRevenueRecuperable, setTotalRevenueRecuperable] = useState(0);
  const [subcatData, setSubcatData] = useState<{ noCapturado: number; cartera: number; riesgo: number }>({ noCapturado: 0, cartera: 0, riesgo: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [fideicomisosData, hallazgosData, conciliacionesData, revenueData] =
          await Promise.allSettled([
            apiGet<{ items: unknown[] }>('/fideicomisos'),
            apiGet<{ items: unknown[] }>('/hallazgos'),
            apiGetWithMeta<unknown[]>('/conciliaciones'),
            apiGet<RevenueSummary>('/revenue/summary'),
          ]);

        const fideicomisos =
          fideicomisosData.status === 'fulfilled'
            ? fideicomisosData.value
            : { items: [] };
        const hallazgosResult =
          hallazgosData.status === 'fulfilled'
            ? hallazgosData.value
            : { items: [] };

        const items = Array.isArray(fideicomisos)
          ? fideicomisos
          : (fideicomisos as { items?: unknown[] }).items || [];
        const hItems = Array.isArray(hallazgosResult)
          ? hallazgosResult
          : (hallazgosResult as { items?: unknown[] }).items || [];

        // Conciliaciones count from meta.total
        let conciliacionesMes = 0;
        if (conciliacionesData.status === 'fulfilled') {
          const cResult = conciliacionesData.value;
          conciliacionesMes = cResult.meta?.total ?? 0;
        }

        // Revenue summary
        let revenuePotencial = 0;
        if (revenueData.status === 'fulfilled') {
          const rRaw = revenueData.value as any;
          const rData = rRaw?.data || rRaw; // unwrap nested data
          const byCategoria = rData?.byCategoria || [];
          revenuePotencial = byCategoria.reduce(
            (acc: number, c: RevenueByCategoria) => acc + (c.monto || 0),
            0,
          );

          // Parse subcategoria data
          const bySubcat = rData?.bySubcategoria || [];
          const findSubcat = (key: string) => bySubcat.find((s: RevenueBySubcategoria) => s.subcategoria === key)?.monto || 0;

          setSubcategorias(bySubcat);

          // Revenue Potencial = only No Capturado + Cartera Vencida
          const noCapturado = findSubcat('REVENUE_NO_CAPTURADO');
          const cartera = findSubcat('CARTERA_VENCIDA');
          revenuePotencial = noCapturado + cartera;
          setTotalRevenueRecuperable(revenuePotencial);

          setSubcatData({
            noCapturado,
            cartera,
            riesgo: findSubcat('RIESGO_NEGATIVO'),
          });
        }

        setStats({
          totalFideicomisos: items.length,
          conciliacionesMes,
          hallazgosAbiertos: hItems.length,
          revenuePotencial,
        });
        setHallazgos(hItems as never[]);
      } catch {
        // API not yet available — show empty state
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de conciliación fiduciaria
          </p>
        </div>
        <Divider alignment="left" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Fideicomisos"
          value={String(stats.totalFideicomisos)}
          description="Activos en plataforma"
          icon={Building2}
        />
        <StatsCard
          title="Conciliaciones (Mes)"
          value={String(stats.conciliacionesMes)}
          description="Ejecutadas este mes"
          icon={GitCompareArrows}
        />
        <StatsCard
          title="Hallazgos Abiertos"
          value={String(stats.hallazgosAbiertos)}
          description="Pendientes de resolución"
          icon={AlertTriangle}
          iconColor="text-destructive"
        />
        <StatsCard
          title="Revenue Potencial"
          value={`$${stats.revenuePotencial.toLocaleString('es-CO')}`}
          description={`No Capturado: $${subcatData.noCapturado.toLocaleString('es-CO')} · Cartera: $${subcatData.cartera.toLocaleString('es-CO')}`}
          icon={DollarSign}
          iconColor="text-emerald-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueChart
          subcategorias={subcategorias}
          totalRevenueRecuperable={totalRevenueRecuperable}
        />
        <RecentHallazgos hallazgos={hallazgos} />
      </div>
    </div>
  );
}
