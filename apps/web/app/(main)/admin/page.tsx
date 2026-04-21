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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, ShieldAlert, Search } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  user: { name: string; email: string; role: string } | null;
  accion: string;
  entidad: string;
  entidadId: string;
  cambios: any;
  ip: string;
  createdAt: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchUser, setSearchUser] = useState('');
  const [searchAudit, setSearchAudit] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // Mocking demo users from NextAuth credentials provider 
        const mockUsers: User[] = [
          { id: "1", name: "Analista Contable", email: "analista@dis.com.co", role: "ANALISTA_CONTABLE", active: true, createdAt: "2026-02-22T00:00:00Z" },
          { id: "2", name: "Gerente de Fideicomiso", email: "gerente@dis.com.co", role: "GERENTE_FIDEICOMISO", active: true, createdAt: "2026-02-22T00:00:00Z" },
          { id: "3", name: "Administrador DIS", email: "admin@dis.com.co", role: "ADMIN", active: true, createdAt: "2026-02-22T00:00:00Z" },
          { id: "4", name: "Monica Abogado", email: "monica.abogado@accion.co", role: "GERENTE_FIDEICOMISO", active: true, createdAt: "2026-03-03T00:00:00Z" },
          { id: "5", name: "Cliente Demo", email: "demo@fidu.com", role: "GERENTE_FIDEICOMISO", active: true, createdAt: "2026-02-22T00:00:00Z" },
        ];

        const [uData, aData] = await Promise.allSettled([
          Promise.resolve({ data: mockUsers }), // Replaced API call with the simulated demo users
          apiGet<{ data: AuditLog[] }>('/audit-logs?limit=100'),
        ]);

        if (uData.status === 'fulfilled') {
          const res = (uData.value as any).data || uData.value;
          setUsers(res);
        }
        if (aData.status === 'fulfilled') {
          const res = (aData.value as any).data || aData.value;
          setAuditLogs(res);
        }
      } catch (error) {
        console.error('Error cargando admin', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
    u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.role.toLowerCase().includes(searchUser.toLowerCase())
  );

  const filteredAudit = auditLogs.filter(a => 
    a.accion.toLowerCase().includes(searchAudit.toLowerCase()) || 
    a.entidad.toLowerCase().includes(searchAudit.toLowerCase()) ||
    (a.user?.name || '').toLowerCase().includes(searchAudit.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Administración del Sistema
        </h1>
        <p className="text-muted-foreground">
          Gestión de usuarios, roles y traza de auditoría de seguridad
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Registrados</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Con acceso al sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos de Auditoría</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registros de seguridad almacenados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Usuarios y Accesos</TabsTrigger>
          <TabsTrigger value="audit">Traza de Auditoría</TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Directorio de Usuarios</CardTitle>
                  <CardDescription>Usuarios con acceso y sus respectivos roles IAM</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar usuario..." 
                    className="pl-9 h-9"
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Cargando usuarios...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No se encontraron usuarios</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol IAM</TableHead>
                      <TableHead>Fecha Registro</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{u.role}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(u.createdAt)}</TableCell>
                        <TableCell>
                          {u.active ? (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">ACTIVO</Badge>
                          ) : (
                            <Badge variant="destructive">INACTIVO</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDIT LOGS TAB */}
        <TabsContent value="audit">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registros de Auditoría</CardTitle>
                  <CardDescription>Historial inmutable de acciones en el sistema</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Filtrar por evento..." 
                    className="pl-9 h-9"
                    value={searchAudit}
                    onChange={e => setSearchAudit(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Cargando auditoría...</p>
              ) : filteredAudit.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No se encontraron registros</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Usuario (Actor)</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Entidad Afectada</TableHead>
                      <TableHead>Dirección IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAudit.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {new Date(a.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{a.user?.name || 'Sistema'}</div>
                          <div className="text-xs text-muted-foreground">{a.user?.email || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                            {a.accion}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{a.entidad}</div>
                          <div className="text-xs text-muted-foreground truncate w-32" title={a.entidadId}>ID: {a.entidadId}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.ip || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
