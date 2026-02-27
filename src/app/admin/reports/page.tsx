'use client';

import { useState, useEffect, useMemo } from 'react';
import { Select } from '@/components/ui/select';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface OrderData {
    clientName: string;
    total: number;
    createdAt: Date;
    status: string;
}

export default function ReportsPage() {
    const [period, setPeriod] = useState('30');
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const snap = await getDocs(collection(db, 'orders'));
                const fetched: OrderData[] = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'faturado' && data.createdAt) {
                        const fallbackSubtotal = (data.items || []).reduce((acc: number, item: any) => acc + (item.total || (item.unitPrice * item.quantity) || 0), 0);
                        const docSubtotal = data.subtotal || fallbackSubtotal;
                        const docFreight = data.freight || 0;
                        const docTotal = docSubtotal + docFreight;

                        fetched.push({
                            clientName: data.clientName || 'Cliente Desconhecido',
                            total: docTotal,
                            createdAt: data.createdAt.toDate(),
                            status: data.status,
                        });
                    }
                });
                setOrders(fetched);
            } catch (err) {
                console.error("Error fetching reports data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const { filteredOrders, topClients, totalRevenue, totalOrders } = useMemo(() => {
        const now = new Date();
        const days = parseInt(period);
        const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        const filtered = orders.filter(o => o.createdAt >= cutoff);

        let revenue = 0;
        const clientTotals: Record<string, number> = {};

        filtered.forEach(o => {
            revenue += o.total;
            clientTotals[o.clientName] = (clientTotals[o.clientName] || 0) + o.total;
        });

        const top = Object.entries(clientTotals)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return { filteredOrders: filtered, topClients: top, totalRevenue: revenue, totalOrders: filtered.length };
    }, [orders, period]);

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

    // Helper for rendering mock bars proportionately
    const renderBar = (height: number, color: string, key: number) => {
        // limit visual height to 100
        const h = Math.min(Math.max(height, 5), 100);
        return <div key={key} style={{ height: `${h}%` }} className={`w-8 rounded-t-sm flex-shrink-0 ${color} transition-all duration-500`} />;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Relatórios Básico</h2>
                    <p className="text-muted-foreground">Acompanhe a performance de vendas da operação B2B.</p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Período:</span>
                    <Select value={period} onChange={e => setPeriod(e.target.value)} className="w-40 bg-white">
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                        <option value="90">Últimos 90 dias</option>
                        <option value="365">Este Ano</option>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                <div className="bg-white p-6 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-6">Métricas do Período</h3>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando dados...</div>
                    ) : (
                        <div className="h-64 flex flex-col justify-center space-y-8">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Total Faturado</p>
                                <p className="text-4xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
                            </div>
                            <div className="flex justify-around">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Pedidos Faturados</p>
                                    <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Ticket Médio</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {totalOrders > 0 ? formatCurrency(totalRevenue / totalOrders) : 'R$ 0,00'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
                        <span>Semana 1</span>
                        <span>Atual</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-border">
                    <h3 className="font-semibold text-foreground mb-6">Top Clientes</h3>
                    <div className="space-y-4">
                        {loading ? (
                            <p className="text-center text-muted-foreground">Carregando...</p>
                        ) : topClients.length === 0 ? (
                            <p className="text-center text-muted-foreground">Nenhuma venda faturada neste período.</p>
                        ) : (
                            topClients.map((client, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm border-b pb-2">
                                    <span className="font-medium text-foreground">{idx + 1}. {client.name}</span>
                                    <span className="font-bold text-foreground">{formatCurrency(client.total)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
}
