'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCartStore } from '@/store/useCartStore';
import { ProductRecord, ProductVariant } from '@/types/store';
import {
    buildCartItem,
    formatCurrency,
    getActiveVariants,
    getDefaultVariant,
    getVariantColorLabel,
    getVariantMinQty,
    getVariantPrice,
} from '@/lib/commerce';

interface ProductPurchaseControlsProps {
    product: ProductRecord;
    compact?: boolean;
    onVariantChange?: (variant?: ProductVariant) => void;
    /** Chamado após adicionar ao carrinho (ex.: redirecionar para checkout) */
    onAfterAdd?: () => void;
}

export function ProductPurchaseControls({
    product,
    compact = false,
    onVariantChange,
    onAfterAdd,
}: ProductPurchaseControlsProps) {
    const addItem = useCartStore((state) => state.addItem);
    const activeVariants = useMemo(() => getActiveVariants(product), [product]);
    const defaultVariant = useMemo(() => getDefaultVariant(product), [product]);

    const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
        defaultVariant?.optionValues || {}
    );
    const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id || '');
    const [qtde, setQtde] = useState(getVariantMinQty(product, defaultVariant));

    useEffect(() => {
        setSelectedValues(defaultVariant?.optionValues || {});
        setSelectedVariantId(defaultVariant?.id || '');
        setQtde(getVariantMinQty(product, defaultVariant));
    }, [defaultVariant, product]);

    const selectedVariant = useMemo<ProductVariant | undefined>(() => {
        if (product.variationGroups.length > 0) {
            return activeVariants.find((variant) =>
                product.variationGroups.every(
                    (group) => variant.optionValues[group.id] === selectedValues[group.id]
                )
            );
        }

        if (activeVariants.length > 0) {
            return activeVariants.find((variant) => variant.id === selectedVariantId) || activeVariants[0];
        }

        return undefined;
    }, [activeVariants, product.variationGroups, selectedValues, selectedVariantId]);

    useEffect(() => {
        setQtde(getVariantMinQty(product, selectedVariant));
    }, [product, selectedVariant]);

    useEffect(() => {
        onVariantChange?.(selectedVariant);
    }, [onVariantChange, selectedVariant]);

    const minQty = getVariantMinQty(product, selectedVariant);
    const price = getVariantPrice(product, selectedVariant);

    const handleAdd = () => {
        if (product.variationGroups.length > 0 && !selectedVariant) {
            toast.error('Selecione uma combinação válida antes de adicionar.');
            return;
        }

        if (qtde < minQty) {
            toast.error(`Quantidade mínima é ${minQty}.`);
            return;
        }

        addItem(buildCartItem(product, qtde, selectedVariant));
        toast.success(`${product.name} adicionado ao carrinho.`);
        onAfterAdd?.();
    };

    return (
        <div className={compact ? 'space-y-3' : 'space-y-4'}>
            {activeVariants.length > 0 && product.variationGroups.some((group) => group.id === 'color' || group.name.toLowerCase() === 'cor') && (
                <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex flex-wrap gap-2">
                        {activeVariants.map((variant) => {
                            const isActive = selectedVariant?.id === variant.id;
                            return (
                                <button
                                    key={variant.id}
                                    type="button"
                                    className={`group flex items-center gap-2 rounded-full border px-2.5 py-1.5 transition ${
                                        isActive ? 'border-primary bg-primary/5' : 'border-border bg-white hover:border-primary/40'
                                    }`}
                                    onClick={() => {
                                        setSelectedVariantId(variant.id);
                                        setSelectedValues(variant.optionValues || {});
                                    }}
                                    title={getVariantColorLabel(variant)}
                                >
                                    <span
                                        className="h-5 w-5 rounded-full border border-black/10"
                                        style={{ backgroundColor: variant.colorHex || '#D4D4D8' }}
                                    />
                                    {!compact && (
                                        <span className="text-sm text-foreground">
                                            {getVariantColorLabel(variant)}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {product.variationGroups.length === 0 && activeVariants.length > 0 && (
                <div className="space-y-2">
                    <Label>Variação</Label>
                    <Select
                        value={selectedVariantId}
                        onChange={(event) => setSelectedVariantId(event.target.value)}
                    >
                        {activeVariants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                                {variant.name}
                            </option>
                        ))}
                    </Select>
                </div>
            )}

            <div className={`rounded-lg border border-border bg-muted/20 p-3 ${compact ? '' : 'p-4'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className={`${compact ? 'text-sm' : 'text-base'} text-muted-foreground`}>Preço unitário</p>
                        <p className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-foreground`}>
                            {formatCurrency(price)}
                        </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                        <p>Venda mínima: {minQty}</p>
                        {selectedVariant?.sku && <p>SKU: {selectedVariant.sku}</p>}
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-primary`}>
                        {formatCurrency(price * qtde)}
                    </p>
                </div>
            </div>

            <div className={`flex gap-2 ${compact ? '' : 'max-w-sm'}`}>
                <Input
                    type="number"
                    min={minQty}
                    step={1}
                    value={qtde}
                    onChange={(event) => setQtde(Number(event.target.value))}
                    className={compact ? 'w-24' : 'w-28'}
                />
                <Button onClick={handleAdd} className="flex-1">
                    Adicionar ao carrinho
                </Button>
            </div>
        </div>
    );
}
