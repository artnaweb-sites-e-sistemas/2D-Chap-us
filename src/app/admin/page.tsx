'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [pendingOrders, setPendingOrders] = useState<number | string>('...');
    const [pendingUsers, setPendingUsers] = useState<number | string>('...');
    const [faturadoCount, setFaturadoCount] = useState<number | string>('...');
    const [ticketMedio, setTicketMedio] = useState<string>('...');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Pending users
                const usersQ = query(collection(db, 'users'), where('status', '==', 'aguardando_aprovacao'));
                const usersSnap = await getDocs(usersQ);
                setPendingUsers(usersSnap.size);

                // Orders aggregation
                const ordersSnap = await getDocs(collection(db, 'orders'));
                let pOrders = 0;
                let fatOrders = 0;
                let totalFaturado = 0;

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                ordersSnap.forEach(doc => {
                    const data = doc.data();
                    if (['novo', 'aguardando_aprovacao', 'aprovado', 'em_separacao'].includes(data.status)) {
                        pOrders++;
                    }
                    if (['faturado', 'enviado', 'entregue'].includes(data.status) && data.createdAt) {
                        const date = data.createdAt.toDate();
                        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                            fatOrders++;
                            const fallbackSubtotal = (data.items || []).reduce((acc: number, item: any) => acc + (item.total || (item.unitPrice * item.quantity) || 0), 0);
                            const docSubtotal = data.subtotal || fallbackSubtotal;
                            const docFreight = data.freight || 0;
                            totalFaturado += (docSubtotal + docFreight);
                        }
                    }
                });

                setPendingOrders(pOrders);
                setFaturadoCount(fatOrders);
                setTicketMedio(
                    fatOrders > 0
                        ? `R$ ${(totalFaturado / fatOrders).toFixed(2).replace('.', ',')}`
                        : 'R$ 0,00'
                );

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setPendingOrders('-');
                setPendingUsers('-');
                setFaturadoCount('-');
                setTicketMedio('-');
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Bem-vindo(a), {user?.name}. Aqui está o resumo da operação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPI title="Pedidos Pendentes" value={String(pendingOrders)} href="/admin/orders?filter=pending" color="blue" />
                <KPI title="Solicitações de Cadastro" value={String(pendingUsers)} href="/admin/clients" color="amber" />
                <KPI title="Ticket Médio (Mês)" value={ticketMedio} href="/admin/reports" color="green" />
                <KPI title="Pedidos Faturados (Mês)" value={String(faturadoCount)} href="/admin/orders?filter=faturado" color="indigo" />
            </div>

            <div className="mt-8 bg-white p-6 rounded-xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4">Avisos Recentes</h3>
                <p className="text-sm text-foreground">Nenhum aviso no momento.</p>
            </div>
        </div>
    );
}

function KPI({ title, value, href, color }: { title: string, value: string, href: string, color: string }) {
    // Simplistic color mapping for MVP
    const colorMap: Record<string, string> = {
        blue: 'bg-primary/10 text-primary',
        amber: 'bg-amber-50 text-amber-700',
        green: 'bg-green-50 text-green-700',
        indigo: 'bg-indigo-50 text-indigo-700',
    };

    return (
        <Link href={href} className="block group">
            <div className="bg-white p-6 rounded-xl border border-border shadow-sm transition-shadow hover:shadow-md">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${colorMap[color]}`}>
                    {value}
                </div>
            </div>
        </Link>
    );
}
