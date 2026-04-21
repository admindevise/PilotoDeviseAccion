'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { GitCompareArrows, Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

interface Fideicomiso {
  id: string;
  codigoPrincipal: string;
  nombre: string;
}

interface Conciliacion {
  id: string;
  fideicomisoId: string;
  fideicomiso?: { nombre: string; codigoPrincipal: string };
  periodo: string;
  estado: string;
  resumen?: {
    totalReglas?: number;
    conciliados?: number;
    discrepancias?: number;
    hallazgos?: number;
    oportunidades?: number;
  };
  createdAt: string;
}

function estadoIcon(estado: string) {
  switch (estado) {
    case 'COMPLETADA':
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case 'ERROR':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function ConciliacionPage() {
  const [fideicomisos, setFideicomisos] = useState<Fideicomiso[]>([]);
  const [conciliaciones, setConciliaciones] = useState<Conciliacion[]>([]);
  const [selectedFideicomiso, setSelectedFideicomiso] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFin, setPeriodoFin] = useState('');
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [fData, cData] = await Promise.allSettled([
          apiGet<Fideicomiso[]>('/fideicomisos'),
          apiGet<Conciliacion[]>('/conciliaciones'),
        ]);
        if (fData.status === 'fulfilled') {
          const items = Array.isArray(fData.value) ? fData.value : [];
          setFideicomisos(items);
        }
        if (cData.status === 'fulfilled') {
          const items = Array.isArray(cData.value) ? cData.value : [];
          setConciliaciones(items);
        }
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleExecute() {
    if (!selectedFideicomiso || !periodoInicio || !periodoFin) return;
    setExecuting(true);
    try {
      const result = await apiPost<Conciliacion>(
        `/fideicomisos/${selectedFideicomiso}/conciliaciones`,
        {
          periodo: periodoInicio.substring(0, 7), // Extraer YYYY-MM
          tipo: 'PERIODICA',
        }
      );
      setConciliaciones((prev) => [result, ...prev]);
    } catch {
      // handle error
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conciliación</h1>
        <p className="text-muted-foreground">
          Ejecutar y revisar conciliaciones de comisiones fiduciarias
        </p>
      </div>

      {/* Nueva Conciliación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nueva Conciliación</CardTitle>
          <CardDescription>
            Seleccione un fideicomiso y período para ejecutar la conciliación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-64">
              <label className="mb-1 block text-sm font-medium">
                Fideicomiso
              </label>
              <Select
                value={selectedFideicomiso}
                onChange={setSelectedFideicomiso}
                placeholder="Seleccionar fideicomiso"
                options={fideicomisos.map((f) => ({
                  value: f.id,
                  label: `${f.codigoPrincipal} — ${f.nombre}`
                }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Período Inicio
              </label>
              <input
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Período Fin
              </label>
              <input
                type="date"
                value={periodoFin}
                onChange={(e) => setPeriodoFin(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              onClick={handleExecute}
              disabled={
                !selectedFideicomiso || !periodoInicio || !periodoFin || executing
              }
            >
              <Play className="mr-2 h-4 w-4" />
              {executing ? 'Ejecutando...' : 'Ejecutar Conciliación'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historial de Conciliaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando conciliaciones...
            </p>
          ) : conciliaciones.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <GitCompareArrows className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No se han ejecutado conciliaciones aún
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fideicomiso</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Reglas</TableHead>
                  <TableHead>Hallazgos</TableHead>
                  <TableHead>Oportunidades</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conciliaciones.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {estadoIcon(c.estado)}
                        <span className="text-sm">{c.estado}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.fideicomiso?.codigoPrincipal || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.periodo}
                    </TableCell>
                    <TableCell>{c.resumen?.totalReglas || 0}</TableCell>
                    <TableCell className="text-amber-600 font-medium">
                      {c.resumen?.hallazgos || 0}
                    </TableCell>
                    <TableCell className="text-emerald-600 font-medium">
                      {c.resumen?.oportunidades || 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(c.createdAt)}
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
