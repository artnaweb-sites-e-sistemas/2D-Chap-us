'use client';

import { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ProductVariationGroup, ProductVariant } from '@/types/store';

interface VariationBuilderProps {
    variationGroups: ProductVariationGroup[];
    setVariationGroups: React.Dispatch<React.SetStateAction<ProductVariationGroup[]>>;
    variants: ProductVariant[];
    setVariants: React.Dispatch<React.SetStateAction<ProductVariant[]>>;
    basePrice: number;
    minQty: number;
    /** Novas fotos ainda não enviadas, por variante (múltiplas por cor) */
    variantImageFiles: Record<string, File[]>;
    setVariantImageFiles: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
}

export function VariationBuilder({
    setVariationGroups,
    variants,
    setVariants,
    basePrice,
    minQty,
    variantImageFiles,
    setVariantImageFiles,
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
            saleMultiple: 1,
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
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h4 className="font-medium text-foreground">Cores do produto</h4>
                        <p className="text-sm text-muted-foreground">
                            Cadastre cada cor com sua bolinha, SKU, quantidade minima e a galeria que o cliente verá ao selecionar.
                        </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {totalColors} cor(es)
                    </span>
                </div>

                <Button type="button" variant="outline" onClick={addColor} className="self-start">
                    Adicionar cor
                </Button>
            </div>

            <div className="rounded-lg border border-border bg-white p-4 space-y-4">
                <div>
                    <h4 className="font-medium text-foreground">Cores cadastradas</h4>
                        <p className="text-sm text-muted-foreground">
                            Obrigatório pelo menos uma cor com pelo menos uma foto. O cliente verá a galeria da cor selecionada.
                        </p>
                </div>

                {variants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Adicione pelo menos uma cor para ativar a seleção por bolinhas na vitrine.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {variants.map((variant) => (
                            <div key={variant.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {variant.optionValues.color || 'Nova cor'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            As fotos abaixo serão a galeria exibida ao cliente ao selecionar esta cor.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={variant.active === false ? 'inativo' : 'ativo'}
                                            onChange={(event) =>
                                                updateVariant(variant.id, { active: event.target.value === 'ativo' })
                                            }
                                            className="w-full md:w-36"
                                        >
                                            <option value="ativo">Ativo</option>
                                            <option value="inativo">Inativo</option>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => removeColor(variant.id)}
                                        >
                                            Remover
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                                    <div className="space-y-2">
                                        <Label>Nome da cor</Label>
                                        <Input
                                            value={variant.optionValues.color || ''}
                                            onChange={(event) =>
                                                updateVariant(variant.id, {
                                                    name: event.target.value,
                                                    optionValues: { color: event.target.value },
                                                })
                                            }
                                            placeholder="Ex: Preto, Azul Royal..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cor da bolinha</Label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={variant.colorHex || '#D4D4D8'}
                                                onChange={(event) =>
                                                    updateVariant(variant.id, { colorHex: event.target.value })
                                                }
                                                className="h-10 w-14 rounded border border-border bg-white p-1"
                                            />
                                            <Input
                                                value={variant.colorHex || '#D4D4D8'}
                                                onChange={(event) =>
                                                    updateVariant(variant.id, { colorHex: event.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>SKU</Label>
                                        <Input
                                            value={variant.sku}
                                            onChange={(event) => updateVariant(variant.id, { sku: event.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Preço</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={variant.price ?? basePrice}
                                            onChange={(event) =>
                                                updateVariant(variant.id, { price: Number(event.target.value) || 0 })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Qtd. mínima</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={variant.minQty ?? minQty}
                                            onChange={(event) =>
                                                updateVariant(variant.id, { minQty: Number(event.target.value) || 1 })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2 xl:col-span-5">
                                        <Label>Fotos da cor (múltiplas)</Label>
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
                                        <div className="rounded-lg border border-dashed border-border bg-white p-4">
                                            <div className="flex flex-wrap gap-3">
                                                {(variant.imageUrls || []).map((url) => (
                                                    <div key={url} className="relative group">
                                                        <div
                                                            className="h-20 w-20 rounded-lg border border-border bg-muted bg-cover bg-center shrink-0"
                                                            style={{ backgroundImage: `url(${url})` }}
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Remover foto"
                                                            className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                            className="h-20 w-20 rounded-lg border border-border bg-muted bg-cover bg-center shrink-0"
                                                            style={{
                                                                backgroundImage: `url(${URL.createObjectURL(file)})`,
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            aria-label="Remover foto"
                                                            className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:border-primary/40 hover:text-primary transition-colors"
                                                >
                                                    <span className="text-2xl">+</span>
                                                </button>
                                            </div>
                                            <p className="mt-2 text-xs text-muted-foreground">
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
