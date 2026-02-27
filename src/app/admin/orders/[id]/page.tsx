'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Edit2, Check, X } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando formulário...</div>}>
            <OrderDetailsContent paramsPromise={params} />
        </Suspense>
    );
}

function OrderDetailsContent({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const { user } = useAuth();
    const [order, setOrder] = useState<any>(null);
    const [status, setStatus] = useState('novo');
    const [loading, setLoading] = useState(true);

    const [isEditingFreight, setIsEditingFreight] = useState(false);
    const [editFreightVal, setEditFreightVal] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const snap = await getDoc(doc(db, 'orders', params.id));
                if (snap.exists()) {
                    const data = snap.data();
                    setOrder(data);
                    setStatus(data.status || 'novo');
                    setEditFreightVal(data.freight ? data.freight.toString() : '');
                } else {
                    toast.error("Pedido não encontrado");
                }
            } catch (err) {
                console.error(err);
                toast.error("Erro ao puxar dados do pedido.");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [params.id]);

    const handleUpdateStatus = async () => {
        if (!order) return;
        try {
            const newHistory = [
                ...(order.history || []),
                { status, changedBy: user?.name || user?.email || 'Admin', timestamp: new Date().toISOString() }
            ];
            await updateDoc(doc(db, 'orders', params.id), {
                status,
                history: newHistory
            });
            setOrder({ ...order, status, history: newHistory });
            toast.success("Status atualizado com sucesso!");
        } catch (err) {
            console.error(err);
            toast.error("Erro ao atualizar status.");
        }
    };

    const handleSaveFreight = async () => {
        if (!order) return;
        const newFreight = parseFloat(editFreightVal.replace(',', '.')) || 0;
        const subtotal = order.subtotal || (order.items || []).reduce((acc: number, item: any) => acc + (item.total || (item.unitPrice * item.quantity) || 0), 0);
        const newTotal = subtotal + newFreight;

        try {
            const newHistory = [
                ...(order.history || []),
                { status: `Frete alterado para R$ ${newFreight.toFixed(2).replace('.', ',')}`, changedBy: user?.name || user?.email || 'Admin', timestamp: new Date().toISOString() }
            ];
            await updateDoc(doc(db, 'orders', params.id), {
                freight: newFreight,
                total: newTotal,
                history: newHistory
            });
            setOrder({ ...order, freight: newFreight, total: newTotal, history: newHistory });
            setIsEditingFreight(false);
            toast.success("Frete atualizado com sucesso!");
        } catch (err) {
            console.error(err);
            toast.error("Erro ao atualizar frete.");
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando dados do pedido...</div>;
    if (!order) return null;

    const formatCurrency = (val: number) => `R$ ${(val || 0).toFixed(2).replace('.', ',')}`;

    const computedSubtotal = order.subtotal || (order.items || []).reduce((acc: number, item: any) => acc + (item.total || (item.unitPrice * item.quantity) || 0), 0);
    const computedTotal = computedSubtotal + (order.freight || 0);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Pedido #{params.id.slice(0, 8).toUpperCase()}</h2>
                    <p className="text-muted-foreground">
                        {order.clientName} | {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Data Indisponível'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Select value={status} onChange={e => setStatus(e.target.value)} className="w-48 bg-muted/50">
                        <option value="novo">Novo</option>
                        <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="em_separacao">Em Separação</option>
                        <option value="faturado">Faturado</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                    </Select>
                    <Button onClick={handleUpdateStatus}>Atualizar Status</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-border">
                        <h3 className="font-semibold border-b pb-4 mb-4">Itens do Pedido</h3>
                        <div className="space-y-4">
                            {(order.items || []).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center bg-muted/50 p-3 rounded border border-border">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">Qtd: {item.quantity} | {formatCurrency(item.unitPrice)} un.</p>
                                    </div>
                                    <div className="font-bold">
                                        {formatCurrency(item.total || (item.unitPrice * item.quantity))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-4 border-t border-border space-y-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatCurrency(computedSubtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Frete</span>
                                <span>{order.freight > 0 ? formatCurrency(order.freight) : 'A combinar'}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                                <span>Total Pedido</span>
                                <span>{formatCurrency(computedTotal)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-border">
                        <h3 className="font-semibold border-b pb-4 mb-4">Observações e Transporte</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="block text-muted-foreground">CEP Destino</span>
                                <strong className="block mt-1">{order.cep || 'Não informado'}</strong>
                            </div>
                            <div>
                                <span className="block text-muted-foreground">Frete Informado</span>
                                <div className="mt-1 flex items-center gap-2">
                                    {isEditingFreight ? (
                                        <>
                                            <Input
                                                value={editFreightVal}
                                                onChange={e => setEditFreightVal(e.target.value.replace(/[^0-9,.]/g, ''))}
                                                className="w-24 h-8 text-sm"
                                                placeholder="0,00"
                                            />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50" onClick={handleSaveFreight}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { setIsEditingFreight(false); setEditFreightVal(order.freight ? order.freight.toString() : ''); }}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <strong className="block">{order.freight > 0 ? formatCurrency(order.freight) : 'A combinar'}</strong>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setIsEditingFreight(true)}>
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2 mt-4">
                                <span className="block text-muted-foreground">Anotações do Cliente</span>
                                {order.observations ? (
                                    <p className="mt-1 p-3 bg-yellow-50 text-yellow-800 rounded border border-yellow-200">
                                        "{order.observations}"
                                    </p>
                                ) : (
                                    <p className="mt-1 text-muted-foreground italic">Nenhuma observação.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-border">
                        <h3 className="font-semibold border-b pb-4 mb-4">Histórico (Log)</h3>
                        <div className="relative pl-4 border-l-2 border-border space-y-6">

                            {order.history && order.history.map((hist: any, index: number) => (
                                <div key={index} className="relative">
                                    <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-white" />
                                    <p className="text-sm font-medium capitalize">Status: {hist.status.replace('_', ' ')}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Por: {hist.changedBy} - {new Date(hist.timestamp).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            )).reverse()}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
