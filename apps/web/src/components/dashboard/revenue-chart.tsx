import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Clock, FileWarning, AlertCircle } from 'lucide-react';

interface SubcategoriaItem {
  subcategoria: string;
  monto: number;
  cantidad: number;
}

interface RevenueChartProps {
  subcategorias: SubcategoriaItem[];
  totalRevenueRecuperable: number;
}

const SUBCAT_CONFIG: Record<string, { label: string; description: string; color: string; gradient: string; icon: React.ReactNode }> = {
  REVENUE_NO_CAPTURADO: {
    label: 'Revenue No Capturado',
    description: 'Comisiones nunca facturadas o subfacturadas',
    color: '#10b981',
    gradient: 'from-emerald-500 to-emerald-400',
    icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  },
  CARTERA_VENCIDA: {
    label: 'Cartera Vencida',
    description: 'Facturado pero pendiente de recaudo',
    color: '#ef4444',
    gradient: 'from-red-500 to-red-400',
    icon: <Clock className="h-4 w-4 text-red-500" />,
  },
  RIESGO_NEGATIVO: {
    label: 'Riesgo Negativo',
    description: 'Cobros potencialmente indebidos o ambiguos',
    color: '#f59e0b',
    gradient: 'from-amber-500 to-amber-400',
    icon: <FileWarning className="h-4 w-4 text-amber-500" />,
  },
  ANOMALIA: {
    label: 'Anomalía',
    description: 'Hallazgos sin impacto directo para la fiduciaria',
    color: '#64748b',
    gradient: 'from-slate-500 to-slate-400',
    icon: <AlertCircle className="h-4 w-4 text-slate-400" />,
  },
};

// Order to display subcategorias
const SUBCAT_ORDER = ['REVENUE_NO_CAPTURADO', 'CARTERA_VENCIDA', 'RIESGO_NEGATIVO', 'ANOMALIA'];

export function RevenueChart({
  subcategorias,
  totalRevenueRecuperable,
}: RevenueChartProps) {
  // Sort by predefined order
  const sorted = SUBCAT_ORDER
    .map(key => subcategorias.find(s => s.subcategoria === key))
    .filter((s): s is SubcategoriaItem => s != null && s.monto > 0);

  const maxMonto = Math.max(...sorted.map((o) => o.monto), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Desglose de Hallazgos con Impacto</CardTitle>
            <CardDescription>
              Impacto económico por tipo de hallazgo
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Revenue Recuperable</p>
            <p className="text-xl font-bold text-emerald-600">
              {formatCurrency(totalRevenueRecuperable)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              No Capturado + Cartera Vencida
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay hallazgos con impacto económico
          </p>
        ) : (
          <div className="space-y-5">
            {sorted.map((opp) => {
              const config = SUBCAT_CONFIG[opp.subcategoria] || SUBCAT_CONFIG.ANOMALIA;
              return (
                <div key={opp.subcategoria} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span className="font-semibold">{config.label}</span>
                      <span className="text-muted-foreground text-xs">
                        ({opp.cantidad} hallazgo{opp.cantidad !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="font-bold tabular-nums">
                      {formatCurrency(opp.monto)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-700 ease-out`}
                      style={{
                        width: `${Math.max((opp.monto / maxMonto) * 100, 2)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-6">{config.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
