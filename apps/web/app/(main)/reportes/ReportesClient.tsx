'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { FileText, Download, BarChart, FileSpreadsheet, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReportesClient() {
  const [fideicomisos, setFideicomisos] = useState<{id: string, codigoPrincipal: string, nombre: string}[]>([]);
  const [selectedFideicomiso, setSelectedFideicomiso] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: ensure API is running on localhost:4000
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/fideicomisos`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setFideicomisos(data.data);
          if (data.data.length > 0) {
            setSelectedFideicomiso(data.data[0].id);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleDownload = () => {
    if (!selectedFideicomiso) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/fideicomisos/${selectedFideicomiso}/hallazgos/reporte/pdf`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Central de Reportes
        </h1>
        <p className="text-muted-foreground">
          Generación y exportación de informes de conciliación y auditoría fiduciaria
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Reporte de Hallazgos críticos */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <CardTitle className="text-base">Hallazgos y Anomalías por Fideicomiso</CardTitle>
            </div>
            <CardDescription>
              Descarga el reporte detallado en formato PDF con la matriz de riesgo y evidencias estructurales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando fideicomisos...
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-full sm:w-1/2">
                  <label htmlFor="fideicomiso-select" className="block text-sm font-medium mb-1">
                    Selecciona un Fideicomiso
                  </label>
                  <select
                    id="fideicomiso-select"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedFideicomiso}
                    onChange={(e) => setSelectedFideicomiso(e.target.value)}
                  >
                    <option value="" disabled>Seleccione...</option>
                    {fideicomisos.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.codigoPrincipal} - {f.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <Button 
                  onClick={handleDownload} 
                  disabled={!selectedFideicomiso}
                  className="mt-5 sm:mt-6 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Reporte PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reporte de Conciliación Global */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-primary/10 rounded-md">
                <BarChart className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Consolidado Mensual</CardTitle>
            </div>
            <CardDescription>
              Resumen ejecutivo de conciliaciones, reglas cruzadas y discrepancias por fideicomiso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-start" disabled>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar a Excel (Próximamente)
            </Button>
          </CardContent>
        </Card>

        {/* Reporte de Revenue */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-md">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <CardTitle className="text-base">Oportunidades Revenue</CardTitle>
            </div>
            <CardDescription>
              Proyección financiera de facturación pendiente y comisiones no cobradas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF (Próximamente)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
