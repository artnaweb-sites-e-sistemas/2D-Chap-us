'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/types/auth';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // In a real app, you might want to paginate or fetch all and filter in UI
            const q = query(collection(db, 'users'));
            const querySnapshot = await getDocs(q);
            const fetched: UserProfile[] = [];
            querySnapshot.forEach((doc) => {
                fetched.push({ uid: doc.id, ...doc.data() } as UserProfile);
            });
            setUsers(fetched);
        } catch (e) {
            console.error('Error fetching users', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleApprove = async (uid: string) => {
        try {
            await updateDoc(doc(db, 'users', uid), {
                status: 'ativo'
            });
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: 'ativo' } : u));
        } catch (e) {
            console.error('Erro ao aprovar usuário', e);
            alert('Erro ao aprovar usuário. Verifique permissões.');
        }
    };

    const pendingUsers = users.filter(u => u.status === 'aguardando_aprovacao');
    const activeUsers = users.filter(u => u.status !== 'aguardando_aprovacao');

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h2>
            </div>

            {/* Tabela de Aprovações Pendentes */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-amber-600">Aguardando Aprovação ({pendingUsers.length})</h3>
                {pendingUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
                ) : (
                    <div className="bg-white rounded-md border border-border overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Nome / Empresa</th>
                                    <th className="px-4 py-3 font-medium">E-mail</th>
                                    <th className="px-4 py-3 font-medium">CNPJ</th>
                                    <th className="px-4 py-3 font-medium">Cadastrado em</th>
                                    <th className="px-4 py-3 font-medium text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {pendingUsers.map(user => (
                                    <tr key={user.uid} className="hover:bg-muted/50">
                                        <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.cnpj || '-'}</td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button size="sm" onClick={() => handleApprove(user.uid)}>
                                                Aprovar Cliente
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Lista de Usuários Ativos */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Usuários do Sistema</h3>
                <div className="bg-white rounded-md border border-border overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Nome</th>
                                <th className="px-4 py-3 font-medium">E-mail</th>
                                <th className="px-4 py-3 font-medium">Papel (Role)</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {activeUsers.map(user => (
                                <tr key={user.uid} className="hover:bg-muted/50">
                                    <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-primary">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {activeUsers.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
