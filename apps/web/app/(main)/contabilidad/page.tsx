'use client';

import React, { useEffect, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, FileText, CheckSquare, Search, Filter } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

interface Factura {
  id: string;
  fideicomiso: { id: string; nombre: string; codigoPrincipal: string };
  numeroFactura: string;
  fecha: string;
  concepto: string;
  monto: number;
  iva: number;
  total: number;
  estado: string;
  periodoContable: string;
}

interface MovimientoContable {
  id: string;
  fideicomiso: { id: string; nombre: string; codigoPrincipal: string };
  origenERP: string;
  fecha: string;
  cuenta: string;
  nombreCuenta: string;
  concepto: string;
  debito: number;
  credito: number;
  periodoContable: string;
}

interface Recaudo {
  id: string;
  factura: Factura;
  fecha: string;
  monto: number;
  referencia: string;
  medioPago: string;
}

export default function ContabilidadPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoContable[]>([]);
  const [recaudos, setRecaudos] = useState<Recaudo[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);

  // Filtros simples integrados
  const [searchFactura, setSearchFactura] = useState('');
  const [searchMovimiento, setSearchMovimiento] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [fData, mData, rData] = await Promise.allSettled([
          apiGet<{ data: Factura[] }>('/facturas?limit=5000'),
          apiGet<{ data: MovimientoContable[] }>('/movimientos-contables?limit=5000'),
          apiGet<{ data: Recaudo[] }>('/recaudos?limit=5000'),
        ]);

        if (fData.status === 'fulfilled') {
          const res = (fData.value as any).data || fData.value;
          setFacturas(res);
        }
        if (mData.status === 'fulfilled') {
          const res = (mData.value as any).data || mData.value;
          setMovimientos(res);
        }
        if (rData.status === 'fulfilled') {
          const res = (rData.value as any).data || rData.value;
          setRecaudos(res);
        }
      } catch (error) {
        console.error('Error cargando contabilidad', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeFacturas = facturas.filter(f => f.estado !== 'ANULADA' && f.estado !== 'ANULADA_NC');
  const totalFacturado = activeFacturas.reduce((sum, f) => sum + f.total, 0);
  const totalRecaudado = recaudos.reduce((sum, r) => sum + r.monto, 0);
  
  const pdteRecaudo = activeFacturas.reduce((sum, f) => {
    if (f.estado === 'PAGADA') return sum;
    if (f.estado === 'PENDIENTE') return sum + f.total;
    if (f.estado === 'PARCIAL') {
      const recs = recaudos.filter(r => r.factura?.id === f.id);
      const sumRecs = recs.reduce((s, r) => s + r.monto, 0);
      return sum + Math.max(0, f.total - sumRecs);
    }
    return sum;
  }, 0);

  function estadoFacturaColor(estado: string) {
    if (estado === 'PAGADA') return 'secondary';
    if (estado === 'PARCIAL') return 'outline';
    return 'destructive';
  }

  const filteredFacturas = facturas.filter(f => 
    f.numeroFactura.toLowerCase().includes(searchFactura.toLowerCase()) || 
    f.fideicomiso.codigoPrincipal.toLowerCase().includes(searchFactura.toLowerCase()) ||
    (f.concepto || '').toLowerCase().includes(searchFactura.toLowerCase())
  );

  const filteredMovimientos = movimientos.filter(m => 
    m.cuenta.toLowerCase().includes(searchMovimiento.toLowerCase()) || 
    m.fideicomiso.codigoPrincipal.toLowerCase().includes(searchMovimiento.toLowerCase()) ||
    (m.concepto || '').toLowerCase().includes(searchMovimiento.toLowerCase())
  );

  // Filtrar recaudos para la factura seleccionada (si hay modal abierto)
  const modalRecaudos = selectedFactura 
    ? recaudos.filter(r => r.factura?.id === selectedFactura.id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Contabilidad y Facturación
        </h1>
        <p className="text-muted-foreground">
          Gestión unificada de facturas, recaudos y movimientos contables
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* KPI Cards... */ }
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFacturado)}</div>
            <p className="text-xs text-muted-foreground mt-1">En {activeFacturas.length} facturas emitidas</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recaudado</CardTitle>
            <CheckSquare className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totalRecaudado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">En {recaudos.length} transacciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cartera Vencida</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(pdteRecaudo > 0 ? pdteRecaudo : 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pendiente por cobrar</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="facturas" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="facturas">Facturas Emitidas</TabsTrigger>
          <TabsTrigger value="recaudos">Recaudos Registrados</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos Contables</TabsTrigger>
        </TabsList>

        {/* FACTURAS TAB */}
        <TabsContent value="facturas">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Facturación</CardTitle>
                  <CardDescription>Registro de CXC y facturas generadas</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Filtrar por código o concepto..." 
                    className="pl-9 h-9"
                    value={searchFactura}
                    onChange={e => setSearchFactura(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Cargando facturas...</p>
              ) : filteredFacturas.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No se encontraron facturas</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fideicomiso</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredFacturas.map((f) => (
                        <TableRow 
                          key={f.id} 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedFactura(f)}
                        >
                          <TableCell className="font-mono font-medium text-primary decoration-primary/50 underline-offset-4 hover:underline">
                            {f.numeroFactura}
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{f.fideicomiso.codigoPrincipal}</span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{f.concepto || '—'}</TableCell>
                          <TableCell>{f.periodoContable}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(f.total)}</TableCell>
                          <TableCell>
                            <Badge variant={estadoFacturaColor(f.estado) as any}>{f.estado}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECAUDOS TAB */}
        <TabsContent value="recaudos">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle>Recaudos Registrados</CardTitle>
              <CardDescription>Pagos aplicados a las facturas emitidas</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Cargando recaudos...</p>
              ) : recaudos.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No se encontraron recaudos</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Factura Asoc.</TableHead>
                      <TableHead>Fideicomiso</TableHead>
                      <TableHead>Medio de Pago</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recaudos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDate(r.fecha)}</TableCell>
                        <TableCell className="font-mono">
                          {r.factura?.numeroFactura || 'S/N'}
                        </TableCell>
                        <TableCell>
                          {r.factura?.fideicomiso?.codigoPrincipal || '—'}
                        </TableCell>
                        <TableCell><Badge variant="outline">{r.medioPago || 'TRANSFERENCIA'}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.referencia || '—'}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {formatCurrency(r.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOVIMIENTOS CONTABLES TAB */}
        <TabsContent value="movimientos">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Libro Mayor (Movimientos Contables)</CardTitle>
                  <CardDescription>Detalle de transacciones extraidas de las fuentes ERP</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Filtrar por cuenta o concepto..." 
                    className="pl-9 h-9"
                    value={searchMovimiento}
                    onChange={e => setSearchMovimiento(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Cargando movimientos...</p>
              ) : filteredMovimientos.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No se encontraron movimientos contables</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Fideicomiso</TableHead>
                      <TableHead>Cuenta (PUC)</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Débito</TableHead>
                      <TableHead className="text-right">Crédito</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovimientos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.fecha)}</TableCell>
                        <TableCell>
                          {m.fideicomiso?.codigoPrincipal || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono">{m.cuenta}</div>
                          <div className="text-xs text-muted-foreground truncate w-32">{m.nombreCuenta}</div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{m.concepto || '—'}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {m.debito > 0 ? formatCurrency(m.debito) : '—'}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {m.credito > 0 ? formatCurrency(m.credito) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DETALLE DE FACTURA */}
      {selectedFactura && (
        <Modal 
          isOpen={!!selectedFactura} 
          onClose={() => setSelectedFactura(null)}
          title={`Detalle de Factura: ${selectedFactura.numeroFactura}`}
          width="max-w-3xl"
        >
          <div className="space-y-6">
            {/* Cabecera Info Principal */}
            <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Fideicomiso Asignado</h3>
                <Link href={`/fideicomisos/${selectedFactura.fideicomiso.id}`} className="font-semibold text-primary hover:underline text-lg">
                  {selectedFactura.fideicomiso.codigoPrincipal} - {selectedFactura.fideicomiso.nombre}
                </Link>
              </div>
              <div className="flex flex-col md:items-end gap-2">
                <Badge className="w-fit" variant={estadoFacturaColor(selectedFactura.estado) as any}>
                  Estado: {selectedFactura.estado}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Fecha:</span> {formatDate(selectedFactura.fecha)}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Periodo:</span> {selectedFactura.periodoContable}
                </div>
              </div>
            </div>

            {/* Concepto Completo */}
            <div className="bg-muted/30 p-4 rounded-md border text-sm">
              <h4 className="font-semibold text-foreground mb-2">Concepto de Facturación</h4>
              <p className="whitespace-pre-wrap font-mono text-muted-foreground">
                {selectedFactura.concepto || 'Sin concepto detallado.'}
              </p>
            </div>

            {/* Desglose de Valores */}
            <div className="grid grid-cols-3 gap-4 border rounded-md p-4 bg-muted/10">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Subtotal</div>
                <div className="text-xl font-medium">{formatCurrency(selectedFactura.monto)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">IVA (19%)</div>
                <div className="text-xl font-medium">{formatCurrency(selectedFactura.iva)}</div>
              </div>
              <div className="bg-primary/5 rounded-md -m-2 p-2 px-3 border border-primary/20">
                <div className="text-xs text-primary uppercase tracking-wider font-semibold mb-1">Total Factura</div>
                <div className="text-2xl font-bold text-primary">{formatCurrency(selectedFactura.total)}</div>
              </div>
            </div>

            {/* Recaudos (Pagos) */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" /> Historial de Recaudos
              </h4>
              {modalRecaudos.length === 0 ? (
                <div className="text-center py-6 border rounded-md bg-muted/5 text-muted-foreground text-sm">
                  Esta factura aún no registra recaudos asociados.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Fecha de Pago</TableHead>
                        <TableHead>Medio de Pago</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead className="text-right">Monto Recaudado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modalRecaudos.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{formatDate(r.fecha)}</TableCell>
                          <TableCell><Badge variant="outline">{r.medioPago || 'TRANSFERENCIA'}</Badge></TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{r.referencia || '—'}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">{formatCurrency(r.monto)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Fila de Total Recaudado */}
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={3} className="text-right font-semibold">Total Percibido:</TableCell>
                        <TableCell className="text-right font-bold text-emerald-700">
                          {formatCurrency(modalRecaudos.reduce((s, r) => s + r.monto, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

          </div>
        </Modal>
      )}
    </div>
  );
}
