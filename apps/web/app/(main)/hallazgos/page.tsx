'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { AlertTriangle, Search, Filter } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate, formatCurrency, severityClass, estadoColor } from '@/lib/utils';

interface Hallazgo {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  severidad: string;
  estado: string;
  categoria: string;
  subcategoria?: string;
  area?: string;
  impactoEconomico?: number;
  fideicomiso?: { id: string; nombre: string; codigoPrincipal: string };
  createdAt: string;
}

const SEVERIDADES = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO', 'INFORMATIVO'];
const ESTADOS = ['ABIERTO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO', 'DESCARTADO'];
const AREAS = ['LEGAL', 'CONTABILIDAD', 'FACTURACION', 'COMERCIAL', 'OPERATIVA'];
const SUBCATEGORIAS = [
  { value: 'REVENUE_NO_CAPTURADO', label: '🟢 No Capturado' },
  { value: 'CARTERA_VENCIDA', label: '🔴 Cartera Vencida' },
  { value: 'RIESGO_NEGATIVO', label: '⚠️ Riesgo Negativo' },
  { value: 'ANOMALIA', label: '🔍 Anomalía' },
];

const SUBCATEGORIA_LABELS: Record<string, { label: string; className: string }> = {
  REVENUE_NO_CAPTURADO: { label: 'No Capturado', className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700' },
  CARTERA_VENCIDA: { label: 'Cartera Vencida', className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700' },
  RIESGO_NEGATIVO: { label: 'Riesgo Negativo', className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700' },
  ANOMALIA: { label: 'Anomalía', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-600' },
};

export default function HallazgosPage() {
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([]);
  const [search, setSearch] = useState('');
  const [filterSeveridad, setFilterSeveridad] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterFideicomiso, setFilterFideicomiso] = useState('all');
  const [filterSubcategoria, setFilterSubcategoria] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiGet<{ data: Hallazgo[] }>('/hallazgos');
        const data = (res as any).data || res;
        setHallazgos(Array.isArray(data) ? data : []);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = hallazgos.filter((h) => {
    const matchSearch =
      h.titulo.toLowerCase().includes(search.toLowerCase()) ||
      h.descripcion.toLowerCase().includes(search.toLowerCase());
    const matchSeveridad =
      filterSeveridad === 'all' || h.severidad === filterSeveridad;
    const matchEstado =
      filterEstado === 'all' || h.estado === filterEstado;
    const matchArea = 
      filterArea === 'all' || h.area === filterArea;
    const matchFideicomiso =
      filterFideicomiso === 'all' || h.fideicomiso?.id === filterFideicomiso;
    const matchSubcategoria =
      filterSubcategoria === 'all' || h.subcategoria === filterSubcategoria;
      
    return matchSearch && matchSeveridad && matchEstado && matchArea && matchFideicomiso && matchSubcategoria;
  });

  const countBySeveridad = (sev: string) =>
    hallazgos.filter((h) => h.severidad === sev).length;

  const countByArea = (area: string) =>
    hallazgos.filter((h) => h.area === area).length;

  const fideicomisosUnicos = Array.from(
    new Map(hallazgos.filter(h => h.fideicomiso).map(h => [h.fideicomiso!.id, h.fideicomiso])).values()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hallazgos</h1>
        <p className="text-muted-foreground">
          Hallazgos detectados durante la conciliación
        </p>
      </div>

      {/* Resumen por severidad */}
      <div className="grid gap-3 sm:grid-cols-5">
        {SEVERIDADES.map((sev) => (
          <Card
            key={sev}
            className={`cursor-pointer transition-colors ${
              filterSeveridad === sev ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() =>
              setFilterSeveridad(filterSeveridad === sev ? 'all' : sev)
            }
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={severityClass(sev)}
                >
                  {sev}
                </Badge>
                <span className="text-2xl font-bold">
                  {countBySeveridad(sev)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-5 mt-4 text-xs">
        {AREAS.map((ar) => (
          <Card
            key={ar}
            className={`cursor-pointer transition-colors ${
              filterArea === ar ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() =>
              setFilterArea(filterArea === ar ? 'all' : ar)
            }
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">{ar}</span>
                <span className="text-lg font-bold">
                  {countByArea(ar)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros y tabla */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg">
              Listado de Hallazgos ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar hallazgos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={filterFideicomiso}
                onChange={setFilterFideicomiso}
                placeholder="Fideicomiso"
                options={[
                  { value: 'all', label: 'Todos los fideicomisos' },
                  ...fideicomisosUnicos.map(f => ({
                    value: f!.id,
                    label: f!.codigoPrincipal,
                  })),
                ]}
              />
              <Select
                value={filterArea}
                onChange={setFilterArea}
                placeholder="Área"
                options={[
                  { value: 'all', label: 'Todas las áreas' },
                  ...AREAS.map((e) => ({
                    value: e,
                    label: e,
                  })),
                ]}
              />
              <Select
                value={filterSubcategoria}
                onChange={setFilterSubcategoria}
                placeholder="Subcategoría"
                options={[
                  { value: 'all', label: 'Todas las subcategorías' },
                  ...SUBCATEGORIAS.map((s) => ({
                    value: s.value,
                    label: s.label,
                  })),
                ]}
              />
              <Select
                value={filterEstado}
                onChange={setFilterEstado}
                placeholder="Estado"
                options={[
                  { value: 'all', label: 'Todos los estados' },
                  ...ESTADOS.map((e) => ({
                    value: e,
                    label: e.replace('_', ' '),
                  })),
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando hallazgos...
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No se encontraron hallazgos
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hallazgo</TableHead>
                  <TableHead>Fideicomiso</TableHead>
                  <TableHead>Subcategoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Impacto</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <Link
                        href={`/hallazgos/${h.id}`}
                        className="font-semibold text-foreground hover:text-fidu-accent hover:underline"
                      >
                        {h.titulo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {h.fideicomiso?.codigoPrincipal || '—'}
                    </TableCell>
                    <TableCell>
                      {h.subcategoria ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SUBCATEGORIA_LABELS[h.subcategoria]?.className || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                          {SUBCATEGORIA_LABELS[h.subcategoria]?.label || h.subcategoria}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{h.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      {h.area ? (
                        <Badge variant="secondary" className="font-medium text-[10px] tracking-wide bg-primary/10 text-primary border-primary/20">
                          {h.area}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={severityClass(h.severidad)}
                      >
                        {h.severidad}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          estadoColor(h.estado) as
                            | 'default'
                            | 'secondary'
                            | 'destructive'
                            | 'outline'
                        }
                      >
                        {h.estado.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {h.impactoEconomico
                        ? formatCurrency(h.impactoEconomico)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(h.createdAt)}
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
