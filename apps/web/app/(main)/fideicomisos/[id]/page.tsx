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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, GitCompareArrows, BookOpen, X, Download, ExternalLink, FileQuestion } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

interface Fideicomiso {
  id: string;
  codigoPrincipal: string;
  nombre: string;
  tipologia: string;
  estado: string;
  descripcion?: string;
  createdAt: string;
  contratos?: Contrato[];
  fideicomitentes?: Fideicomitente[];
  codigosSuperintendencia?: CodigoFideicomiso[];
  eventosTimeline?: EventoTimeline[];
  convenciones?: Convencion[];
  documentos?: { id: string; nombreArchivo: string; fechaCarga: string; tipo: string; formatoOriginal: string; contextoUsuario?: string }[];
  conocimiento?: { id: string; titulo: string; tipo: string; createdAt: string }[];
  ganttData?: {
    movimientos: {
      origenERP: string;
      _min: { fecha: string | null };
      _max: { fecha: string | null };
    }[];
    facturas: {
      _min: { fecha: string | null };
      _max: { fecha: string | null };
    };
  };
}

interface Fideicomitente {
  id: string;
  nombre: string;
  nit: string;
  tipo: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
}

interface ReglaComision {
  id: string;
  tipo: string;
  nombre: string;
  formula: string;
  periodicidad: string;
  formulaDetalle?: any;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  clausulaFuente?: string;
}

interface Contrato {
  id: string;
  tipo: string;
  numero: string;
  fechaFirma: string;
  fechaVigencia: string;
  reglasComision?: ReglaComision[];
}

interface CodigoFideicomiso {
  id: string;
  codigo: string;
  sistema: string;
  tipo: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
}

interface EventoTimeline {
  id: string;
  tipo: string;
  titulo?: string;
  descripcion: string;
  fecha: string;
}

interface Convencion {
  id: string;
  tipo: string;
  clave: string;
  valor: string;
  nombre?: string;
  descripcion?: string;
}

function GanttChart({ fideicomiso }: { fideicomiso: Fideicomiso }) {
  if (!fideicomiso.ganttData) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No hay datos suficientes para la vista Gantt.</p>;
  }

  const items: any[] = [];
  
  // Movimientos
  fideicomiso.ganttData.movimientos.forEach(m => {
    if (m._min.fecha && m._max.fecha) {
      items.push({
        id: `mov-${m.origenERP}`,
        label: `Auxiliar Contable (${m.origenERP})`,
        startDate: new Date(m._min.fecha),
        endDate: new Date(m._max.fecha),
        type: 'range',
        group: 'Fuentes de Información'
      });
    }
  });

  // Facturas
  if (fideicomiso.ganttData.facturas._min.fecha && fideicomiso.ganttData.facturas._max.fecha) {
    items.push({
      id: 'facturas',
      label: 'Balances de Cuenta (Facturación / Recaudos)',
      startDate: new Date(fideicomiso.ganttData.facturas._min.fecha),
      endDate: new Date(fideicomiso.ganttData.facturas._max.fecha),
      type: 'range',
      group: 'Fuentes de Información'
    });
  }

  // Eventos Timeline - filtered for legal/contract (Documentos Contractuales)
  const legalEventTypes = ['CONSTITUCION', 'OTROSI', 'CESION', 'CONTRATO_PARALELO', 'OTROSI_PARALELO'];
  if (fideicomiso.eventosTimeline) {
    fideicomiso.eventosTimeline
      .filter(e => legalEventTypes.includes(e.tipo))
      .forEach((e) => {
        items.push({
          id: `evento-${e.id}`,
          label: e.titulo || e.tipo,
          startDate: new Date(e.fecha),
          endDate: new Date(e.fecha),
          type: 'point',
          originalInfo: e
        });
    });
  }

  if (!items.length) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No hay datos suficientes para la vista Gantt.</p>;
  }

  const timestamps = items.flatMap(i => [i.startDate.getTime(), i.endDate.getTime()]);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  
  // Add padding
  // If minTime === maxTime, ensure at least a 1 year default range so it centers
  const range = (maxTime - minTime) || (86400000 * 365); 
  const paddedMinTime = minTime - range * 0.05;
  const paddedMaxTime = maxTime + range * 0.05;
  const totalRange = paddedMaxTime - paddedMinTime;

  const getPercentage = (time: number) => ((time - paddedMinTime) / totalRange) * 100;

  const rangeItems = items.filter(i => i.type === 'range').sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
  const pointItems = items.filter(i => i.type === 'point');

  // Grouped ranges
  const rangeGroups = rangeItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6 pt-4 pb-8 overflow-x-auto min-w-[500px]">
      {(Object.entries(rangeGroups) as [string, any[]][]).map(([groupName, groupItems]) => (
        <div key={groupName} className="space-y-4 mb-8">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">{groupName}</h4>
          <div className="space-y-3">
            {groupItems.map((item: any) => {
              const left = Math.max(0, getPercentage(item.startDate.getTime()));
              let width = getPercentage(item.endDate.getTime()) - left;
              
              // Prevent overlapping container, max allowed is 100 - left
              width = Math.min(100 - left, width);
              
              // If start and end are the same day (width 0), make it at least visible
              const w = Math.max(width, 1.5);
              
              return (
                <div key={item.id} className="relative h-12 flex flex-col justify-center">
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1 px-1 truncate">
                    <span className="font-medium mr-4 truncate" title={item.label}>{item.label}</span>
                    <span className="shrink-0">{formatDate(item.startDate.toISOString())} - {formatDate(item.endDate.toISOString())}</span>
                  </div>
                  <div className="h-3 bg-muted/50 rounded-full relative overflow-visible border border-border/50">
                    <div 
                      className="absolute top-0 h-full bg-primary/80 rounded-full border border-primary/20 shadow-sm transition-all hover:bg-primary z-10"
                      style={{ left: `${left}%`, width: `${w}%` }}
                      title={`${item.label}: ${formatDate(item.startDate.toISOString())} - ${formatDate(item.endDate.toISOString())}`}
                    />
                    {/* Start Date Marker directly under the bar start */}
                    <div className="absolute top-full mt-1.5 text-[10px] text-muted-foreground/80 -translate-x-1/2 whitespace-nowrap z-20" style={{ left: `${left}%` }}>
                      <span className="bg-background/80 px-1 rounded backdrop-blur-sm">
                        {formatDate(item.startDate.toISOString())}
                      </span>
                    </div>
                    {/* End Date Marker directly under the bar end, if wide enough */}
                    {w > 5 && item.startDate.getTime() !== item.endDate.getTime() && (
                      <div className="absolute top-full mt-1.5 text-[10px] text-muted-foreground/80 translate-x-1/2 whitespace-nowrap right-0 z-20" style={{ right: `${100 - (left + w)}%` }}>
                        <span className="bg-background/80 px-1 rounded backdrop-blur-sm">
                          {formatDate(item.endDate.toISOString())}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {pointItems.length > 0 && (
        <div className="mt-8 pt-4">
          <h4 className="text-sm font-semibold text-muted-foreground mb-6">Hitos Legales y Contractuales</h4>
          <div className="relative h-16 border-t-2 border-dashed border-border/60 mt-2 mx-2">
            {pointItems.map(item => {
              const left = getPercentage(item.startDate.getTime());
              if (left < 0 || left > 100) return null;
              
              return (
                <div 
                  key={item.id}
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                  style={{ left: `${left}%` }}
                >
                  <div className="w-[1px] h-4 bg-primary/40 -mt-[2px] mb-1 relative after:absolute after:top-0 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-2.5 after:h-2.5 after:bg-emerald-500 after:rounded-full after:ring-2 after:ring-background hover:after:bg-emerald-600 hover:after:scale-125 hover:after:transition-transform" />
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-6 bg-popover text-popover-foreground text-xs p-3 rounded-md shadow-lg border w-56 z-20 pointer-events-none left-1/2 -translate-x-1/2">
                    <p className="font-semibold mb-1 text-primary">{item.label}</p>
                    <p className="text-muted-foreground text-[10px] mb-1.5 font-mono">{formatDate(item.startDate.toISOString())}</p>
                    {item.originalInfo?.descripcion && <p className="mt-1 line-clamp-3 leading-relaxed text-[11px]">{item.originalInfo.descripcion}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FideicomisoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [fideicomiso, setFideicomiso] = useState<Fideicomiso | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<NonNullable<Fideicomiso['documentos']>[0] | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<Fideicomiso>(`/fideicomisos/${id}`);
        setFideicomiso(data);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Cargando fideicomiso...</div>
      </div>
    );
  }

  if (!fideicomiso) {
    return (
      <div className="space-y-4">
        <Link href="/fideicomisos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <p className="text-center text-muted-foreground">
          Fideicomiso no encontrado
        </p>
      </div>
    );
  }

  const todasLasReglas = fideicomiso?.contratos?.flatMap((c) => 
    (c.reglasComision || []).map(r => ({ ...r, contratoOrigen: c.numero }))
  ) || [];

  const now = new Date();
  const reglasActivas = todasLasReglas.filter(r => !r.vigenciaHasta || new Date(r.vigenciaHasta).getTime() >= now.getTime());
  const reglasInactivas = todasLasReglas.filter(r => r.vigenciaHasta && now.getTime() > new Date(r.vigenciaHasta).getTime());

  return (
    <div className="space-y-6">
      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/80 backdrop-blur-sm sm:p-6 p-0">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl mx-auto max-w-5xl">
            <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
              <div className="flex items-center gap-3 truncate">
                <div className="bg-primary/10 p-2 rounded shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="truncate">
                  <h3 className="font-semibold text-sm truncate">{previewDoc.nombreArchivo}</h3>
                  <p className="text-xs text-muted-foreground">{previewDoc.tipo.replace(/_/g, ' ')} • {previewDoc.formatoOriginal}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" className="hidden sm:flex" title="Descargar" asChild>
                  <a 
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/documentos/${previewDoc.id}/file`} 
                    download={`documento_${previewDoc.nombreArchivo}`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:flex" title="Abrir en Nueva Pestaña" asChild>
                  <a 
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/documentos/${previewDoc.id}/file`} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir Nueva Pestaña
                  </a>
                </Button>
                <Button variant="outline" size="icon" className="sm:hidden h-8 w-8" title="Abrir" asChild>
                  <a 
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/documentos/${previewDoc.id}/file`} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={() => setPreviewDoc(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-muted/30 flex items-center justify-center">
              {['PDF', 'TXT', 'CSV', 'HTML', 'JPG', 'PNG'].includes(previewDoc.formatoOriginal) ? (
                <iframe
                  src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/documentos/${previewDoc.id}/file`}
                  className="w-full h-full border-0"
                  title="Visor de Documento"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
                  <div className="bg-muted p-4 rounded-full mb-4">
                    <FileQuestion className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold mb-2">Vista previa no disponible</h4>
                  <p className="text-sm text-muted-foreground mb-6">
                    Los navegadores web no soportan la visualización nativa de formatos como <strong>{previewDoc.formatoOriginal}</strong> dentro de la plataforma.
                  </p>
                  <a 
                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/documentos/${previewDoc.id}/file`} 
                    download={`documento_${previewDoc.nombreArchivo}`}
                  >
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar archivo para verlo
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center gap-4">
        <Link href="/fideicomisos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{fideicomiso.nombre}</h1>
            <Badge variant="outline">{fideicomiso.tipologia}</Badge>
            <Badge
              variant={
                fideicomiso.estado === 'ACTIVO' ? 'default' : 'secondary'
              }
            >
              {fideicomiso.estado}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 basis-auto">
              <span>Código Interno:</span>
              <strong className="font-mono text-foreground">{fideicomiso.codigoPrincipal}</strong>
            </div>
            {fideicomiso.codigosSuperintendencia && fideicomiso.codigosSuperintendencia.length > 0 && (
              <>
                <span className="text-border select-none">•</span>
                <div className="flex items-center gap-1.5 basis-auto">
                  <span>Código SFC:</span>
                  <strong className="font-mono text-foreground">{fideicomiso.codigosSuperintendencia.find((c) => c.tipo === 'PRINCIPAL')?.codigo || fideicomiso.codigosSuperintendencia[0].codigo}</strong>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/conciliacion?fideicomiso=${id}`}>
            <Button variant="outline" size="sm">
              <GitCompareArrows className="mr-2 h-4 w-4" />
              Conciliar
            </Button>
          </Link>
        </div>
      </div>

      {fideicomiso.descripcion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Descripción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {fideicomiso.descripcion}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fuentes Documentales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Fuentes Documentales</CardTitle>
              <CardDescription>
                Documentos soporte analizados para este fideicomiso
              </CardDescription>
            </div>
            <Link href={`/documentos?fideicomiso=${id}`}>
              <Button variant="outline" size="sm">
                Gestor Documental
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!fideicomiso.documentos || fideicomiso.documentos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay documentos registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contexto / Notas</TableHead>
                  <TableHead>Fecha Carga</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fideicomiso.documentos.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]" title={doc.nombreArchivo}>
                          {doc.nombreArchivo}
                        </span>
                        <Badge variant="outline" className="text-[10px] ml-2">
                          {doc.formatoOriginal}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {doc.tipo.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px]">
                      {doc.contextoUsuario ? (
                        <span className="truncate block" title={doc.contextoUsuario}>
                          {doc.contextoUsuario}
                        </span>
                      ) : (
                        <span className="italic opacity-50">Sin contexto adicional</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {doc.fechaCarga ? formatDate(doc.fechaCarga) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => setPreviewDoc(doc)}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contratos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contratos</CardTitle>
            <CardDescription>
              Contratos fiduciarios asociados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!fideicomiso.contratos || fideicomiso.contratos.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay contratos registrados
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fideicomiso.contratos.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.tipo}</TableCell>
                      <TableCell className="font-mono">{c.numero || 'S/N'}</TableCell>
                      <TableCell>{formatDate(c.fechaFirma)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Vigente desde {formatDate(c.fechaVigencia)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Códigos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Códigos Históricos (SFC / Otros)</CardTitle>
            <CardDescription>
              Códigos del fideicomiso en diferentes sistemas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!fideicomiso.codigosSuperintendencia || fideicomiso.codigosSuperintendencia.filter(c => c.codigo !== fideicomiso.codigoPrincipal).length === 0) ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay códigos adicionales
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Vigencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fideicomiso.codigosSuperintendencia
                    .filter(c => c.codigo !== fideicomiso.codigoPrincipal)
                    .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono">{c.codigo}</TableCell>
                      <TableCell>{c.sistema || c.tipo}</TableCell>
                      <TableCell>
                        {formatDate(c.vigenciaDesde)}
                        {c.vigenciaHasta
                          ? ` — ${formatDate(c.vigenciaHasta)}`
                          : ' — Vigente'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Convenciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Convenciones</CardTitle>
          <CardDescription>
            Reglas contables, comerciales y operativas del fideicomiso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!fideicomiso.convenciones || fideicomiso.convenciones.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay convenciones configuradas
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fideicomiso.convenciones.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline">{c.tipo}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{c.tipo === 'CONTABLE' ? 'N/A' : '-'}</TableCell>
                    <TableCell>{c.nombre || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.descripcion || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fideicomitentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fideicomitentes y Beneficiarios</CardTitle>
            <CardDescription>Participantes del fideicomiso</CardDescription>
          </CardHeader>
          <CardContent>
            {!fideicomiso.fideicomitentes || fideicomiso.fideicomitentes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay participantes registrados
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>NIT</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vigencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fideicomiso.fideicomitentes.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nombre}</TableCell>
                      <TableCell className="text-sm">{f.nit}</TableCell>
                      <TableCell><Badge variant="outline">{f.tipo}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(f.vigenciaDesde)}
                        {f.vigenciaHasta ? ` — ${formatDate(f.vigenciaHasta)}` : ' — Vigente'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reglas de Comisión */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reglas de Comisión</CardTitle>
            <CardDescription>Reglas de facturación activas</CardDescription>
          </CardHeader>
          <CardContent>
            {!fideicomiso.contratos?.some((c) => c.reglasComision && c.reglasComision.length > 0) ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay reglas de comisión registradas
              </p>
            ) : (
            <Tabs defaultValue="activas" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="activas">Activas ({reglasActivas.length})</TabsTrigger>
                <TabsTrigger value="inactivas">Históricas ({reglasInactivas.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="activas">
                {reglasActivas.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No hay reglas de comisión activas
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fórmula</TableHead>
                        <TableHead className="whitespace-nowrap">Vigencia</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Versión</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reglasActivas.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-sm">{r.nombre}</TableCell>
                          <TableCell><Badge variant="secondary" className="whitespace-nowrap">{r.tipo.replace(/_/g, ' ')}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{r.formula}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(r.vigenciaDesde)}
                            {r.vigenciaHasta ? ` — ${formatDate(r.vigenciaHasta)}` : ' — Vigente'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.contratoOrigen}
                          </TableCell>
                          <TableCell>
                            {r.formulaDetalle?.version ? (
                              <Badge variant="outline" className="text-xs">{r.formulaDetalle.version}</Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="inactivas">
                {reglasInactivas.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No hay reglas de comisión históricas/inactivas
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fórmula</TableHead>
                        <TableHead className="whitespace-nowrap">Vigencia</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Versión</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reglasInactivas.map((r) => (
                        <TableRow key={r.id} className="opacity-75">
                          <TableCell className="font-medium text-sm">{r.nombre}</TableCell>
                          <TableCell><Badge variant="secondary" className="whitespace-nowrap">{r.tipo.replace(/_/g, ' ')}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{r.formula}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(r.vigenciaDesde)}
                            {r.vigenciaHasta ? ` — ${formatDate(r.vigenciaHasta)}` : ' — Fin'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.contratoOrigen}
                          </TableCell>
                          <TableCell>
                            {r.formulaDetalle?.version ? (
                              <Badge variant="outline" className="text-xs">{r.formulaDetalle.version}</Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Línea de Tiempo y Fuentes</CardTitle>
          <CardDescription>
            Eventos cronológicos y ventanas de tiempo de información
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="eventos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="eventos">Eventos</TabsTrigger>
              <TabsTrigger value="gantt">Vista Gantt (Fuentes)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="eventos">
              {!fideicomiso.eventosTimeline || fideicomiso.eventosTimeline.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay eventos registrados
                </p>
              ) : (
                <div className="space-y-4">
                  {fideicomiso.eventosTimeline.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-start gap-4 border-l-2 border-primary/20 pl-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {e.tipo}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(e.fecha)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{e.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="gantt">
              <GanttChart fideicomiso={fideicomiso} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Base de Conocimiento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Base de Conocimiento</CardTitle>
              <CardDescription>Archivos y fuentes de información cargadas</CardDescription>
            </div>
            <Link href={`/conocimiento?fideicomiso=${id}`}>
              <Button variant="outline" size="sm">
                Ver todos
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {!fideicomiso.conocimiento || fideicomiso.conocimiento.length === 0 ? (
              <div className="col-span-2 text-center py-6 text-sm text-muted-foreground">
                No hay entradas de conocimiento registradas para este fideicomiso.
              </div>
            ) : (
              <>
                {fideicomiso.conocimiento.slice(0, 6).map((con) => (
                  <div key={con.id} className="rounded-lg border p-3 flex items-start gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded shrink-0">
                      <BookOpen className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{con.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Extraído el {formatDate(con.createdAt)}</p>
                      <Badge variant="outline" className="mt-2 text-[10px] text-emerald-600 border-emerald-200">
                        {con.tipo.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
