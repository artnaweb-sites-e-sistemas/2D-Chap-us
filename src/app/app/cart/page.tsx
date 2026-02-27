'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { Trash2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/features/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { MaskedInput } from '@/components/ui/masked-input';
import { toast } from 'sonner';

export default function CartPage() {
    const { items, subtotal, removeItem, updateQuantity, clearCart } = useCartStore();
    const { user } = useAuth();
    const router = useRouter();

    const [freight, setFreight] = useState('');
    const [cep, setCep] = useState('');
    const [observations, setObservations] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (!user || items.length === 0) return;
        setLoading(true);

        const computedSubtotal = items.reduce((acc, item) => acc + (item.price * item.qtde), 0);
        const freightValue = parseFloat(freight.replace(',', '.')) || 0;

        try {
            // Simplified order structure, mapping directly to phase 2 spec
            const orderDoc = {
                userId: user.uid,
                clientId: user.clientId || null, // Will be filled properly in CRM phase
                clientName: user.name, // Temporary tracing until CRM link
                items: items.map(i => ({
                    productId: i.id,
                    name: i.name,
                    quantity: i.qtde,
                    unitPrice: i.price,
                    total: i.price * i.qtde
                })),
                subtotal: computedSubtotal,
                freight: freightValue,
                total: computedSubtotal + freightValue,
                status: 'novo',
                cep: cep.replace(/\D/g, ''),
                history: [{ status: 'novo', changedBy: user.name || user.email || 'Cliente', timestamp: new Date().toISOString() }],
                observations: observations,
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'orders'), orderDoc);

            clearCart();
            toast.success("Pedido gerado com sucesso!");
            router.push("/app");

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
                <Link href="/app" className="text-primary hover:underline text-sm">
                    &larr; Voltar para o catálogo
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
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                        <div className="flex flex-col items-center">
                                            <Input
                                                type="number"
                                                value={item.qtde}
                                                min={item.minQt}
                                                step={item.multiple}
                                                onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                                                className="w-20 text-center"
                                            />
                                            {/* Hint regarding multiple/min */}
                                            <span className="text-[10px] text-muted-foreground mt-1">Mult: {item.multiple}</span>
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

                    <div className="bg-card p-6 rounded-xl border border-border h-fit space-y-6">
                        <h3 className="font-semibold text-lg border-b pb-2">Resumo</h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal ({items.length} itens)</span>
                                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div className="py-2 space-y-4">
                                <div>
                                    <Label className="text-xs mb-1 block">CEP de Entrega</Label>
                                    <MaskedInput
                                        mask="99999-999"
                                        placeholder="00000-000"
                                        value={cep}
                                        onChange={e => setCep(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1 block">Valor Pré-Combinado do Frete (Opcional)</Label>
                                    <Input
                                        placeholder="R$ 0,00"
                                        value={freight}
                                        onChange={e => setFreight(e.target.value.replace(/[^0-9,.]/g, ''))}
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                                        Se não preenchido, o analista adicionará os custos do frete na etapa de separação.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4 flex justify-between font-bold text-lg text-foreground">
                            <span>Total Estimado</span>
                            <span>R$ {(items.reduce((acc, item) => acc + (item.price * item.qtde), 0) + (parseFloat(freight.replace(',', '.')) || 0)).toFixed(2).replace('.', ',')}</span>
                        </div>

                        <Button className="w-full h-12 text-lg font-bold" onClick={handleCheckout} disabled={loading || items.length === 0}>
                            {loading ? 'Processando...' : 'Fechar Pedido'}
                        </Button>
                    </div>

                </div>
            )}
        </div>
    );
}
