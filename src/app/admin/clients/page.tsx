'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';

interface ClientData {
    id: string;
    razaoSocial: string;
    cnpj: string;
    status: string;
}

interface PendingUser {
    id: string; // uid
    name: string;
    email: string;
    cnpj: string;
    createdAt: string;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<ClientData[]>([]);
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Clients
                const clientSnap = await getDocs(collection(db, 'clients'));
                const cData: ClientData[] = [];
                clientSnap.forEach(doc => cData.push({ id: doc.id, ...doc.data() } as ClientData));
                setClients(cData);

                // Fetch Pending Users
                const userQ = query(collection(db, 'users'), where('status', '==', 'aguardando_aprovacao'));
                const userSnap = await getDocs(userQ);
                const uData: PendingUser[] = [];
                userSnap.forEach(doc => uData.push({ id: doc.id, ...doc.data() } as PendingUser));
                setPendingUsers(uData);

            } catch (error) {
                console.error("Error fetching admin data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o cliente "${name}"?`)) return;

        try {
            await deleteDoc(doc(db, 'clients', id));
            toast.success(`Cliente "${name}" excluído com sucesso.`);
            setClients(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir cliente.");
        }
    };

    return (
        <div className="space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gestão de Clientes</h2>
                    <p className="text-muted-foreground">Administre o cadastro de clientes B2B e pendências de acesso.</p>
                </div>
                <Link href="/admin/clients/new">
                    <Button>Novo Cliente</Button>
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Carregando dados...</div>
            ) : (
                <>
                    {/* Pending Approvals */}
                    {pendingUsers.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-destructive flex items-center">
                                Aguardando Aprovação
                                <span className="ml-2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">{pendingUsers.length}</span>
                            </h3>
                            <div className="bg-card rounded-md border border-destructive/20 overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-destructive/5 text-destructive font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">Nome / Usuário</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">CNPJ Informado</th>
                                            <th className="px-4 py-3 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {pendingUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{user.cnpj}</td>
                                                <td className="px-4 py-3 text-right">
                                                    {/* Pass pending info to create new client quickly */}
                                                    <Link href={`/admin/clients/new?uid=${user.id}&cnpj=${user.cnpj}&email=${encodeURIComponent(user.email)}`}>
                                                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">Analisar & Aprovar</Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Active Clients */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">Clientes Cadastrados</h3>
                        <div className="bg-card rounded-md border border-border overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Razão Social</th>
                                        <th className="px-4 py-3 font-medium">CNPJ</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {clients.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
                                    ) : clients.map(client => (
                                        <tr key={client.id} className="hover:bg-muted/50">
                                            <td className="px-4 py-3 font-medium text-foreground">{client.razaoSocial}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{client.cnpj}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${client.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-muted text-foreground'
                                                    }`}>
                                                    {client.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <Link href={`/admin/clients/${client.id}`}>
                                                    <Button variant="ghost" size="sm">Editar</Button>
                                                </Link>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(client.id, client.razaoSocial)}>Excluir</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
