'use client';

import { Suspense, useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { normalizeProduct } from '@/lib/commerce';
import { VariationBuilder } from '@/features/products/components/VariationBuilder';
import { ExclusiveClientsSelector } from '@/features/products/components/ExclusiveClientsSelector';
import { ProductVariationGroup, ProductVariant } from '@/types/store';
import { deleteImagesByUrl } from '@/lib/firebase/storageCleanup';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando produto...</div>}>
            <EditProductContent paramsPromise={params} />
        </Suspense>
    );
}

function EditProductContent({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form fields
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('ativo');

    const [variationGroups, setVariationGroups] = useState<ProductVariationGroup[]>([]);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [variantImageFiles, setVariantImageFiles] = useState<Record<string, File[]>>({});

    const [categories, setCategories] = useState<{ id: string, name: string, subcategories: string[] }[]>([]);
    const [clients, setClients] = useState<{ id: string; razaoSocial: string }[]>([]);
    const [subcategoryId, setSubcategoryId] = useState('');
    const [exclusiveToClientIds, setExclusiveToClientIds] = useState<string[]>([]);
    const [colorOptional, setColorOptional] = useState(false);
    const [productBasePrice, setProductBasePrice] = useState(0);
    const [productMinQty, setProductMinQty] = useState(1);
    const [productSaleMultiple, setProductSaleMultiple] = useState(1);
    const [productImageFiles, setProductImageFiles] = useState<File[]>([]);
    const [productImageUrls, setProductImageUrls] = useState<string[]>([]);
    const [originalImageUrls, setOriginalImageUrls] = useState<string[]>([]);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Fetch Categories and Clients
                const [snapCats, snapClients] = await Promise.all([
                    getDocs(collection(db, 'categories')),
                    getDocs(collection(db, 'clients')),
                ]);
                setCategories(snapCats.docs.map(d => ({ id: d.id, name: d.data().name, subcategories: d.data().subcategories || [] })));
                setClients(snapClients.docs.map(d => ({ id: d.id, razaoSocial: String(d.data().razaoSocial || d.id) })));

                // Fetch Product
                const docRef = doc(db, 'products', params.id);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const product = normalizeProduct(snap.id, snap.data());
                    setName(product.name || '');
                    setCategoryId(product.categoryId || '');
                    setSubcategoryId(product.subcategoryId || '');
                    setDescription(product.description || '');
                    setStatus(product.status || 'ativo');
                    setVariationGroups(product.variationGroups || []);
                    setVariants(product.variants || []);
                    setExclusiveToClientIds(product.exclusiveToClientIds || []);
                    setColorOptional(product.colorOptional ?? false);
                    setProductBasePrice(product.basePrice ?? 0);
                    setProductMinQty(product.minQty ?? 1);
                    setProductSaleMultiple(product.saleMultiple ?? 1);

                    const urls = new Set<string>();
                    (product.images || []).forEach((u: string) => urls.add(u));
                    (product.variants || []).forEach((variant: any) => {
                        const vUrls: string[] = [
                            ...(variant.imageUrls || []),
                            ...(variant.imageUrl ? [variant.imageUrl] : []),
                        ];
                        vUrls.forEach((u) => urls.add(u));
                    });
                    setOriginalImageUrls(Array.from(urls));
                    if ((product.variants || []).length === 0) {
                        setProductImageUrls(product.images || []);
                    }
                } else {
                    toast.error("Produto não encontrado.");
                    router.push('/admin/products');
                }
            } catch (error) {
                console.error(error);
                toast.error("Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [params.id, router]);

    useEffect(() => {
        if (colorOptional && variants.length === 0 && productImageUrls.length === 0 && originalImageUrls.length > 0) {
            setProductImageUrls(originalImageUrls);
        }
    }, [colorOptional, variants.length, productImageUrls.length, originalImageUrls]);

    const defaultBasePrice = useMemo(
        () => variants[0]?.price ?? 0,
        [variants]
    );

    const defaultMinQty = useMemo(
        () => variants[0]?.minQty ?? 1,
        [variants]
    );

    const defaultSaleMultiple = useMemo(
        () => variants[0]?.saleMultiple ?? 1,
        [variants]
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !categoryId) {
            toast.error("Preencha os campos obrigatórios (Nome, Categoria).");
            return;
        }

        const hasVariants = variants.length > 0;
        if (!colorOptional && !hasVariants) {
            toast.error("Adicione pelo menos uma cor ao produto ou marque 'Cor não obrigatória'.");
            return;
        }

        if (hasVariants) {
            const missingImages = variants.filter(
                (v) => ((v.imageUrls?.length ?? 0) + (variantImageFiles[v.id]?.length ?? 0)) < 1
            );
            if (missingImages.length > 0) {
                toast.error("Cada cor precisa de pelo menos uma foto.");
                return;
            }
        } else {
            const hasProductImages = productImageFiles.length > 0 || productImageUrls.length > 0;
            if (!hasProductImages) {
                toast.error("Adicione pelo menos uma foto do produto.");
                return;
            }
        }

        setSubmitting(true);
        try {
            let finalImages: string[] = [];
            let finalVariants = variants;
            let finalGroups = variationGroups;
            let basePriceVal = productBasePrice;
            let minQtyVal = productMinQty;
            let saleMultipleVal = productSaleMultiple;

            if (hasVariants) {
                const variantsWithImages = await Promise.all(
                    variants.map(async (variant) => {
                        const existingUrls = variant.imageUrls || (variant.imageUrl ? [variant.imageUrl] : []);
                        const newFiles = variantImageFiles[variant.id] || [];
                        const uploaded: string[] = [];
                        for (let i = 0; i < newFiles.length; i++) {
                            const file = newFiles[i];
                            const storageRef = ref(
                                storage,
                                `products/variants/${Date.now()}_${variant.id}_${i}_${file.name}`
                            );
                            await uploadBytes(storageRef, file);
                            const url = await getDownloadURL(storageRef);
                            uploaded.push(url);
                        }
                        const imageUrlsForVariant = [...existingUrls, ...uploaded];
                        return {
                            ...variant,
                            imageUrls: imageUrlsForVariant,
                            imageUrl: imageUrlsForVariant[0],
                        };
                    })
                );
                finalVariants = variantsWithImages;
                finalImages = Array.from(
                    new Set(variantsWithImages.flatMap((v) => v.imageUrls || (v.imageUrl ? [v.imageUrl] : [])))
                );
                basePriceVal = variantsWithImages[0]?.price ?? 0;
                minQtyVal = variantsWithImages[0]?.minQty ?? 1;
                saleMultipleVal = variantsWithImages[0]?.saleMultiple ?? 1;
        } else {
            const existingUrls = productImageUrls.length > 0 ? productImageUrls : originalImageUrls;
                const uploaded: string[] = [];
                for (let i = 0; i < productImageFiles.length; i++) {
                    const file = productImageFiles[i];
                    const storageRef = ref(
                        storage,
                        `products/main/${Date.now()}_${i}_${file.name}`
                    );
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    uploaded.push(url);
                }
                finalImages = [...existingUrls, ...uploaded];
            }

            const productRef = doc(db, 'products', params.id);

            await updateDoc(productRef, {
                name,
                categoryId,
                subcategoryId,
                description,
                images: finalImages,
                minQty: minQtyVal,
                saleMultiple: saleMultipleVal,
                basePrice: basePriceVal,
                variationGroups: finalGroups,
                variants: finalVariants,
                status,
                colorOptional,
                exclusiveToClientIds: exclusiveToClientIds.length > 0 ? exclusiveToClientIds : [],
                updatedAt: serverTimestamp()
            });

            const newImageSet = new Set<string>(finalImages);
            const toDelete = originalImageUrls.filter((url) => !newImageSet.has(url));
            if (toDelete.length > 0) {
                await deleteImagesByUrl(toDelete);
            }

            toast.success('Produto atualizado com sucesso!');
            router.push('/admin/products');
        } catch (error) {
            console.error(error);
            toast.error("Ocorreu um erro ao atualizar o produto.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando formulário...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Editar Produto</h2>
                <p className="text-muted-foreground">Modifique os dados e configure preço, quantidade e fotos direto nas variações.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8 bg-white p-6 rounded-xl shadow-sm border border-border">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Básicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Nome do Produto *</Label>
                            <Input required value={name} onChange={e => setName(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label>Categoria *</Label>
                            <Select required value={categoryId} onChange={e => {
                                setCategoryId(e.target.value);
                                setSubcategoryId('');
                            }}>
                                <option value="">Selecione...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Subcategoria</Label>
                            <Select
                                disabled={!categoryId || categories.find(c => c.id === categoryId)?.subcategories?.length === 0}
                                value={subcategoryId}
                                onChange={e => setSubcategoryId(e.target.value)}
                            >
                                <option value="">Selecione subcategoria...</option>
                                {categories.find(c => c.id === categoryId)?.subcategories?.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select required value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="ativo">Ativo</option>
                                <option value="inativo">Inativo</option>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Descrição</Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <ExclusiveClientsSelector
                                clients={clients}
                                selectedIds={exclusiveToClientIds}
                                onChange={setExclusiveToClientIds}
                                disabled={submitting}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <h3 className="text-lg font-semibold text-foreground border-b pb-2">Variações do Produto</h3>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-muted/30">
                            <input
                                type="checkbox"
                                checked={colorOptional}
                                onChange={(e) => setColorOptional(e.target.checked)}
                                className="h-4 w-4 rounded border-input"
                            />
                            <span className="text-sm font-medium">Cor não obrigatória</span>
                        </label>
                    </div>
                    <p className="text-sm text-muted-foreground -mt-2">
                        {colorOptional
                            ? "Produto pode ser salvo sem variações de cor. Use os campos abaixo quando não houver cores."
                            : "Obrigatório pelo menos uma cor com foto."}
                    </p>

                    {colorOptional && variants.length === 0 && (
                        <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
                            <h4 className="font-medium text-foreground">Valores do produto (sem variação de cor)</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Preço (R$)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={productBasePrice}
                                        onChange={(e) => setProductBasePrice(Number(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Qtd. mínima</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={productMinQty}
                                        onChange={(e) => setProductMinQty(Number(e.target.value) || 1)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Múltiplo de venda</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={productSaleMultiple}
                                        onChange={(e) => setProductSaleMultiple(Number(e.target.value) || 1)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Foto(s) do produto</Label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    id="product-image-input"
                                    onChange={(e) => {
                                        const files = e.target.files ? Array.from(e.target.files) : [];
                                        setProductImageFiles((prev) => [...prev, ...files]);
                                        e.target.value = '';
                                    }}
                                />
                                <div className="flex flex-wrap gap-3">
                                    {(productImageUrls.length > 0 ? productImageUrls : originalImageUrls).map((url) => (
                                        <div key={url} className="relative group">
                                            <div
                                                className="h-20 w-20 rounded-xl border border-border bg-muted bg-cover bg-center shrink-0"
                                                style={{ backgroundImage: `url(${url})` }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setProductImageUrls((prev) => (prev.length > 0 ? prev : originalImageUrls).filter((u) => u !== url))
                                                }
                                                className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {productImageFiles.map((file, idx) => (
                                        <div key={`${file.name}-${idx}`} className="relative group">
                                            <div
                                                className="h-20 w-20 rounded-xl border border-border bg-muted bg-cover bg-center shrink-0"
                                                style={{ backgroundImage: `url(${URL.createObjectURL(file)})` }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setProductImageFiles((p) => p.filter((_, i) => i !== idx))}
                                                className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <label
                                        htmlFor="product-image-input"
                                        className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <span className="text-2xl">+</span>
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground">Pelo menos uma foto obrigatória.</p>
                            </div>
                        </div>
                    )}

                    <VariationBuilder
                        variationGroups={variationGroups}
                        setVariationGroups={setVariationGroups}
                        variants={variants}
                        setVariants={setVariants}
                        variantImageFiles={variantImageFiles}
                        setVariantImageFiles={setVariantImageFiles}
                        basePrice={defaultBasePrice}
                        minQty={defaultMinQty}
                        saleMultiple={defaultSaleMultiple}
                        colorOptional={colorOptional}
                    />
                </div>

                <div className="flex justify-end pt-4 space-x-4">
                    <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>Cancelar</Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
