'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  Pencil,
  Check,
  X,
  Clock,
  Star,
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Send,
  History,
  TrendingDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { formatDate, formatCurrency, severityClass, estadoColor } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================
// INTERFACES
// ============================================================

interface Resolucion {
  id: string;
  tipo: string;
  explicacion: string;
  resueltoPor: { id: string; name: string };
  createdAt: string;
}

interface HistorialCambio {
  id: string;
  tipo: string;
  campo?: string;
  valorAnterior?: string;
  valorNuevo?: string;
  justificacion: string;
  metadata?: Record<string, unknown>;
  user: { id: string; name: string };
  createdAt: string;
}

interface HallazgoDetalle {
  id: string;
  fideicomiso: { id: string; nombre: string; codigoPrincipal: string };
  titulo: string;
  descripcion: string;
  razonamiento: string;
  tipo: string;
  severidad: string;
  categoria: string;
  subcategoria?: string;
  area?: string;
  estado: string;
  validacion: string;
  confianzaIA?: number;
  notasRevisor?: string;
  etiquetas?: string[];
  impactoEconomico?: number;
  asignadoA?: { id: string; name: string };
  resoluciones: Resolucion[];
  historialCambios: HistorialCambio[];
  createdAt: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const TIPOS_RESOLUCION = [
  'DESCARTADO',
  'RESUELTO_CON_EXPLICACION',
  'RESUELTO_CON_ADJUNTOS',
  'GESTION_EXTERNA',
  'ESCALADO',
  'EXCEPCION_ACEPTADA',
];

const SEVERIDADES = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO', 'INFORMATIVO'];
const CATEGORIAS = ['CONCILIACION', 'REVENUE', 'ANOMALIA', 'CONSISTENCIA'];
const SUBCATEGORIAS = ['REVENUE_NO_CAPTURADO', 'CARTERA_VENCIDA', 'RIESGO_NEGATIVO', 'ANOMALIA'];
const AREAS = ['LEGAL', 'CONTABILIDAD', 'FACTURACION', 'COMERCIAL', 'OPERATIVA'];
const VALIDACIONES = [
  { value: 'PENDIENTE', label: 'Pendiente', icon: Clock, color: 'text-slate-500' },
  { value: 'CONFIRMADO', label: 'Confirmado', icon: CheckCircle2, color: 'text-emerald-600' },
  { value: 'PARCIALMENTE_CONFIRMADO', label: 'Parcial', icon: MinusCircle, color: 'text-amber-600' },
  { value: 'FALSO_POSITIVO', label: 'Falso Positivo', icon: XCircle, color: 'text-red-500' },
];

const TIPO_CAMBIO_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  CAMBIO_SEVERIDAD: { label: 'Severidad', icon: '🔴', color: 'border-red-400/40 bg-red-50/50 dark:bg-red-950/20' },
  CAMBIO_CATEGORIA: { label: 'Categoría', icon: '📂', color: 'border-blue-400/40 bg-blue-50/50 dark:bg-blue-950/20' },
  CAMBIO_SUBCATEGORIA: { label: 'Subcategoría', icon: '🏷️', color: 'border-purple-400/40 bg-purple-50/50 dark:bg-purple-950/20' },
  CAMBIO_AREA: { label: 'Área', icon: '🏢', color: 'border-indigo-400/40 bg-indigo-50/50 dark:bg-indigo-950/20' },
  CAMBIO_IMPACTO_ECONOMICO: { label: 'Impacto', icon: '💰', color: 'border-emerald-400/40 bg-emerald-50/50 dark:bg-emerald-950/20' },
  CAMBIO_ESTADO: { label: 'Estado', icon: '🔄', color: 'border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20' },
  CAMBIO_VALIDACION: { label: 'Validación', icon: '✅', color: 'border-green-400/40 bg-green-50/50 dark:bg-green-950/20' },
  RESOLUCION: { label: 'Resolución', icon: '🛡️', color: 'border-primary/40 bg-primary/5' },
  COMENTARIO: { label: 'Comentario', icon: '💬', color: 'border-slate-400/40 bg-slate-50/50 dark:bg-slate-950/20' },
  NOTA_GESTION: { label: 'Nota', icon: '📝', color: 'border-orange-400/40 bg-orange-50/50 dark:bg-orange-950/20' },
};

const MOCK_USER_ID = 'dc6c32d8-50e2-4440-b1b0-7e93d51067f1'; // Administrador DIS

// ============================================================
// INLINE EDIT COMPONENT
// ============================================================

function InlineEdit({
  field,
  label,
  currentValue,
  options,
  type = 'select',
  hallazgoId,
  onSaved,
}: {
  field: string;
  label: string;
  currentValue: string;
  options?: string[];
  type?: 'select' | 'number';
  hallazgoId: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue || '');
  const [justificacion, setJustificacion] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!justificacion.trim()) return;
    setSaving(true);
    try {
      const cambios: Record<string, unknown> = {};
      cambios[field] = type === 'number' ? parseFloat(value) : value;
      await apiPatch(`/hallazgos/${hallazgoId}`, {
        cambios,
        justificacion,
        userId: MOCK_USER_ID,
      });
      onSaved();
      setEditing(false);
      setJustificacion('');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex justify-between items-center border-b pb-2 group">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {field === 'impactoEconomico' ? (
            <span className="text-sm font-medium text-emerald-600">
              {currentValue ? formatCurrency(parseFloat(currentValue)) : '—'}
            </span>
          ) : field === 'severidad' ? (
            <Badge variant="outline" className={severityClass(currentValue)}>{currentValue || '—'}</Badge>
          ) : (
            <span className="text-sm font-medium">{currentValue?.replace(/_/g, ' ') || '—'}</span>
          )}
          <button
            onClick={() => { setEditing(true); setValue(currentValue || ''); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            title="Editar"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-primary/5 border-primary/20 animate-in slide-in-from-top-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">{label}</span>
        <button onClick={() => setEditing(false)} className="p-0.5 rounded hover:bg-muted">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      
      {/* Current → New diff preview */}
      <div className="flex items-center gap-2 text-xs">
        <span className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded line-through">
          {field === 'impactoEconomico' && currentValue ? formatCurrency(parseFloat(currentValue)) : (currentValue?.replace(/_/g, ' ') || '—')}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
          {field === 'impactoEconomico' && value ? formatCurrency(parseFloat(value)) : (value?.replace(/_/g, ' ') || '—')}
        </span>
      </div>

      {type === 'select' && options ? (
        <Select
          value={value}
          onChange={setValue}
          options={options.map(o => ({ value: o, label: o.replace(/_/g, ' ') }))}
        />
      ) : (
        <input
          type="number"
          className="w-full border rounded px-2 py-1.5 text-sm bg-background"
          value={value}
          onChange={e => setValue(e.target.value)}
          step="0.01"
        />
      )}

      <Textarea
        placeholder="Justificación obligatoria del cambio..."
        className="min-h-16 text-xs"
        value={justificacion}
        onChange={(e: any) => setJustificacion(e.target.value)}
      />

      <Button
        size="sm"
        className="w-full text-xs"
        disabled={saving || !justificacion.trim() || value === currentValue}
        onClick={handleSave}
      >
        {saving ? 'Guardando...' : 'Confirmar Cambio'}
      </Button>
    </div>
  );
}

// ============================================================
// VALIDATION PANEL COMPONENT
// ============================================================

function ValidationPanel({
  hallazgo,
  onSaved,
}: {
  hallazgo: HallazgoDetalle;
  onSaved: () => void;
}) {
  const [justificacion, setJustificacion] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleValidacion(validacion: string) {
    if (!justificacion.trim()) return;
    setSaving(true);
    try {
      await apiPatch(`/hallazgos/${hallazgo.id}`, {
        cambios: { validacion },
        justificacion,
        userId: MOCK_USER_ID,
      });
      onSaved();
      setJustificacion('');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  const currentValidacion = VALIDACIONES.find(v => v.value === hallazgo.validacion) || VALIDACIONES[0];
  const CurrentIcon = currentValidacion.icon;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Validación del Hallazgo
        </CardTitle>
        <CardDescription className="text-xs">
          ¿Este hallazgo detectado por IA es correcto?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current status */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40">
          <CurrentIcon className={`h-4 w-4 ${currentValidacion.color}`} />
          <span className="text-sm font-medium">{currentValidacion.label}</span>
        </div>

        <Textarea
          placeholder="Explique por qué confirma, descarta parcial o totalmente este hallazgo..."
          className="min-h-16 text-xs"
          value={justificacion}
          onChange={(e: any) => setJustificacion(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          {VALIDACIONES.filter(v => v.value !== 'PENDIENTE').map(v => {
            const VIcon = v.icon;
            return (
              <Button
                key={v.value}
                variant={hallazgo.validacion === v.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-9 gap-1.5"
                disabled={saving || !justificacion.trim()}
                onClick={() => handleValidacion(v.value)}
              >
                <VIcon className="h-3.5 w-3.5" />
                {v.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// AI CONFIDENCE RATING COMPONENT
// ============================================================

function ConfianzaIAPanel({
  hallazgo,
  onSaved,
}: {
  hallazgo: HallazgoDetalle;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(hallazgo.confianzaIA || 0);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (rating === 0) return;
    setSaving(true);
    try {
      await apiPatch(`/hallazgos/${hallazgo.id}/confianza-ia`, {
        confianzaIA: rating,
        notasRevisor: nota || undefined,
        userId: MOCK_USER_ID,
      });
      onSaved();
      setNota('');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Calidad Detección IA
        </CardTitle>
        <CardDescription className="text-xs">
          ¿Qué tan preciso fue el análisis de IA?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className={`p-1 rounded transition-all ${
                n <= rating
                  ? 'text-amber-500 scale-110'
                  : 'text-muted-foreground/30 hover:text-amber-400'
              }`}
            >
              <Star className={`h-6 w-6 ${n <= rating ? 'fill-current' : ''}`} />
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {rating === 0 && 'Sin calificar'}
          {rating === 1 && 'Muy impreciso'}
          {rating === 2 && 'Poco preciso'}
          {rating === 3 && 'Aceptable'}
          {rating === 4 && 'Preciso'}
          {rating === 5 && 'Muy preciso'}
        </p>
        {rating > 0 && rating !== (hallazgo.confianzaIA || 0) && (
          <>
            <Textarea
              placeholder="Notas adicionales (opcional)..."
              className="min-h-12 text-xs"
              value={nota}
              onChange={(e: any) => setNota(e.target.value)}
            />
            <Button size="sm" className="w-full text-xs" disabled={saving} onClick={handleSave}>
              {saving ? 'Guardando...' : 'Guardar Calificación'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// UNIFIED TIMELINE (Bitácora) COMPONENT
// ============================================================

function UnifiedTimeline({
  resoluciones,
  historialCambios,
}: {
  resoluciones: Resolucion[];
  historialCambios: HistorialCambio[];
}) {
  // Merge and sort by date
  type TimelineEntry = {
    id: string;
    type: 'resolucion' | 'cambio';
    date: string;
    user: string;
    data: Resolucion | HistorialCambio;
  };

  const entries: TimelineEntry[] = [
    ...resoluciones.map(r => ({
      id: r.id,
      type: 'resolucion' as const,
      date: r.createdAt,
      user: r.resueltoPor?.name || 'Sistema',
      data: r,
    })),
    ...historialCambios.map(h => ({
      id: h.id,
      type: 'cambio' as const,
      date: h.createdAt,
      user: h.user?.name || 'Sistema',
      data: h,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <History className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
        <p>No hay gestiones registradas aún.</p>
        <p className="text-xs mt-1">Los cambios, resoluciones y comentarios aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        if (entry.type === 'resolucion') {
          const res = entry.data as Resolucion;
          return (
            <div key={entry.id} className="relative pl-6 border-l-2 border-primary/30">
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-background border-2 border-primary" />
              <div className="mb-1 flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{entry.user}</span>
                <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                <Badge variant="outline" className="text-[10px] ml-auto bg-primary/10 border-primary/30">
                  🛡️ {res.tipo.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md mt-1">
                {res.explicacion}
              </p>
            </div>
          );
        }

        const cambio = entry.data as HistorialCambio;
        const config = TIPO_CAMBIO_CONFIG[cambio.tipo] || { label: cambio.tipo, icon: '📋', color: 'border-muted' };

        const isFieldChange = cambio.campo && cambio.valorAnterior && cambio.valorNuevo;
        const isComment = cambio.tipo === 'COMENTARIO' || cambio.tipo === 'NOTA_GESTION';

        return (
          <div key={entry.id} className={`relative pl-6 border-l-2 ${config.color.includes('border-') ? config.color.split(' ')[0] : 'border-muted-foreground/20'}`}>
            <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-background border-2 ${
              cambio.tipo === 'RESOLUCION' ? 'border-primary' :
              cambio.tipo === 'COMENTARIO' ? 'border-slate-400' :
              cambio.tipo === 'CAMBIO_VALIDACION' ? 'border-emerald-500' :
              'border-amber-400'
            }`} />
            
            <div className="mb-1 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{entry.user}</span>
              <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
              <Badge variant="outline" className={`text-[10px] ml-auto ${config.color}`}>
                {config.icon} {config.label}
              </Badge>
            </div>

            {/* Field change diff */}
            {isFieldChange && !isComment && (
              <div className="flex items-center gap-2 text-xs mt-1 mb-1">
                <code className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded line-through">
                  {cambio.campo === 'impactoEconomico' && cambio.valorAnterior !== 'null'
                    ? formatCurrency(parseFloat(cambio.valorAnterior!))
                    : cambio.valorAnterior?.replace(/_/g, ' ')}
                </code>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <code className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-semibold">
                  {cambio.campo === 'impactoEconomico' && cambio.valorNuevo !== 'null'
                    ? formatCurrency(parseFloat(cambio.valorNuevo!))
                    : cambio.valorNuevo?.replace(/_/g, ' ')}
                </code>
              </div>
            )}

            {/* Justification / comment body */}
            <p className={`text-sm text-muted-foreground p-2.5 rounded-md mt-1 ${
              isComment ? 'bg-muted/40 border border-muted-foreground/10' : 'bg-muted/30 italic'
            }`}>
              {cambio.justificacion}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// COMMENT FORM COMPONENT
// ============================================================

function ComentarioForm({ hallazgoId, onSaved }: { hallazgoId: string; onSaved: () => void }) {
  const [contenido, setContenido] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!contenido.trim()) return;
    setSaving(true);
    try {
      await apiPost(`/hallazgos/${hallazgoId}/comentarios`, {
        contenido,
        tipo: 'COMENTARIO',
        userId: MOCK_USER_ID,
      });
      onSaved();
      setContenido('');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-2 mt-4 pt-4 border-t">
      <Textarea
        placeholder="Agregar comentario o nota de gestión..."
        className="min-h-10 text-sm flex-1"
        value={contenido}
        onChange={(e: any) => setContenido(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 self-end"
        disabled={saving || !contenido.trim()}
        onClick={handleSubmit}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function HallazgoDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [hallazgo, setHallazgo] = useState<HallazgoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Formulario resolución
  const [tipoRes, setTipoRes] = useState('RESUELTO_CON_EXPLICACION');
  const [explicacion, setExplicacion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadHallazgo = useCallback(async () => {
    try {
      const data = await apiGet<{ data: HallazgoDetalle }>(`/hallazgos/${id}`);
      setHallazgo((data as any).data || data);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadHallazgo();
  }, [loadHallazgo]);

  async function handleResolver() {
    if (!explicacion.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        tipo: tipoRes,
        explicacion,
        resueltoPorId: hallazgo?.asignadoA?.id || MOCK_USER_ID, 
      };
      
      await apiPost(`/hallazgos/${id}/resoluciones`, payload);
      await loadHallazgo(); // Reload everything to get updated historial
      setExplicacion('');
    } catch {
      // Error handling
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Cargando hallazgo...</div>
      </div>
    );
  }

  if (!hallazgo) {
    return (
      <div className="space-y-4">
        <Link href="/hallazgos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <p className="text-center text-muted-foreground">Hallazgo no encontrado</p>
      </div>
    );
  }

  const isOpen = hallazgo.estado === 'ABIERTO' || hallazgo.estado === 'EN_GESTION';
  const validacionInfo = VALIDACIONES.find(v => v.value === hallazgo.validacion) || VALIDACIONES[0];
  const ValidacionIcon = validacionInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hallazgos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{hallazgo.titulo}</h1>
            <Badge variant={estadoColor(hallazgo.estado) as any}>{hallazgo.estado.replace('_', ' ')}</Badge>
            <Badge variant="outline" className={`gap-1 ${validacionInfo.color}`}>
              <ValidacionIcon className="h-3 w-3" />
              {validacionInfo.label}
            </Badge>
            {hallazgo.confianzaIA && (
              <span className="flex items-center gap-0.5 text-xs text-amber-600">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < hallazgo.confianzaIA! ? 'fill-current' : 'opacity-30'}`} />
                ))}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            <Link href={`/fideicomisos/${hallazgo.fideicomiso.id}`} className="hover:underline text-primary">
              {hallazgo.fideicomiso.codigoPrincipal} — {hallazgo.fideicomiso.nombre}
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* LEFT COLUMN — Details + Bitácora */}
        <div className="md:col-span-2 space-y-6">
          {/* Detalles del Hallazgo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles del Hallazgo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-1 text-sm text-muted-foreground">Descripción Operativa</h3>
                <p className="text-sm">{hallazgo.descripcion}</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-md border">
                <h3 className="font-medium mb-4 text-sm flex items-center gap-2">
                  <span className="bg-primary/10 text-primary p-1 rounded-md"><MessageSquare className="h-4 w-4"/></span>
                  Razonamiento Motor Devise
                </h3>
                {(() => {
                  if (!hallazgo.razonamiento) return <span className="text-muted-foreground italic text-sm">Sin razonamiento registrado.</span>;
                  try {
                    const parsed = JSON.parse(hallazgo.razonamiento);
                    return (
                      <div className="space-y-4 font-mono text-sm leading-relaxed">
                        {Object.entries(parsed).map(([key, value]) => (
                          <div key={key} className="bg-background rounded-md border border-muted-foreground/20 p-3 shadow-sm">
                            <h4 className="text-xs font-bold text-primary mb-1 uppercase tracking-wider bg-primary/10 inline-block px-2 py-0.5 rounded">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </h4>
                            <div className="text-muted-foreground mt-1">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {String(value)}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } catch (e) {
                    return (
                      <div className="text-sm font-mono space-y-3 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-table:border-collapse prose-th:border prose-th:bg-muted/50 prose-td:border prose-td:p-2 prose-th:p-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {hallazgo.razonamiento}
                        </ReactMarkdown>
                      </div>
                    );
                  }
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Bitácora de Gestión — Timeline Unificada */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-primary" />
                  Bitácora de Gestión
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {(hallazgo.resoluciones?.length || 0) + (hallazgo.historialCambios?.length || 0)} registros
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Historial completo de cambios, resoluciones y comentarios — trazabilidad total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedTimeline
                resoluciones={hallazgo.resoluciones || []}
                historialCambios={hallazgo.historialCambios || []}
              />
              <ComentarioForm hallazgoId={hallazgo.id} onSaved={loadHallazgo} />
            </CardContent>
          </Card>
        </div>
        
        {/* RIGHT COLUMN — Metadata + Actions */}
        <div className="space-y-6">
          {/* Metadata (Editable) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Metadata
                <span className="text-[10px] text-muted-foreground font-normal ml-auto">hover para editar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InlineEdit
                field="severidad"
                label="Severidad"
                currentValue={hallazgo.severidad}
                options={SEVERIDADES}
                hallazgoId={hallazgo.id}
                onSaved={loadHallazgo}
              />
              <InlineEdit
                field="categoria"
                label="Categoría"
                currentValue={hallazgo.categoria}
                options={CATEGORIAS}
                hallazgoId={hallazgo.id}
                onSaved={loadHallazgo}
              />
              <InlineEdit
                field="subcategoria"
                label="Subcategoría"
                currentValue={hallazgo.subcategoria || ''}
                options={SUBCATEGORIAS}
                hallazgoId={hallazgo.id}
                onSaved={loadHallazgo}
              />
              <InlineEdit
                field="area"
                label="Área"
                currentValue={hallazgo.area || ''}
                options={AREAS}
                hallazgoId={hallazgo.id}
                onSaved={loadHallazgo}
              />
              <InlineEdit
                field="impactoEconomico"
                label="Impacto Económico"
                currentValue={hallazgo.impactoEconomico?.toString() || ''}
                type="number"
                hallazgoId={hallazgo.id}
                onSaved={loadHallazgo}
              />
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs text-muted-foreground">Tipo Algoritmo</span>
                <span className="text-sm font-medium">{hallazgo.tipo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Detectado el</span>
                <span className="text-sm">{formatDate(hallazgo.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Validation Panel */}
          <ValidationPanel hallazgo={hallazgo} onSaved={loadHallazgo} />

          {/* AI Confidence Rating */}
          <ConfianzaIAPanel hallazgo={hallazgo} onSaved={loadHallazgo} />

          {/* Resolución Form */}
          {isOpen && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm">Agregar Resolución</CardTitle>
                <CardDescription>Cerrar o actualizar este hallazgo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Tipo de Acción</label>
                  <Select
                    value={tipoRes}
                    onChange={setTipoRes}
                    options={TIPOS_RESOLUCION.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Justificación Operativa</label>
                  <Textarea
                    placeholder="Detalle el motivo del cierre o avance..."
                    className="min-h-24 text-sm"
                    value={explicacion}
                    onChange={(e: any) => setExplicacion(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  disabled={submitting || !explicacion.trim()}
                  onClick={handleResolver}
                >
                  {submitting ? 'Guardando...' : 'Guardar Resolución'}
                </Button>
              </CardContent>
            </Card>
          )}

          {!isOpen && (
            <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 p-4 rounded-md flex items-start gap-3 text-sm">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <p>Este hallazgo ya ha sido resuelto y gestionado operativamente. No requiere más acciones.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
