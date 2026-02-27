'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';

export default function ClientOrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyOrders = async () => {
            if (!user?.uid) return;
            try {
                // Fetching orders where userId matches the currently logged in client
                const q = query(
                    collection(db, 'orders'),
                    where('userId', '==', user.uid),
                );

                const snap = await getDocs(q);
                let fetchedOrders: any[] = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    const fallbackSubtotal = (data.items || []).reduce((acc: number, item: any) => acc + (item.total || (item.unitPrice * item.quantity) || 0), 0);
                    const docSubtotal = data.subtotal || fallbackSubtotal;
                    const docFreight = data.freight || 0;
                    const docTotal = docSubtotal + docFreight;

                    fetchedOrders.push({
                        id: doc.id,
                        ...data,
                        subtotal: docSubtotal,
                        freight: docFreight,
                        total: docTotal
                    });
                });

                // Client-side sorting because Firestore requires composite index for where+orderBy
                fetchedOrders.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

                setOrders(fetchedOrders);
            } catch (err) {
                console.error("Error fetching client orders:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyOrders();
    }, [user]);

    const statusMap: Record<string, string> = {
        'novo': 'Em Análise',
        'aguardando_aprovacao': 'Aguardando',
        'aprovado': 'Aprovado',
        'em_separacao': 'Em Separação',
        'faturado': 'Faturado',
        'enviado': 'Enviado',
        'entregue': 'Entregue',
        'cancelado': 'Cancelado',
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Meus Pedidos</h2>
                    <p className="text-muted-foreground">Acompanhe o status e histórico de suas compras.</p>
                </div>
                <Link href="/app" className="text-primary text-sm hover:underline">
                    &larr; Voltar para loja
                </Link>
            </div>

            {loading ? (
                <div className="p-12 text-center text-muted-foreground">Buscando seus pedidos...</div>
            ) : orders.length === 0 ? (
                <div className="bg-white p-12 text-center text-muted-foreground rounded-xl border border-border">
                    <p>Você ainda não realizou nenhum pedido conosco.</p>
                    <Link href="/app" className="mt-4 inline-block text-primary font-medium hover:underline">
                        Ir para o catálogo
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-xl border border-border flex flex-col md:flex-row justify-between gap-4 md:items-center">
                            <div>
                                <h3 className="font-bold text-lg">Pedido #{order.id.slice(0, 8).toUpperCase()}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Realizado em: {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A'}
                                </p>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Status Atual</p>
                                    <span className="inline-flex mt-1 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                        {statusMap[order.status] || order.status}
                                    </span>
                                </div>
                                <div className="text-right border-l pl-6 border-slate-200">
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-muted-foreground mb-1 justify-end">
                                        <span>Subtotal: R$ {(order.subtotal || 0).toFixed(2).replace('.', ',')}</span>
                                        <span>Frete: {order.freight > 0 ? `R$ ${order.freight.toFixed(2).replace('.', ',')}` : 'Combinar'}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Valor Total</p>
                                    <p className="font-bold text-lg">R$ {(order.total || 0).toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
