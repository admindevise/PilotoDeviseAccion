'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
import { formatDate, severityClass, estadoColor } from '@/lib/utils';

interface Hallazgo {
  id: string;
  titulo: string;
  severidad: string;
  estado: string;
  categoria: string;
  fideicomiso?: { nombre: string };
  createdAt: string;
}

interface RecentHallazgosProps {
  hallazgos: Hallazgo[];
}

export function RecentHallazgos({ hallazgos }: RecentHallazgosProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Hallazgos Recientes</CardTitle>
            <CardDescription>
              Ultimos hallazgos detectados por el sistema
            </CardDescription>
          </div>
          <Link
            href="/hallazgos"
            className="text-sm font-medium text-fidu-accent hover:underline"
          >
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {hallazgos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay hallazgos recientes
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hallazgo</TableHead>
                <TableHead>Fideicomiso</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hallazgos.map((h) => (
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
                    {h.fideicomiso?.nombre || '—'}
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
                  <TableCell className="text-muted-foreground">
                    {h.categoria}
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
  );
}
