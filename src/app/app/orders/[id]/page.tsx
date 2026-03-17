'use client';

import { Suspense, use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/features/auth/AuthContext';
import { formatCurrency, getOrderSubtotal } from '@/lib/commerce';
import { buildOrderPdf, loadImageAsDataUrl } from '@/lib/orderPdf';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { OrderRecord } from '@/types/store';

export default function ClientOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Carregando pedido...</div>}>
            <ClientOrderDetailsContent paramsPromise={params} />
        </Suspense>
    );
}

function ClientOrderDetailsContent({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const { user } = useAuth();
    const [order, setOrder] = useState<OrderRecord | null>(null);
    const [orderShowProductImage, setOrderShowProductImage] = useState(true);
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const printableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchOrderAndSettings = async () => {
            try {
                const [orderSnap, settingsSnap] = await Promise.all([
                    getDoc(doc(db, 'orders', params.id)),
                    getDoc(doc(db, 'settings', 'global')),
                ]);
                if (settingsSnap.exists()) {
                    const settings = settingsSnap.data();
                    setOrderShowProductImage(settings.orderShowProductImage !== false);
                }
                if (!orderSnap.exists()) {
                    toast.error('Pedido não encontrado.');
                    return;
                }
                const data = orderSnap.data() as Omit<OrderRecord, 'id'>;
                if (data.userId !== user?.uid) {
                    toast.error('Você não tem permissão para acessar esse pedido.');
                    return;
                }
                setOrder({ id: orderSnap.id, ...data });
            } catch (error) {
                console.error(error);
                toast.error('Erro ao carregar pedido.');
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid) {
            fetchOrderAndSettings();
        }
    }, [params.id, user]);

    const handlePrint = () => {
        window.print();
    };

    const handleGeneratePdf = async () => {
        if (!order) return;
        setGeneratingPdf(true);
        try {
            let itemImageDataUrls: (string | null)[] | undefined;
            if (orderShowProductImage && (order.items?.length ?? 0) > 0) {
                itemImageDataUrls = await Promise.all(
                    (order.items ?? []).map((item) => loadImageAsDataUrl(item.imageUrl ?? ''))
                );
            }
            const pdf = buildOrderPdf(order, user?.name || 'Cliente', {
                showProductImage: orderShowProductImage,
                itemImageDataUrls,
            });
            pdf.save(`pedido-${params.id.slice(0, 8).toLowerCase()}.pdf`);
        } catch (error) {
            console.error(error);
            toast.error('Não foi possível gerar o PDF.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading) {
        return <div className="py-12 text-center text-muted-foreground">Carregando pedido...</div>;
    }

    if (!order) {
        return (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">Pedido não encontrado.</p>
            </div>
        );
    }

    const subtotal = order.subtotal || getOrderSubtotal(order.items || []);
    const total = subtotal + (order.freight || 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
                <div>
                    <Link
                        href="/app/orders"
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para meus pedidos
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Pedido #{order.id.slice(0, 8).toUpperCase()}
                    </h1>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint}>
                        Imprimir
                    </Button>
                    <Button onClick={handleGeneratePdf} disabled={generatingPdf}>
                        {generatingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
                    </Button>
                </div>
            </div>

            <div ref={printableRef} className="space-y-6 rounded-2xl border border-border bg-white p-6 print:border-0 print:shadow-none">
                <div className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">2D Chapéus</h2>
                        <p className="text-sm text-muted-foreground">Resumo completo do pedido do cliente</p>
                    </div>
                    <div className="text-sm text-muted-foreground md:text-right">
                        <p>Pedido #{order.id.slice(0, 8).toUpperCase()}</p>
                        <p>
                            Emissão:{' '}
                            {order.createdAt
                                ? new Date(order.createdAt.seconds * 1000).toLocaleString('pt-BR')
                                : 'N/A'}
                        </p>
                        <p>Status: {order.status}</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <h3 className="font-semibold text-foreground">Dados comerciais</h3>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            <p>Cliente: {order.clientName || user?.name || 'Cliente'}</p>
                            <p>Forma de pagamento: {order.paymentMethod || 'A definir'}</p>
                            <p>Transportadora: {order.carrier || 'A definir'}</p>
                            <p>Prazo atrelado: {order.deliveryLeadTime || 'A definir'}</p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/20 p-4">
                        <h3 className="font-semibold text-foreground">Endereço de entrega</h3>
                        {order.deliveryAddress ? (
                            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                                <p>{order.deliveryAddress.street || 'Logradouro não informado'} {order.deliveryAddress.number || ''}</p>
                                <p>{order.deliveryAddress.district || 'Bairro não informado'}</p>
                                <p>{order.deliveryAddress.city || 'Cidade não informada'} - {order.deliveryAddress.uf || '--'}</p>
                                <p>CEP: {order.deliveryAddress.cep || 'Não informado'}</p>
                                {order.deliveryAddress.complement && <p>Compl.: {order.deliveryAddress.complement}</p>}
                                {order.deliveryAddress.reference && <p>Ref.: {order.deliveryAddress.reference}</p>}
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-muted-foreground">Sem endereço de entrega vinculado.</p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold text-foreground">Itens do pedido</h3>
                    <div className="mt-4 space-y-3">
                        {(order.items || []).map((item, index: number) => (
                            <div key={index} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    {orderShowProductImage && item.imageUrl && (
                                        <div className="w-14 h-14 shrink-0 rounded-md overflow-hidden bg-muted border border-border">
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="space-y-1 min-w-0">
                                        <p className="font-medium text-foreground">{item.name}</p>
                                        {item.variationName && <p className="text-sm text-muted-foreground">Variação: {item.variationName}</p>}
                                        {item.sku && <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>}
                                        <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                                    </div>
                                </div>
                                <div className="text-right text-sm shrink-0">
                                    <p className="text-muted-foreground">Unitário: {formatCurrency(item.unitPrice || 0)}</p>
                                    <p className="font-semibold text-foreground">{formatCurrency(item.total || 0)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="rounded-xl border border-border p-4">
                        <h3 className="font-semibold text-foreground">Observações</h3>
                        <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                            {order.observations || 'Nenhuma observação enviada.'}
                        </p>
                    </div>

                    <div className="rounded-xl border border-border p-4 space-y-3">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Frete</span>
                            <span>{order.freight > 0 ? formatCurrency(order.freight) : 'A combinar'}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-3 text-lg font-bold text-foreground">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
