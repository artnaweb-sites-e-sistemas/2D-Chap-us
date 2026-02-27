'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import Link from 'next/link';

interface CategoryData {
    id: string;
    name: string;
    subcategories?: string[];
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'categories'));
            const data = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
            setCategories(data);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar categorias.");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        try {
            const docRef = await addDoc(collection(db, 'categories'), { name: newCategory, subcategories: [] });
            setCategories([...categories, { id: docRef.id, name: newCategory, subcategories: [] }]);
            setNewCategory('');
            toast.success("Categoria adicionada!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao adicionar categoria.");
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir a categoria "${name}"?`)) return;

        try {
            await deleteDoc(doc(db, 'categories', id));
            setCategories(prev => prev.filter(c => c.id !== id));
            toast.success("Categoria excluída com sucesso.");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir categoria.");
        }
    };

    const handleAddSubcategory = async (categoryId: string, subName: string) => {
        if (!subName.trim()) return;
        try {
            const catRef = doc(db, 'categories', categoryId);
            const currentCat = categories.find(c => c.id === categoryId);
            const updatedSubs = [...(currentCat?.subcategories || []), subName.trim()];

            await updateDoc(catRef, { subcategories: updatedSubs });
            setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, subcategories: updatedSubs } : c));
            toast.success("Subcategoria adicionada!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar subcategoria.");
        }
    };

    const handleRemoveSubcategory = async (categoryId: string, subName: string) => {
        try {
            const catRef = doc(db, 'categories', categoryId);
            const currentCat = categories.find(c => c.id === categoryId);
            const updatedSubs = (currentCat?.subcategories || []).filter(s => s !== subName);

            await updateDoc(catRef, { subcategories: updatedSubs });
            setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, subcategories: updatedSubs } : c));
            toast.success("Subcategoria removida!");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao remover subcategoria.");
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gerenciar Categorias</h2>
                    <p className="text-muted-foreground">Adicione e remova as categorias do seu catálogo.</p>
                </div>
                <Link href="/admin/products">
                    <Button variant="outline">Voltar para Produtos</Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-border space-y-4">
                <div className="flex gap-2 mb-6">
                    <Input
                        placeholder="Nome da nova categoria..."
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <Button onClick={handleAdd}>Adicionar</Button>
                </div>

                <div className="space-y-2">
                    {loading ? (
                        <p className="text-sm text-center py-4 text-muted-foreground">Carregando...</p>
                    ) : categories.length === 0 ? (
                        <p className="text-sm text-center py-4 text-muted-foreground">Nenhuma categoria encontrada.</p>
                    ) : (
                        categories.map(cat => (
                            <div key={cat.id} className="p-4 bg-muted/30 rounded border border-border space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-lg text-foreground">{cat.name}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(cat.id, cat.name)}
                                    >
                                        Excluir Categoria
                                    </Button>
                                </div>
                                <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                                    <p className="text-sm font-semibold text-muted-foreground">Subcategorias</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(cat.subcategories || []).map((sub, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm text-sm">
                                                <span>{sub}</span>
                                                <button
                                                    className="text-muted-foreground hover:text-destructive text-lg leading-none"
                                                    onClick={() => handleRemoveSubcategory(cat.id, sub)}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 max-w-sm pt-2">
                                        <Input
                                            placeholder="Nova subcategoria..."
                                            className="h-8 text-sm"
                                            id={`sub-input-${cat.id}`}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    handleAddSubcategory(cat.id, e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        <Button
                                            size="sm"
                                            className="h-8"
                                            onClick={() => {
                                                const input = document.getElementById(`sub-input-${cat.id}`) as HTMLInputElement;
                                                if (input) {
                                                    handleAddSubcategory(cat.id, input.value);
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            Adicionar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
