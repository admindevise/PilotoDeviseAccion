'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, AlertCircle, X, Filter, FileWarning, Clock } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface SubcategoriaData {
  subcategoria: string;
  monto: number;
  cantidad: number;
}

interface RevenueSummary {
  totalCobrado: number;
  byCategoria: {
    categoria: string;
    monto: number;
    cantidad: number;
  }[];
  bySubcategoria: SubcategoriaData[];
  byFideicomiso: {
    fideicomisoId: string;
    codigoPrincipal: string;
    nombre: string;
    monto: number;
    cantidad: number;
    cobrado: number;
    subcategorias?: Record<string, number>;
  }[];
}

interface RevenueOpportunity {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  impactoEconomico: number;
  subcategoria?: string;
  fideicomiso?: { id: string; nombre: string; codigoPrincipal: string };
  createdAt: string;
}

const SUBCATEGORIA_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  REVENUE_NO_CAPTURADO: {
    label: 'No Capturado',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700',
    icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
  },
  CARTERA_VENCIDA: {
    label: 'Cartera Vencida',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700',
    icon: <Clock className="h-4 w-4 text-red-600" />,
  },
  RIESGO_NEGATIVO: {
    label: 'Riesgo Negativo',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700',
    icon: <FileWarning className="h-4 w-4 text-amber-600" />,
  },
  ANOMALIA: {
    label: 'Anomalía',
    color: 'text-slate-700 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-600',
    icon: <AlertCircle className="h-4 w-4 text-slate-500" />,
  },
};

function SubcategoriaBadge({ subcategoria }: { subcategoria?: string }) {
  if (!subcategoria) return <span className="text-muted-foreground">—</span>;
  const config = SUBCATEGORIA_CONFIG[subcategoria];
  if (!config) return <Badge variant="outline">{subcategoria}</Badge>;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${config.bgColor}`}>
      {config.icon}
      <span className={config.color}>{config.label}</span>
    </span>
  );
}

export default function RevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [opportunities, setOpportunities] = useState<RevenueOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFideicomisos, setSelectedFideicomisos] = useState<Set<string>>(new Set());
  const [selectedSubcategoria, setSelectedSubcategoria] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const [sumData, oppData] = await Promise.allSettled([
          apiGet<RevenueSummary>('/revenue/summary'),
          apiGet<{ data: RevenueOpportunity[]; meta: any }>('/revenue/opportunities?limit=50'),
        ]);

        if (sumData.status === 'fulfilled' && sumData.value) {
          const summary = (sumData.value as any).data || sumData.value;
          setSummary(summary as RevenueSummary);
        }
        if (oppData.status === 'fulfilled' && oppData.value) {
          const opps = (oppData.value as any).data || oppData.value;
          setOpportunities(opps as RevenueOpportunity[]);
        }
      } catch (err) {
        console.error('Error loading revenue data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hasFilter = selectedFideicomisos.size > 0;

  const toggleFideicomiso = (fideicomisoId: string) => {
    setSelectedFideicomisos((prev) => {
      const next = new Set(prev);
      if (next.has(fideicomisoId)) {
        next.delete(fideicomisoId);
      } else {
        next.add(fideicomisoId);
      }
      return next;
    });
  };

  const clearFilter = () => setSelectedFideicomisos(new Set());

  // Filtered data based on selected fideicomisos
  const filteredByFideicomiso = useMemo(() => {
    if (!summary) return [];
    if (!hasFilter) return summary.byFideicomiso;
    return summary.byFideicomiso.filter((f) => selectedFideicomisos.has(f.fideicomisoId));
  }, [summary, selectedFideicomisos, hasFilter]);

  const filteredOpportunities = useMemo(() => {
    let result = opportunities;
    if (hasFilter) {
      result = result.filter(
        (opp) => opp.fideicomiso && selectedFideicomisos.has(opp.fideicomiso.id)
      );
    }
    if (selectedSubcategoria) {
      result = result.filter((opp) => opp.subcategoria === selectedSubcategoria);
    }
    return result;
  }, [opportunities, selectedFideicomisos, hasFilter, selectedSubcategoria]);

  // Compute subcategoria KPIs from summary
  const subcatTotals = useMemo(() => {
    if (!summary?.bySubcategoria) return { noCapturado: 0, cartera: 0, riesgoNeg: 0, anomalia: 0 };
    const find = (key: string) => summary.bySubcategoria.find(s => s.subcategoria === key)?.monto || 0;
    return {
      noCapturado: find('REVENUE_NO_CAPTURADO'),
      cartera: find('CARTERA_VENCIDA'),
      riesgoNeg: find('RIESGO_NEGATIVO'),
      anomalia: find('ANOMALIA'),
    };
  }, [summary]);

  // Filtered subcategoria totals
  const filteredSubcatTotals = useMemo(() => {
    if (!hasFilter) return subcatTotals;
    const totals = { noCapturado: 0, cartera: 0, riesgoNeg: 0, anomalia: 0 };
    filteredByFideicomiso.forEach(f => {
      if (f.subcategorias) {
        totals.noCapturado += f.subcategorias['REVENUE_NO_CAPTURADO'] || 0;
        totals.cartera += f.subcategorias['CARTERA_VENCIDA'] || 0;
        totals.riesgoNeg += f.subcategorias['RIESGO_NEGATIVO'] || 0;
        totals.anomalia += f.subcategorias['ANOMALIA'] || 0;
      }
    });
    return totals;
  }, [subcatTotals, filteredByFideicomiso, hasFilter]);

  const totalCobrado = useMemo(() => {
    if (!hasFilter) return summary?.totalCobrado || 0;
    return filteredByFideicomiso.reduce((acc, f) => acc + (f.cobrado || 0), 0);
  }, [summary, filteredByFideicomiso, hasFilter]);

  const fideicomisosAfectados = useMemo(() => {
    if (!hasFilter) {
      return summary?.byFideicomiso.filter((f) => f.monto > 0).length || 0;
    }
    return filteredByFideicomiso.filter((f) => f.monto > 0).length;
  }, [summary, filteredByFideicomiso, hasFilter]);

  // Selected fideicomiso names for the filter badge
  const selectedNames = useMemo(() => {
    if (!summary || !hasFilter) return [];
    return summary.byFideicomiso
      .filter((f) => selectedFideicomisos.has(f.fideicomisoId))
      .map((f) => f.codigoPrincipal);
  }, [summary, selectedFideicomisos, hasFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" /> Revenue Intelligence
          </h1>
          <p className="text-muted-foreground">
            Identificación de comisiones no cobradas y oportunidades de facturación
          </p>
        </div>

        {/* Active filter indicator */}
        {hasFilter && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700">
              <Filter className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {selectedNames.length === 1
                  ? selectedNames[0]
                  : `${selectedNames.length} fideicomisos`}
              </span>
              <button
                onClick={clearFilter}
                className="ml-1 p-0.5 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                title="Limpiar filtro"
              >
                <X className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">
          Calculando oportunidades de revenue...
        </p>
      ) : (
        <>
          {/* Top KPIs — 4 cards for subcategoria tiers */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenue No Capturado
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 transition-all duration-300">
                  {formatCurrency(filteredSubcatTotals.noCapturado)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Comisiones no facturadas o subfacturadas
                  {hasFilter && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                      (filtrado)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/20 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cartera Vencida
                </CardTitle>
                <Clock className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700 dark:text-red-400 transition-all duration-300">
                  {formatCurrency(filteredSubcatTotals.cartera)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Facturado pero no recaudado
                  {hasFilter && (
                    <span className="ml-1 text-red-600 dark:text-red-400">
                      (filtrado)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Riesgo Negativo
                </CardTitle>
                <FileWarning className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 transition-all duration-300">
                  {formatCurrency(filteredSubcatTotals.riesgoNeg)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cobros potencialmente indebidos
                  {hasFilter && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      (filtrado)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Revenue Cobrado
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold transition-all duration-300">
                  {formatCurrency(totalCobrado)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  En facturas pagadas · {fideicomisosAfectados} fideicomisos
                  {hasFilter && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                      (filtrado)
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Oportunidades List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Oportunidades de Facturación Detectadas</CardTitle>
                    <CardDescription>
                      Listado de hallazgos con impacto económico por subcategoría
                      {hasFilter && (
                        <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                          — Filtrado por {selectedNames.join(', ')}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <select
                    value={selectedSubcategoria}
                    onChange={(e) => setSelectedSubcategoria(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring min-w-[180px]"
                  >
                    <option value="">Todas las subcategorías</option>
                    <option value="REVENUE_NO_CAPTURADO">No Capturado</option>
                    <option value="CARTERA_VENCIDA">Cartera Vencida</option>
                    <option value="RIESGO_NEGATIVO">Riesgo Negativo</option>
                    <option value="ANOMALIA">Anomalía</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {filteredOpportunities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {hasFilter
                      ? 'No se encontraron oportunidades para los fideicomisos seleccionados.'
                      : 'No se encontraron oportunidades de revenue abiertas.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hallazgo</TableHead>
                        <TableHead>Subcategoría</TableHead>
                        <TableHead>Fideicomiso</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOpportunities.map((opp) => (
                        <TableRow key={opp.id} className="transition-all duration-200">
                          <TableCell className="font-medium max-w-[180px]">
                            <Link
                              href={`/hallazgos/${opp.id}`}
                              className="font-semibold text-foreground hover:text-fidu-accent hover:underline line-clamp-2"
                            >
                              {opp.titulo}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <SubcategoriaBadge subcategoria={opp.subcategoria} />
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate text-muted-foreground" title={opp.fideicomiso ? `${opp.fideicomiso.codigoPrincipal} - ${opp.fideicomiso.nombre}` : '—'}>
                            {opp.fideicomiso?.codigoPrincipal || '—'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            {formatCurrency(opp.impactoEconomico)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Fideicomisos Performance */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Rendimiento por Fideicomiso</CardTitle>
                    <CardDescription>
                      Comparativa de revenue cobrado vs potencial con desglose
                    </CardDescription>
                  </div>
                  {hasFilter && (
                    <button
                      onClick={clearFilter}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Limpiar
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <Filter className="h-3 w-3 inline mr-1" />
                  Haz clic en un fideicomiso para filtrar todo el módulo
                </p>
              </CardHeader>
              <CardContent>
                {summary?.byFideicomiso.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay datos de rendimiento disponibles.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fideicomiso</TableHead>
                        <TableHead className="text-right min-w-[100px]">Cobrado</TableHead>
                        <TableHead className="text-right text-emerald-600 min-w-[100px]">No Captur.</TableHead>
                        <TableHead className="text-right text-red-600 min-w-[100px]">Cartera</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary?.byFideicomiso
                        .sort((a, b) => b.monto - a.monto)
                        .map((fid) => {
                          const fideicomisoName = `${fid.codigoPrincipal} - ${fid.nombre}`;
                          const isSelected = selectedFideicomisos.has(fid.fideicomisoId);
                          const noCapt = fid.subcategorias?.['REVENUE_NO_CAPTURADO'] || 0;
                          const cart = fid.subcategorias?.['CARTERA_VENCIDA'] || 0;
                          return (
                            <TableRow
                              key={fid.fideicomisoId}
                              onClick={() => toggleFideicomiso(fid.fideicomisoId)}
                              className={`
                                cursor-pointer transition-all duration-200 select-none
                                ${isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-inset ring-emerald-300 dark:ring-emerald-700'
                                  : 'hover:bg-muted/50'
                                }
                              `}
                            >
                              <TableCell className="font-medium max-w-[160px] truncate" title={fideicomisoName}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`
                                      w-2.5 h-2.5 rounded-full border-2 transition-all duration-200 flex-shrink-0
                                      ${isSelected
                                        ? 'bg-emerald-500 border-emerald-600 scale-110'
                                        : 'bg-transparent border-muted-foreground/40'
                                      }
                                    `}
                                  />
                                  <span className={isSelected ? 'text-emerald-700 dark:text-emerald-300' : ''}>
                                    {fid.codigoPrincipal}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className={`text-right font-bold tabular-nums text-sm ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                                {formatCurrency(fid.cobrado || 0)}
                              </TableCell>
                              <TableCell className={`text-right font-bold tabular-nums text-sm ${noCapt > 0 ? 'text-emerald-600' : 'text-muted-foreground/50'}`}>
                                {noCapt > 0 ? formatCurrency(noCapt) : '—'}
                              </TableCell>
                              <TableCell className={`text-right font-bold tabular-nums text-sm ${cart > 0 ? 'text-red-600' : 'text-muted-foreground/50'}`}>
                                {cart > 0 ? formatCurrency(cart) : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
