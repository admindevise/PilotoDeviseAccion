'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Plus, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';

interface Fideicomiso {
  id: string;
  codigoPrincipal: string;
  nombre: string;
  tipologia: string;
  estado: string;
  createdAt: string;
  codigosSuperintendencia?: { codigo: string; tipo: string }[];
}

export default function FideicomisosPage() {
  const [fideicomisos, setFideicomisos] = useState<Fideicomiso[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<Fideicomiso[]>('/fideicomisos');
        setFideicomisos(Array.isArray(data) ? data : []);
      } catch {
        // API not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = fideicomisos.filter(
    (f) =>
      f.nombre.toLowerCase().includes(search.toLowerCase()) ||
      f.codigoPrincipal.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fideicomisos</h1>
          <p className="text-muted-foreground">
            Gestión de fideicomisos y sus configuraciones
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Fideicomiso
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Listado de Fideicomisos
            </CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o código..."
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
              Cargando fideicomisos...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {fideicomisos.length === 0
                ? 'No hay fideicomisos registrados. Comience creando uno nuevo.'
                : 'No se encontraron resultados para la búsqueda.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipología</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono">
                      <div className="font-medium">{f.codigoPrincipal}</div>
                      {f.codigosSuperintendencia && f.codigosSuperintendencia.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          SFC: {f.codigosSuperintendencia.find(c => c.tipo === 'PRINCIPAL')?.codigo || f.codigosSuperintendencia[0].codigo}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/fideicomisos/${f.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {f.nombre}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{f.tipologia}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          f.estado === 'ACTIVO' ? 'default' : 'secondary'
                        }
                      >
                        {f.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/fideicomisos/${f.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver Detalle
                        </Button>
                      </Link>
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
