'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { VariationBuilder } from '@/features/products/components/VariationBuilder';
import { ProductVariationGroup, ProductVariant } from '@/types/store';

export default function NewProductPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');

    const [variationGroups, setVariationGroups] = useState<ProductVariationGroup[]>([]);
    const [variants, setVariants] = useState<ProductVariant[]>([]);
    const [variantImageFiles, setVariantImageFiles] = useState<Record<string, File[]>>({});
    const [categories, setCategories] = useState<{ id: string, name: string, subcategories: string[] }[]>([]);
    const [subcategoryId, setSubcategoryId] = useState('');

    useEffect(() => {
        const fetchCategories = async () => {
            const snap = await getDocs(collection(db, 'categories'));
            const cats = snap.docs.map(d => ({ id: d.id, name: d.data().name, subcategories: d.data().subcategories || [] }));
            setCategories(cats);
        };
        fetchCategories();
    }, []);

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
            toast.error("Cada cor precisa de pelo menos uma foto. Adicione fotos nas cores em destaque.");
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

            const allImages = Array.from(
                new Set([
                    ...variantsWithImages.flatMap((v) => v.imageUrls || (v.imageUrl ? [v.imageUrl] : [])),
                ])
            );

            const firstVariant = variantsWithImages[0];

            await addDoc(collection(db, 'products'), {
                name,
                categoryId,
                subcategoryId,
                description,
                images: allImages,
                minQty: firstVariant?.minQty ?? 1,
                saleMultiple: 1,
                basePrice: firstVariant?.price ?? 0,
                variationGroups,
                variants: variantsWithImages,
                status: 'ativo',
                createdAt: serverTimestamp()
            });

            toast.success('Produto criado com sucesso!');
            router.push('/admin/products');
        } catch (error) {
            console.error("Erro ao criar produto:", error);
            toast.error("Ocorreu um erro ao salvar o produto.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Novo Produto</h2>
                <p className="text-muted-foreground">Crie um novo produto e configure tudo direto nas variações por cor.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8 bg-white p-6 rounded-xl shadow-sm border border-border">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Informações Básicas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Nome do Produto *</Label>
                            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Boné Trucker Liso" />
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
                                disabled={!categoryId || categories.find(c => c.id === categoryId)?.subcategories.length === 0}
                                value={subcategoryId}
                                onChange={e => setSubcategoryId(e.target.value)}
                            >
                                <option value="">Selecione subcategoria...</option>
                                {categories.find(c => c.id === categoryId)?.subcategories.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Descrição</Label>
                            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do produto" />
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
                        {submitting ? 'Salvando...' : 'Salvar Produto'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
