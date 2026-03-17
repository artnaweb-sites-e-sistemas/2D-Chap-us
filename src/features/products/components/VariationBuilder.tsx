'use client';

import { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ProductVariationGroup, ProductVariant } from '@/types/store';
import { Plus, Trash2, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VariationBuilderProps {
    variationGroups: ProductVariationGroup[];
    setVariationGroups: React.Dispatch<React.SetStateAction<ProductVariationGroup[]>>;
    variants: ProductVariant[];
    setVariants: React.Dispatch<React.SetStateAction<ProductVariant[]>>;
    basePrice: number;
    minQty: number;
    saleMultiple: number;
    /** Novas fotos ainda não enviadas, por variante (múltiplas por cor) */
    variantImageFiles: Record<string, File[]>;
    setVariantImageFiles: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
    /** Se true, cor não é obrigatória */
    colorOptional?: boolean;
}

export function VariationBuilder({
    setVariationGroups,
    variants,
    setVariants,
    basePrice,
    minQty,
    saleMultiple,
    variantImageFiles,
    setVariantImageFiles,
    colorOptional = false,
}: VariationBuilderProps) {
    const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

    const totalColors = useMemo(() => variants.length, [variants.length]);

    const syncColorGroup = (nextVariants: ProductVariant[]) => {
        const colorValues = nextVariants
            .map((variant) => variant.optionValues.color || variant.name)
            .filter(Boolean);

        const nextGroups: ProductVariationGroup[] = colorValues.length > 0
            ? [{ id: 'color', name: 'Cor', values: colorValues }]
            : [];

        setVariationGroups(nextGroups);
    };

    const addColor = () => {
        const newVariant: ProductVariant = {
            id: `color-${Date.now()}`,
            name: '',
            sku: `SKU-${Date.now().toString().slice(-6)}`,
            optionValues: { color: '' },
            colorHex: '#D4D4D8',
            price: basePrice,
            minQty,
            saleMultiple,
            imageUrls: [],
            active: true,
        };

        const nextVariants = [...variants, newVariant];
        setVariants(nextVariants);
        syncColorGroup(nextVariants);
    };

    const removeColor = (variantId: string) => {
        const nextVariants = variants.filter((variant) => variant.id !== variantId);
        setVariants(nextVariants);
        setVariantImageFiles((current) => {
            const copy = { ...current };
            delete copy[variantId];
            return copy;
        });
        syncColorGroup(nextVariants);
    };

    const updateVariant = (variantId: string, patch: Partial<ProductVariant>) => {
        setVariants((current) => {
            const nextVariants = current.map((variant) => {
                if (variant.id !== variantId) return variant;

                const nextColorName = patch.optionValues?.color ?? variant.optionValues.color ?? variant.name;

                return {
                    ...variant,
                    ...patch,
                    name: patch.name ?? nextColorName,
                    optionValues: {
                        ...variant.optionValues,
                        ...patch.optionValues,
                        color: nextColorName,
                    },
                };
            });

            syncColorGroup(nextVariants);
            return nextVariants;
        });
    };

    return (
        <div className="space-y-6">
            {/* Header: Adicionar cor */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h4 className="font-semibold text-foreground">Cores do produto</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Cadastre cada cor com bolinha, SKU, preço e galeria que o cliente verá ao selecionar.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                            {totalColors} cor(es)
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addColor}
                            className="gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                        >
                            <Plus className="h-4 w-4" />
                            Adicionar cor
                        </Button>
                    </div>
                </div>
            </div>

            {/* Lista de cores cadastradas */}
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-foreground">Cores cadastradas</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Obrigatório pelo menos uma cor com uma foto. O cliente verá a galeria da cor selecionada.
                    </p>
                </div>

                {variants.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
                        <p className="text-sm text-muted-foreground">
                            {colorOptional
                                ? "Adicione cores opcionalmente para ativar a seleção por bolinhas na vitrine, ou salve sem cores."
                                : "Adicione pelo menos uma cor para ativar a seleção por bolinhas na vitrine."}
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addColor}
                            className="mt-4 gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Adicionar cor
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {variants.map((variant) => (
                            <div
                                key={variant.id}
                                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                            >
                                {/* Card header */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5 pb-4 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-10 w-10 shrink-0 rounded-lg border-2 border-border shadow-inner"
                                            style={{ backgroundColor: variant.colorHex || '#D4D4D8' }}
                                        />
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {variant.optionValues.color || 'Nova cor'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Galeria exibida ao cliente ao selecionar esta cor
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={variant.active === false ? 'inativo' : 'ativo'}
                                            onChange={(e) =>
                                                updateVariant(variant.id, { active: e.target.value === 'ativo' })
                                            }
                                            className="w-[120px] rounded-lg"
                                        >
                                            <option value="ativo">Ativo</option>
                                            <option value="inativo">Inativo</option>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => removeColor(variant.id)}
                                            aria-label="Remover cor"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Campos */}
                                <div className="space-y-5">
                                    {/* Linha 1: Identificação */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Nome da cor</Label>
                                            <Input
                                                value={variant.optionValues.color || ''}
                                                onChange={(e) =>
                                                    updateVariant(variant.id, {
                                                        name: e.target.value,
                                                        optionValues: { color: e.target.value },
                                                    })
                                                }
                                                placeholder="Ex: Preto, Azul Royal..."
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Cor da bolinha</Label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={variant.colorHex || '#D4D4D8'}
                                                    onChange={(e) =>
                                                        updateVariant(variant.id, { colorHex: e.target.value })
                                                    }
                                                    className="h-10 w-12 cursor-pointer rounded-lg border border-input bg-background p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                />
                                                <Input
                                                    value={variant.colorHex || '#D4D4D8'}
                                                    onChange={(e) =>
                                                        updateVariant(variant.id, { colorHex: e.target.value })
                                                    }
                                                    className="flex-1 rounded-lg font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">SKU</Label>
                                            <Input
                                                value={variant.sku}
                                                onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Preço (R$)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={variant.price ?? basePrice}
                                                onChange={(e) =>
                                                    updateVariant(variant.id, { price: Number(e.target.value) || 0 })
                                                }
                                                className="rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    {/* Linha 2: Quantidades */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Qtd. mínima</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={variant.minQty ?? minQty}
                                                onChange={(e) =>
                                                    updateVariant(variant.id, { minQty: Number(e.target.value) || 1 })
                                                }
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-muted-foreground">Múltiplo de venda</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={variant.saleMultiple ?? saleMultiple}
                                                onChange={(e) =>
                                                    updateVariant(variant.id, { saleMultiple: Number(e.target.value) || 1 })
                                                }
                                                placeholder="Ex: 1, 6, 12..."
                                                className="rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    {/* Galeria de fotos */}
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Fotos da cor</Label>
                                        <input
                                            ref={(el) => { fileInputsRef.current[variant.id] = el; }}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            multiple
                                            onChange={(e) => {
                                                const files = e.target.files ? Array.from(e.target.files) : [];
                                                if (files.length === 0) return;
                                                setVariantImageFiles((prev) => ({
                                                    ...prev,
                                                    [variant.id]: [...(prev[variant.id] || []), ...files],
                                                }));
                                                e.target.value = '';
                                            }}
                                        />
                                        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                                            <div className="flex flex-wrap gap-3">
                                                {(variant.imageUrls || []).map((url) => (
                                                    <div key={url} className="relative group">
                                                        <div
                                                            className="h-20 w-20 rounded-xl border border-border bg-muted bg-cover bg-center shrink-0 shadow-sm"
                                                            style={{ backgroundImage: `url(${url})` }}
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Remover foto"
                                                            className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                                                            onClick={() =>
                                                                updateVariant(variant.id, {
                                                                    imageUrls: (variant.imageUrls || []).filter((u) => u !== url),
                                                                })
                                                            }
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                                {(variantImageFiles[variant.id] || []).map((file, idx) => (
                                                    <div key={`${file.name}-${idx}`} className="relative group">
                                                        <div
                                                            className="h-20 w-20 rounded-xl border border-border bg-muted bg-cover bg-center shrink-0 shadow-sm"
                                                            style={{
                                                                backgroundImage: `url(${URL.createObjectURL(file)})`,
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Remover foto"
                                                            className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                                                            onClick={() =>
                                                                setVariantImageFiles((prev) => ({
                                                                    ...prev,
                                                                    [variant.id]: (prev[variant.id] || []).filter((_, i) => i !== idx),
                                                                }))
                                                            }
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputsRef.current[variant.id]?.click()}
                                                    className={cn(
                                                        "flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-all",
                                                        "border-border bg-background text-muted-foreground",
                                                        "hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                                                    )}
                                                >
                                                    <ImagePlus className="h-6 w-6" />
                                                    <span className="text-xs font-medium">Adicionar</span>
                                                </button>
                                            </div>
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                Pelo menos uma foto por cor. O cliente verá esta galeria ao selecionar a bolinha.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
