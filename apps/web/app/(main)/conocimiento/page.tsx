'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Search, Filter } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Select } from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';

interface ConocimientoItem {
  id: string;
  fideicomisoId: string;
  tipo: string;
  titulo: string;
  contenido: string;
  createdAt: string;
  fideicomiso?: { id: string; codigoPrincipal: string; nombre: string };
}

const TIPOS_CONOCIMIENTO = [
  'REGLA_NEGOCIO',
  'RESOLUCION_HALLAZGO',
  'CONTEXTO_OPERATIVO',
  'PRECEDENTE_CONTABLE',
  'DOCUMENTO_FUENTE',
];

export default function ConocimientoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Cargando Conocimiento...</div>}>
      <ConocimientoContent />
    </Suspense>
  );
}

function ConocimientoContent() {
  const [items, setItems] = useState<ConocimientoItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const searchParams = useSearchParams();
  const fideicomisoIdUrl = searchParams.get('fideicomiso');

  const [filterFideicomiso, setFilterFideicomiso] = useState('all');

  // Initial load
  useEffect(() => {
    if(fideicomisoIdUrl) setFilterFideicomiso(fideicomisoIdUrl);
    fetchData('');
  }, [fideicomisoIdUrl]);

  async function fetchData(query: string) {
    setSearching(true);
    try {
      // Omitir el query param de fideicomisoId para que la API traiga todo y popular el Select
      const url = `/conocimiento/search?q=${encodeURIComponent(query)}&limit=500`;
      
      const res = await apiGet<any>(url);
      const itemsData = res?.data || res || [];
      setItems(itemsData);
    } catch (err) {
      console.error('Error fetching conocimiento', err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }

  // Effect to trigger search when query changes (with simple debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        fetchData(search);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = items.filter((item) => {
    const matchTipo = filterTipo === 'all' || item.tipo === filterTipo;
    const matchFideicomiso = filterFideicomiso === 'all' || item.fideicomiso?.id === filterFideicomiso || item.fideicomisoId === filterFideicomiso;
    return matchTipo && matchFideicomiso;
  });

  const fideicomisosUnicos = Array.from(
    new Map(items.filter(h => h.fideicomiso).map(h => [h.fideicomiso!.id, h.fideicomiso])).values()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> Base de Conocimiento
        </h1>
        <p className="text-muted-foreground">
          Reglas de negocio, precedentes contables y resoluciones de hallazgos
        </p>
      </div>

      {/* Resumen de Aprendizaje (Recapitulacion) */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conceptos Procesados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {items.length > 0 ? items.length : '...'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Entradas en la base de conocimiento
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Síntesis de Aprendizaje de la Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">
              La plataforma ha procesado la documentación de múltiples fideicomisos, identificando patrones recurrentes de fuga de revenue y anomalías operativas. Los hallazgos más críticos están relacionados con <strong>subfacturación sostenida frente a tarifas contractuales</strong> (ej. 1 SMLMV vs 3 SMLMV mínimos), <strong>omisión sistemática en el cobro de cesiones de derechos</strong> y <strong>falta de gestión en intereses de mora y cartera vencida</strong>. <br/><br/>
              Adicionalmente, se detectaron factores estructurales como la <strong>desincronización entre ERPs (Legacy vs SIFI)</strong> durante las migraciones contables, cruces de comisiones <strong>exentas o gravadas con IVA</strong> y errores en las liquidaciones variables por monetización cruzada. Se ha estandarizado una serie de reglas de negocio para monitorear estos eventos transaccionales, cruzar extractos físicos contra cuentas auxiliares y levantar de forma automatizada actas de discrepancia antes de los cierres mensuales.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg">Explorador de Conocimiento</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar reglas, conceptos o fideicomisos..."
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
                value={filterTipo}
                onChange={setFilterTipo}
                placeholder="Tipo de Registro"
                options={[
                  { value: 'all', label: 'Todos los tipos' },
                  ...TIPOS_CONOCIMIENTO.map((t) => ({
                    value: t,
                    label: t.replace('_', ' '),
                  })),
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading || searching ? (
            <p className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Buscando en la base de conocimiento...
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No se encontraron registros para tu búsqueda
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-muted/30 p-4 md:w-1/4 border-b md:border-b-0 md:border-r">
                      <div className="text-xs text-muted-foreground mb-1">
                        {formatDate(item.createdAt)}
                      </div>
                      <Badge variant="outline" className="mb-3">
                        {item.tipo.replace('_', ' ')}
                      </Badge>
                      <div className="text-sm font-medium">
                        {item.fideicomiso?.codigoPrincipal || 'Global'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.fideicomiso?.nombre || 'General'}
                      </div>
                    </div>
                    <div className="p-4 md:w-3/4">
                      <h3 className="font-semibold text-lg mb-2">{item.titulo}</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                            h1: ({node, ...props}) => <h4 className="font-semibold text-foreground mt-4 mb-2" {...props} />,
                            h2: ({node, ...props}) => <h4 className="font-semibold text-foreground mt-4 mb-2" {...props} />,
                            h3: ({node, ...props}) => <h4 className="font-semibold text-foreground mt-4 mb-2" {...props} />,
                          }}
                        >
                          {item.contenido}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
