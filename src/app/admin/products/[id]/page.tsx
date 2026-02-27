'use client';

import { Suspense, useEffect, useState, useRef, use } from 'react';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form fields
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [minQty, setMinQty] = useState('1');
    const [saleMultiple, setSaleMultiple] = useState('1');
    const [basePrice, setBasePrice] = useState('R$ 0,00');
    const [status, setStatus] = useState('ativo');

    const [variations, setVariations] = useState<{ name: string, sku: string }[]>([]);
    const [newVarName, setNewVarName] = useState('');

    // Files
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const [categories, setCategories] = useState<{ id: string, name: string, subcategories: string[] }[]>([]);
    const [subcategoryId, setSubcategoryId] = useState('');

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatInputCurrency = (value: string) => {
        let numericValue = value.replace(/\D/g, "");
        if (!numericValue) return "";
        let floatValue = parseFloat(numericValue) / 100;
        return floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getNumericValue = (currencyStr: string) => {
        let numericValue = currencyStr.replace(/\D/g, "");
        return parseFloat(numericValue) / 100;
    };

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
                    const data = snap.data();
                    setName(data.name || '');
                    setCategoryId(data.categoryId || '');
                    setSubcategoryId(data.subcategoryId || '');
                    setDescription(data.description || '');
                    setMinQty(data.minQty?.toString() || '1');
                    setSaleMultiple(data.saleMultiple?.toString() || '1');
                    setStatus(data.status || 'ativo');
                    if (data.basePrice) {
                        setBasePrice(formatCurrency(data.basePrice));
                    }
                    setVariations(data.variations || []);
                    setExistingImages(data.images || []);
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

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBasePrice(formatInputCurrency(e.target.value));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...filesArray]);
        }
    };

    const removeNewFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingImage = (urlToRemove: string) => {
        setExistingImages(prev => prev.filter(url => url !== urlToRemove));
    };

    const addVariation = () => {
        if (!newVarName) return;
        setVariations([...variations, { name: newVarName, sku: `SKU-${Date.now().toString().slice(-4)}` }]);
        setNewVarName('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !categoryId) {
            toast.error("Preencha os campos obrigatórios (Nome, Categoria).");
            return;
        }

        setSubmitting(true);
        try {
            // Upload new images
            const newImageUrls: string[] = [];
            for (const file of selectedFiles) {
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                newImageUrls.push(url);
            }

            const finalImages = [...existingImages, ...newImageUrls];

            // Save to Firestore
            await updateDoc(doc(db, 'products', params.id), {
                name,
                categoryId,
                subcategoryId,
                description,
                images: finalImages,
                minQty: parseInt(minQty) || 1,
                saleMultiple: parseInt(saleMultiple) || 1,
                basePrice: getNumericValue(basePrice),
                variations,
                status,
                updatedAt: serverTimestamp()
            });

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
                <p className="text-muted-foreground">Modifique os dados, variações ou fotos deste produto.</p>
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
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Fotos</h3>

                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                        <div className="flex flex-wrap gap-4 mb-4">
                            {existingImages.map((url, idx) => (
                                <div key={idx} className="relative group w-24 h-24 border rounded overflow-hidden">
                                    <img src={url} alt="Produto" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(url)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-input rounded-lg p-6 text-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                        <p>Clique para adicionar mais fotos (Upload múltiplo).</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*" />
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="relative inline-flex items-center bg-muted px-3 py-1 rounded text-sm">
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeNewFile(idx)}
                                        className="ml-2 text-destructive hover:text-destructive/80"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Configurações de Venda</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Quantidade Mínima</Label>
                            <Input type="number" min="1" value={minQty} onChange={e => setMinQty(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Múltiplo de Venda</Label>
                            <Input type="number" min="1" value={saleMultiple} onChange={e => setSaleMultiple(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Preço Base (R$)</Label>
                            <Input
                                type="text"
                                value={basePrice}
                                onChange={handlePriceChange}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Variações do Produto</h3>
                    {variations.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {variations.map((v, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-muted/50 p-2 rounded border border-border">
                                    <div className="flex gap-4">
                                        <div className="font-medium">{v.name}</div>
                                        <div className="text-sm text-muted-foreground">SKU: {v.sku}</div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setVariations(variations.filter((_, i) => i !== idx))} className="text-destructive">&times;</Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ex: Cor Preta..."
                            value={newVarName}
                            onChange={e => setNewVarName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVariation())}
                        />
                        <Button type="button" onClick={addVariation} variant="outline">Adicionar</Button>
                    </div>
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
