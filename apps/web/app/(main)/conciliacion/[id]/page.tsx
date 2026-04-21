'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

interface ConciliacionDetalle {
  id: string;
  fideicomisoId: string;
  fideicomiso?: { nombre: string; codigoPrincipal: string };
  periodo: string;
  tipo: string;
  estado: string;
  iniciadaEn: string;
  resumen?: {
    totalReglas?: number;
    conciliados?: number;
    discrepancias?: number;
    anomalias?: number;
    tokensUsed?: number;
  };
}

interface ResultadoConciliacion {
  id: string;
  estado: string;
  montoEsperado?: number;
  montoRegistrado?: number;
  discrepancia?: number;
  confianza: number;
  razonamiento?: string;
  reglaComision?: { id: string; nombre: string; tipo: string; formula: string };
  hallazgo?: { id: string; tipo: string; severidad: string; estado: string };
  createdAt: string;
}

export default function ConciliacionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [conciliacion, setConciliacion] = useState<ConciliacionDetalle | null>(null);
  const [resultados, setResultados] = useState<ResultadoConciliacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cData, rData] = await Promise.allSettled([
          apiGet<{ data: ConciliacionDetalle }>(`/conciliaciones/${id}`),
          apiGet<{ data: ResultadoConciliacion[] }>(`/conciliaciones/${id}/resultados?limit=100`),
        ]);
        
        if (cData.status === 'fulfilled') {
          const c = (cData.value as any).data || cData.value;
          setConciliacion(c);
        }
        if (rData.status === 'fulfilled') {
          const r = (rData.value as any).data || rData.value;
          setResultados(r);
        }
      } catch {
        // Handle error implicitly
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function estadoIcon(estado: string) {
    if (estado === 'CONCILIADO') return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    if (estado === 'DISCREPANCIA' || estado === 'NO_ENCONTRADO' || estado === 'NO_FACTURADO') return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Cargando detalles de conciliación...</div>
      </div>
    );
  }

  if (!conciliacion) {
    return (
      <div className="space-y-4">
        <Link href="/conciliacion">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <p className="text-center text-muted-foreground">Conciliación no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/conciliacion">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Resumen de Ejecución</h1>
            <Badge variant="outline">{conciliacion.estado}</Badge>
            <Badge variant="secondary">{conciliacion.tipo}</Badge>
          </div>
          <p className="text-muted-foreground flex gap-4 mt-1">
            <span>Fideicomiso: {conciliacion.fideicomiso?.codigoPrincipal || 'N/A'}</span>
            <span>Período: {conciliacion.periodo}</span>
            <span>Fecha: {formatDate(conciliacion.iniciadaEn)}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reglas Evaluadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conciliacion.resumen?.totalReglas || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conciliadas Exactas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{conciliacion.resumen?.conciliados || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Discrepancias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{conciliacion.resumen?.discrepancias || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Anomalías/Oportunidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{conciliacion.resumen?.anomalias || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resultados Detallados</CardTitle>
          <CardDescription>
            Análisis regla por regla de las comisiones facturadas contra las contabilizadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resultados.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay resultados registrados para esta conciliación.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Regla de Comisión</TableHead>
                  <TableHead>Monto Esperado</TableHead>
                  <TableHead>Monto Registrado</TableHead>
                  <TableHead>Discrepancia</TableHead>
                  <TableHead>Precisión AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultados.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {estadoIcon(r.estado)}
                        <span className="text-xs font-medium">{r.estado.replace(/_/g, ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.reglaComision ? (
                        <div>
                          <p className="font-medium text-sm">{r.reglaComision.nombre}</p>
                          <p className="text-xs text-muted-foreground font-mono">{r.reglaComision.formula}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Oportunidad / Extracción</span>
                      )}
                    </TableCell>
                    <TableCell>{r.montoEsperado ? formatCurrency(r.montoEsperado) : '—'}</TableCell>
                    <TableCell>{r.montoRegistrado ? formatCurrency(r.montoRegistrado) : '—'}</TableCell>
                    <TableCell className={r.discrepancia && r.discrepancia !== 0 ? 'text-destructive font-medium' : ''}>
                      {r.discrepancia ? formatCurrency(r.discrepancia) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.confianza > 0.8 ? 'secondary' : 'outline'}>
                        {(r.confianza * 100).toFixed(0)}%
                      </Badge>
                      {r.hallazgo && (
                        <Link href={`/hallazgos/${r.hallazgo.id}`} className="block mt-1 text-xs text-primary hover:underline">
                          Ver Hallazgo ↗
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
