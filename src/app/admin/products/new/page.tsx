'use client';

import { useState, useRef, useEffect } from 'react';
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

export default function NewProductPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [minQty, setMinQty] = useState('1');
    const [saleMultiple, setSaleMultiple] = useState('1');
    const [basePrice, setBasePrice] = useState('R$ 0,00');

    const [variations, setVariations] = useState<{ name: string, sku: string }[]>([]);
    const [newVarName, setNewVarName] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

    const formatCurrency = (value: string) => {
        let numericValue = value.replace(/\D/g, "");
        if (!numericValue) return "";
        let floatValue = parseFloat(numericValue) / 100;
        return floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getNumericValue = (currencyStr: string) => {
        let numericValue = currencyStr.replace(/\D/g, "");
        return parseFloat(numericValue) / 100;
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBasePrice(formatCurrency(e.target.value));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...filesArray]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
            // Upload images
            const imageUrls: string[] = [];
            for (const file of selectedFiles) {
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                imageUrls.push(url);
            }

            // Save to Firestore
            await addDoc(collection(db, 'products'), {
                name,
                categoryId,
                subcategoryId,
                description,
                images: imageUrls,
                minQty: parseInt(minQty) || 1,
                saleMultiple: parseInt(saleMultiple) || 1,
                basePrice: getNumericValue(basePrice),
                variations,
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
                <p className="text-muted-foreground">Crie um novo produto, suas variações e múltiplos de venda.</p>
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
                    <h3 className="text-lg font-semibold text-foreground border-b pb-2">Fotos</h3>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-input rounded-lg p-6 text-center text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                        <p>Clique para enviar fotos (Upload múltiplo).</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept="image/*" />
                    </div>
                    {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {selectedFiles.map((file, idx) => (
                                <div key={idx} className="relative inline-flex items-center bg-muted px-3 py-1 rounded text-sm">
                                    <span className="truncate max-w-[150px]">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
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
                        <Button type="button" onClick={addVariation} variant="outline">Adicionar Variação</Button>
                    </div>
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
