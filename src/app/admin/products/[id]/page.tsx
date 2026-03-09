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
    const [subcategoryId, setSubcategoryId] = useState('');
    const [originalImageUrls, setOriginalImageUrls] = useState<string[]>([]);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Fetch Categories
                const snapCats = await getDocs(collection(db, 'categories'));
                setCategories(snapCats.docs.map(d => ({ id: d.id, name: d.data().name, subcategories: d.data().subcategories || [] })));

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

    const defaultBasePrice = useMemo(
        () => variants[0]?.price ?? 0,
        [variants]
    );

    const defaultMinQty = useMemo(
        () => variants[0]?.minQty ?? 1,
        [variants]
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !categoryId) {
            toast.error("Preencha os campos obrigatórios (Nome, Categoria).");
            return;
        }
        if (variants.length === 0) {
            toast.error("Adicione pelo menos uma cor ao produto.");
            return;
        }
        const missingImages = variants.filter(
            (v) => ((v.imageUrls?.length ?? 0) + (variantImageFiles[v.id]?.length ?? 0)) < 1
        );
        if (missingImages.length > 0) {
            toast.error("Cada cor precisa de pelo menos uma foto.");
            return;
        }

        setSubmitting(true);
        try {
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

            const finalImages = Array.from(
                new Set([
                    ...variantsWithImages.flatMap((v) => v.imageUrls || (v.imageUrl ? [v.imageUrl] : [])),
                ])
            );

            const firstVariant = variantsWithImages[0];

            const productRef = doc(db, 'products', params.id);

            await updateDoc(productRef, {
                name,
                categoryId,
                subcategoryId,
                description,
                images: finalImages,
                minQty: firstVariant?.minQty ?? 1,
                saleMultiple: 1,
                basePrice: firstVariant?.price ?? 0,
                variationGroups,
                variants: variantsWithImages,
                status,
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
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Variações do Produto</h3>
                    <VariationBuilder
                        variationGroups={variationGroups}
                        setVariationGroups={setVariationGroups}
                        variants={variants}
                        setVariants={setVariants}
                        variantImageFiles={variantImageFiles}
                        setVariantImageFiles={setVariantImageFiles}
                        basePrice={defaultBasePrice}
                        minQty={defaultMinQty}
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
