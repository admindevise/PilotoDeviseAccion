'use client';

import React, { useEffect, useState } from 'react';
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
import { TrendingUp, Calendar, ExternalLink } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

interface ValorHistorico {
  id: string;
  valor: number;
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  normaLegal: string | null;
  createdAt: string;
}

interface VariableMacro {
  id: string;
  codigo: string;
  nombre: string;
  periodicidad: string;
  unidad: string;
  fuenteOficial: string;
  valorActual: ValorHistorico | null;
  valores?: ValorHistorico[];
}

export default function VariablesMacroPage() {
  const [variables, setVariables] = useState<VariableMacro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await apiGet<{ data: VariableMacro[] }>('/variables-macro');
        const list = (response as any).data || response;
        setVariables(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error fetching variables macro', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function formatValor(valor: number, unidad: string) {
    if (unidad === 'COP') return formatCurrency(valor);
    if (unidad === '%') return `${valor}%`;
    return `${valor} ${unidad}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" /> Variables Macroeconómicas
        </h1>
        <p className="text-muted-foreground">
          Indicadores y tasas oficiales utilizadas en la liquidación de comisiones
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">
          Cargando indicadores...
        </p>
      ) : variables.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              No hay variables macroeconómicas configuradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {variables.map((variable) => {
            const currentObj = variable.valorActual;
            const hasHistory = Boolean(variable.valores && variable.valores.length > 1);

            return (
              <Card key={variable.id} className="flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {variable.codigo}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {variable.nombre}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {variable.periodicidad}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <div className="text-sm text-muted-foreground mb-1">
                      Valor Actual
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {currentObj
                        ? formatValor(currentObj.valor, variable.unidad)
                        : '—'}
                    </div>
                    {currentObj && (
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Desde {formatDate(currentObj.vigenciaDesde)}
                        {currentObj.normaLegal && (
                          <span className="ml-1 border-l pl-2 border-border">
                            {currentObj.normaLegal}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {hasHistory && (
                    <div className="mt-auto border-t pt-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Histórico Reciente
                      </div>
                      <div className="space-y-2">
                        {(variable.valores || []).slice(1, 6).map((val, idx) => (
                          <div key={val.id || idx} className="flex items-center justify-between text-sm py-1 border-b last:border-0 border-border/50">
                            <span className="text-muted-foreground">{new Date(val.vigenciaDesde).getFullYear()}</span>
                            <span className="font-medium text-foreground">{formatValor(val.valor, variable.unidad)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <div className="px-6 py-3 bg-muted/30 border-t flex items-center text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Fuente: {variable.fuenteOficial}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
