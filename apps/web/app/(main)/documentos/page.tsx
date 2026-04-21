'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Upload, FileText, Search, File } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Documento {
  id: string;
  nombreArchivo: string;
  tipo: string;
  formatoOriginal: string;
  clasificacion?: any;
  procesado?: boolean;
  fideicomiso?: { nombre: string; codigoPrincipal: string };
  fechaCarga: string;
}

const formatoIcon: Record<string, string> = {
  PDF: 'text-red-500',
  PDF_ZIP: 'text-red-400',
  XLSX: 'text-emerald-600',
  CSV: 'text-blue-500',
  TSV: 'text-blue-400',
  MSG: 'text-amber-500',
  EML: 'text-amber-400',
  DOCX: 'text-indigo-500',
};

export default function DocumentosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Cargando Gestor Documental...</div>}>
      <DocumentosContent />
    </Suspense>
  );
}

function DocumentosContent() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const fideicomisoIdUrl = searchParams.get('fideicomiso');

  useEffect(() => {
    async function load() {
      try {
        const queryParams = fideicomisoIdUrl ? `?fideicomisoId=${fideicomisoIdUrl}` : '';
        const data = await apiGet<Documento[]>(`/documentos${queryParams}`);
        setDocumentos(Array.isArray(data) ? data : []);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fideicomisoIdUrl]);

  const filtered = documentos.filter(
    (d) =>
      d.nombreArchivo?.toLowerCase().includes(search.toLowerCase()) ||
      (d.tipo && d.tipo.toLowerCase().includes(search.toLowerCase()))
  );

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append('files', file);
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/documentos/upload`,
        { method: 'POST', body: formData }
      );
      if (res.ok) {
        const json = await res.json();
        const newDocs = Array.isArray(json.data) ? json.data : [json.data];
        setDocumentos((prev) => [...newDocs, ...prev]);
      }
    } catch {
      // handle error
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">
            Gestión y clasificación automática de documentos fiduciarios
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.xlsx,.csv,.tsv,.msg,.eml,.docx,.zip"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button onClick={handleUploadClick}>
            <Upload className="mr-2 h-4 w-4" />
            Cargar Documentos
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Documentos Cargados ({filtered.length})
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando documentos...
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {documentos.length === 0
                  ? 'No hay documentos cargados. Use el botón para cargar archivos.'
                  : 'No se encontraron resultados.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead>Confianza</TableHead>
                  <TableHead>Fideicomiso</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <File
                          className={`h-4 w-4 ${
                            formatoIcon[d.formatoOriginal] ||
                            'text-muted-foreground'
                          }`}
                        />
                        <span className="font-medium">{d.nombreArchivo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.formatoOriginal}</Badge>
                    </TableCell>
                    <TableCell>
                      {d.clasificacion ? (
                        <Badge variant="secondary">
                          {typeof d.clasificacion === 'string' 
                            ? d.clasificacion.replace(/_/g, ' ') 
                            : d.clasificacion.tipo 
                              ? d.clasificacion.tipo.replace(/_/g, ' ') 
                              : 'Clasificado'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          Sin clasificar
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.clasificacion && (d.clasificacion as any).confidence ? (
                        <span
                          className={
                            (d.clasificacion as any).confidence > 0.8
                              ? 'font-medium text-emerald-600'
                              : (d.clasificacion as any).confidence > 0.5
                                ? 'text-amber-600'
                                : 'text-destructive'
                          }
                        >
                          {((d.clasificacion as any).confidence * 100).toFixed(0)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.fideicomiso?.codigoPrincipal || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.fechaCarga ? formatDate(d.fechaCarga) : '—'}
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
