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
    getVariantSaleMultiple,
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
                    (group) => (variant.optionValues[group.id] ?? '') === (selectedValues[group.id] ?? '')
                )
            ) ?? (selectedVariantId ? activeVariants.find((v) => v.id === selectedVariantId) : undefined) ?? activeVariants[0];
        }

        if (activeVariants.length > 0) {
            return activeVariants.find((variant) => variant.id === selectedVariantId) || activeVariants[0];
        }

        return undefined;
    }, [activeVariants, product.variationGroups, selectedValues, selectedVariantId]);

    const multiple = getVariantSaleMultiple(product, selectedVariant);

    const snapToValidQty = (value: number) => {
        const min = getVariantMinQty(product, selectedVariant);
        if (multiple <= 1) return Math.max(min, Math.round(value) || min);
        const smallest = Math.ceil(min / multiple) * multiple;
        const candidate = Math.round(value / multiple) * multiple;
        return Math.max(smallest, candidate || smallest);
    };

    useEffect(() => {
        setQtde(snapToValidQty(getVariantMinQty(product, selectedVariant)));
    }, [product, selectedVariant]);

    useEffect(() => {
        onVariantChange?.(selectedVariant);
    }, [onVariantChange, selectedVariant]);

    const minQty = getVariantMinQty(product, selectedVariant);
    const price = getVariantPrice(product, selectedVariant);
    const minValidQty = multiple <= 1 ? minQty : Math.ceil(minQty / multiple) * multiple;

    const handleAdd = () => {
        if (product.variationGroups.length > 0 && !selectedVariant) {
            toast.error('Selecione uma combinação válida antes de adicionar.');
            return;
        }

        if (qtde < minQty) {
            toast.error(`Quantidade mínima é ${minQty}.`);
            return;
        }

        if (multiple > 1 && qtde % multiple !== 0) {
            toast.error(`A quantidade deve ser múltipla de ${multiple} (ex.: ${multiple}, ${multiple * 2}, ${multiple * 3}...).`);
            setQtde(snapToValidQty(qtde));
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
                    <Label className="text-foreground font-medium">Cor</Label>
                    <div className="flex flex-wrap gap-2">
                        {activeVariants.map((variant) => {
                            const isActive = selectedVariant?.id === variant.id;
                            const label = getVariantColorLabel(variant);
                            return (
                                <button
                                    key={variant.id}
                                    type="button"
                                    aria-pressed={isActive}
                                    aria-label={label ? `Cor ${label}` : 'Selecionar cor'}
                                    className={`group flex flex-col items-center gap-1 rounded-lg border p-1.5 min-w-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                        isActive
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
                                    }`}
                                    onClick={() => {
                                        setSelectedVariantId(variant.id);
                                        setSelectedValues(variant.optionValues || {});
                                    }}
                                    title={label || undefined}
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full border shrink-0 ${
                                            isActive ? 'border-primary ring-2 ring-primary/25' : 'border-black/10'
                                        }`}
                                        style={{ backgroundColor: variant.colorHex || '#D4D4D8' }}
                                    />
                                    {!compact && (
                                        <span
                                            className={`text-[11px] font-medium truncate max-w-[3.5rem] text-center block ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                                            title={label || undefined}
                                        >
                                            {label || '—'}
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
                        {multiple > 1 && <p>Múltiplo: {multiple}</p>}
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
                    min={minValidQty}
                    step={multiple}
                    value={qtde}
                    onChange={(event) => setQtde(snapToValidQty(Number(event.target.value) || 0))}
                    className={compact ? 'w-24' : 'w-28'}
                />
                <Button onClick={handleAdd} className="flex-1">
                    Adicionar ao carrinho
                </Button>
            </div>
        </div>
    );
}
