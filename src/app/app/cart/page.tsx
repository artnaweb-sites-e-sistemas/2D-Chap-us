'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/features/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientProfile, SettingOption } from '@/types/store';
import { formatCurrency, normalizeSettingOptions } from '@/lib/commerce';

export default function CartPage() {
    const { items, removeItem, updateQuantity, clearCart } = useCartStore();
    const { user } = useAuth();
    const router = useRouter();

    const [observations, setObservations] = useState('');
    const [loading, setLoading] = useState(false);
    const [clientProfile, setClientProfile] = useState<Partial<ClientProfile> | null>(null);
    const [globalMinimumOrder, setGlobalMinimumOrder] = useState(0);
    const [carriers, setCarriers] = useState<SettingOption[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<SettingOption[]>([]);

    useEffect(() => {
        const loadClientCommercialData = async () => {
            if (!user?.uid) return;

            try {
                const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
                if (settingsSnap.exists()) {
                    const data = settingsSnap.data();
                    setGlobalMinimumOrder(Number(data.minimumOrderValue || 0));
                    setCarriers(normalizeSettingOptions(data.carriers || []));
                    setPaymentMethods(normalizeSettingOptions(data.paymentMethods || []));
                }

                if (user.clientId) {
                    const clientSnap = await getDoc(doc(db, 'clients', user.clientId));
                    if (clientSnap.exists()) {
                        setClientProfile(clientSnap.data() as Partial<ClientProfile>);
                    }
                }
            } catch (error) {
                console.error('Error loading commercial data:', error);
            }
        };

        loadClientCommercialData();
    }, [user]);

    const itemCount = useMemo(
        () => items.reduce((acc, item) => acc + item.qtde, 0),
        [items]
    );

    const subtotal = useMemo(
        () => items.reduce((acc, item) => acc + item.price * item.qtde, 0),
        [items]
    );

    const clientCarrierLabel = useMemo(() => {
        if (!clientProfile?.carrier) return '';
        const found = carriers.find((c) => c.id === clientProfile.carrier);
        return found?.label || '';
    }, [carriers, clientProfile?.carrier]);

    const clientPaymentMethodLabel = useMemo(() => {
        if (!clientProfile?.paymentMethod) return '';
        const found = paymentMethods.find((m) => m.id === clientProfile.paymentMethod);
        return found?.label || '';
    }, [paymentMethods, clientProfile?.paymentMethod]);

    const minimumOrderValue = Number(clientProfile?.minimumOrderValue || globalMinimumOrder || 0);
    const missingAmount = Math.max(minimumOrderValue - subtotal, 0);
    const canCheckout = items.length > 0 && missingAmount <= 0;

    const handleCheckout = async () => {
        if (!user || items.length === 0) return;
        if (missingAmount > 0) {
            toast.error(`Faltam ${formatCurrency(missingAmount)} para atingir o pedido mínimo.`);
            return;
        }
        setLoading(true);

        try {
            const orderDoc = {
                userId: user.uid,
                clientId: user.clientId || null,
                clientName: clientProfile?.razaoSocial || user.name,
                items: items.map(i => ({
                    productId: i.productId || i.id,
                    name: i.name,
                    quantity: i.qtde,
                    unitPrice: i.price,
                    total: i.price * i.qtde,
                    variationId: i.variationId || null,
                    variationName: i.variationName || '',
                    sku: i.sku || '',
                    imageUrl: i.imageUrl || '',
                })),
                subtotal,
                freight: 0,
                total: subtotal,
                status: 'novo',
                paymentMethod: clientPaymentMethodLabel || '',
                carrier: clientCarrierLabel || '',
                deliveryLeadTime: '',
                minimumOrderValue,
                deliveryAddress: clientProfile?.deliveryAddress || null,
                history: [{ status: 'novo', changedBy: user.name || user.email || 'Cliente', timestamp: new Date().toISOString() }],
                observations: observations,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'orders'), orderDoc);

            clearCart();
            toast.success("Pedido gerado com sucesso!");
            router.push("/app/orders");

        } catch (e) {
            console.error(e);
            toast.error("Ocorreu um erro ao processar seu pedido.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Meu Carrinho</h2>
                <Link
                    href="/app"
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o catálogo
                </Link>
            </div>

            {items.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground bg-card rounded-xl border border-border">
                    Seu carrinho está vazio.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    <div className="md:col-span-2 space-y-4">
                        <div className="bg-card rounded-xl border border-border divide-y divide-border">
                            {items.map(item => (
                                <div key={item.id} className="p-4 flex flex-col sm:flex-row items-center gap-4">
                                    <div className="w-16 h-16 bg-muted rounded-md flex-shrink-0 overflow-hidden flex items-center justify-center">
                                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-[10px] text-muted-foreground">Sem photo</span>}
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                        <h4 className="font-semibold text-foreground line-clamp-1">{item.name}</h4>
                                        <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2).replace('.', ',')} / un</p>
                                        {item.variationName && (
                                            <p className="text-xs text-muted-foreground mt-1">Variação: {item.variationName}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                        <div className="flex flex-col items-center">
                                            <Input
                                                type="number"
                                                value={item.qtde}
                                                min={item.multiple > 1 ? Math.ceil(item.minQt / (item.multiple || 1)) * (item.multiple || 1) : item.minQt}
                                                step={item.multiple || 1}
                                                onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                                                className="w-20 text-center"
                                            />
                                        </div>
                                        <div className="w-24 text-right font-bold text-foreground">
                                            R$ {(item.price * item.qtde).toFixed(2).replace('.', ',')}
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => removeItem(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-card p-6 rounded-xl border border-border space-y-4">
                            <h3 className="font-semibold">Informações Adicionais</h3>
                            <div className="space-y-2">
                                <Label>Observações para o pedido</Label>
                                <Textarea
                                    placeholder="Tem alguma observação específica?"
                                    value={observations}
                                    onChange={e => setObservations(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-card p-4 rounded-xl border border-border h-fit space-y-3">
                        <h3 className="font-semibold text-base border-b border-border pb-1.5">Resumo</h3>

                        <div className="text-sm text-muted-foreground divide-y divide-border">
                            <div className="py-2 first:pt-0">
                                <div className="flex justify-between items-baseline gap-2">
                                    <span>Subtotal ({itemCount} itens)</span>
                                    <span className="tabular-nums font-medium text-foreground">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                            <div className="py-2">
                                <p className="text-muted-foreground">Transportadora padrão</p>
                                <p className="mt-0.5 font-medium text-foreground break-words">{clientCarrierLabel || 'Definir depois'}</p>
                            </div>
                            <div className="py-2">
                                <p className="text-muted-foreground">Forma de pagamento</p>
                                <p className="mt-0.5 font-medium text-foreground break-words">{clientPaymentMethodLabel || 'Definir depois'}</p>
                            </div>
                        </div>

                        {minimumOrderValue > 0 && (
                            <div className={`rounded-md border px-2.5 py-1.5 text-sm ${missingAmount > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                                <span className="font-medium">Mín. {formatCurrency(minimumOrderValue)}</span>
                                {' · '}
                                {missingAmount > 0
                                    ? `Faltam ${formatCurrency(missingAmount)}`
                                    : 'Mínimo atingido. Pode finalizar.'}
                            </div>
                        )}

                        <div className="border-t border-border pt-3 flex justify-between items-baseline gap-2 font-bold text-base text-foreground">
                            <span className="shrink-0">Total do Pedido</span>
                            <span className="whitespace-nowrap tabular-nums">{formatCurrency(subtotal)}</span>
                        </div>

                        <Button className="w-full h-12 text-lg font-bold" onClick={handleCheckout} disabled={loading || !canCheckout}>
                            {loading ? 'Processando...' : 'Fechar Pedido'}
                        </Button>
                    </div>

                </div>
            )}
        </div>
    );
}
