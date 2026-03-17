'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import Link from 'next/link';
import { Pencil, ChevronUp, ChevronDown } from 'lucide-react';

interface CategoryData {
    id: string;
    name: string;
    subcategories?: string[];
    order?: number;
}

type EditModalState =
    | {
        type: 'category';
        categoryId: string;
        originalName: string;
        newName: string;
      }
    | {
        type: 'subcategory';
        categoryId: string;
        originalName: string;
        newName: string;
        subName: string;
      };

export default function CategoriesPage() {
    const [categories, setCategories] = useState<CategoryData[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [editModal, setEditModal] = useState<EditModalState | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'categories'));
            const data = snap.docs.map((d, index) => {
                const raw = d.data();
                const order =
                    typeof raw.order === 'number'
                        ? raw.order
                        : index;
                return {
                    id: d.id,
                    name: raw.name as string,
                    subcategories: (raw.subcategories as string[]) || [],
                    order,
                };
            });
            data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
            const nextOrder =
                categories.reduce((max, c) => Math.max(max, c.order ?? 0), -1) + 1;
            const docRef = await addDoc(collection(db, 'categories'), {
                name: newCategory,
                subcategories: [],
                order: nextOrder,
            });
            setCategories([
                ...categories,
                { id: docRef.id, name: newCategory, subcategories: [], order: nextOrder },
            ]);
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

    const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
        const index = categories.findIndex((c) => c.id === categoryId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= categories.length) return;

        const updated = [...categories];
        const [moved] = updated.splice(index, 1);
        updated.splice(newIndex, 0, moved);

        const withOrder = updated.map((c, i) => ({ ...c, order: i }));
        setCategories(withOrder);

        try {
            await Promise.all(
                withOrder.map((c) =>
                    updateDoc(doc(db, 'categories', c.id), { order: c.order ?? 0 })
                )
            );
        } catch (error) {
            console.error(error);
            toast.error('Erro ao reordenar categorias.');
        }
    };

    const moveSubcategory = async (
        categoryId: string,
        subName: string,
        direction: 'up' | 'down'
    ) => {
        const currentCat = categories.find((c) => c.id === categoryId);
        if (!currentCat) return;
        const subs = currentCat.subcategories || [];
        const index = subs.findIndex((s) => s === subName);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= subs.length) return;

        const updatedSubs = [...subs];
        const [moved] = updatedSubs.splice(index, 1);
        updatedSubs.splice(newIndex, 0, moved);

        try {
            const catRef = doc(db, 'categories', categoryId);
            await updateDoc(catRef, { subcategories: updatedSubs });
            setCategories((prev) =>
                prev.map((c) =>
                    c.id === categoryId ? { ...c, subcategories: updatedSubs } : c
                )
            );
        } catch (error) {
            console.error(error);
            toast.error('Erro ao reordenar subcategorias.');
        }
    };

    const openEditCategoryModal = (id: string, name: string) => {
        setEditModal({
            type: 'category',
            categoryId: id,
            originalName: name,
            newName: name,
        });
    };

    const openEditSubcategoryModal = (categoryId: string, subName: string) => {
        setEditModal({
            type: 'subcategory',
            categoryId,
            originalName: subName,
            newName: subName,
            subName,
        });
    };

    const handleConfirmEdit = async () => {
        if (!editModal) return;
        const trimmed = editModal.newName.trim();
        if (!trimmed || trimmed === editModal.originalName) {
            setEditModal(null);
            return;
        }

        try {
            setSavingEdit(true);
            const catRef = doc(db, 'categories', editModal.categoryId);

            if (editModal.type === 'category') {
                await updateDoc(catRef, { name: trimmed });
                setCategories(prev =>
                    prev.map(c => (c.id === editModal.categoryId ? { ...c, name: trimmed } : c))
                );
                toast.success('Categoria atualizada com sucesso.');
            } else {
                const currentCat = categories.find(c => c.id === editModal.categoryId);
                const updatedSubs = (currentCat?.subcategories || []).map(s =>
                    s === editModal.subName ? trimmed : s
                );
                await updateDoc(catRef, { subcategories: updatedSubs });
                setCategories(prev =>
                    prev.map(c =>
                        c.id === editModal.categoryId ? { ...c, subcategories: updatedSubs } : c
                    )
                );
                toast.success('Subcategoria atualizada com sucesso.');
            }
            setEditModal(null);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar edição.');
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Gerenciar Categorias</h2>
                    <p className="text-muted-foreground">
                        Adicione, edite e ordene as categorias e subcategorias usadas no menu do cliente.
                    </p>
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
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-lg text-foreground">{cat.name}</span>
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                                            onClick={() => openEditCategoryModal(cat.id, cat.name)}
                                        >
                                            <Pencil className="h-3 w-3" />
                                            Editar
                                        </button>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <button
                                                type="button"
                                                className="p-1 rounded hover:bg-muted"
                                                onClick={() => moveCategory(cat.id, 'up')}
                                                title="Mover categoria para cima"
                                            >
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1 rounded hover:bg-muted"
                                                onClick={() => moveCategory(cat.id, 'down')}
                                                title="Mover categoria para baixo"
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
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
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <button
                                                        type="button"
                                                        className="p-0.5 rounded hover:bg-muted"
                                                        onClick={() => moveSubcategory(cat.id, sub, 'up')}
                                                        title="Mover para cima"
                                                    >
                                                        <ChevronUp className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-0.5 rounded hover:bg-muted"
                                                        onClick={() => moveSubcategory(cat.id, sub, 'down')}
                                                        title="Mover para baixo"
                                                    >
                                                        <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="text-xs text-muted-foreground hover:text-primary"
                                                    onClick={() => openEditSubcategoryModal(cat.id, sub)}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                                <button
                                                    type="button"
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
            {editModal && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg border border-border space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">
                            {editModal.type === 'category' ? 'Editar categoria' : 'Editar subcategoria'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {editModal.type === 'category'
                                ? 'Altere o nome da categoria. Isso impacta onde ela é exibida no catálogo.'
                                : 'Altere o nome da subcategoria. Isso impacta onde ela é exibida no catálogo.'}
                        </p>
                        <Input
                            autoFocus
                            value={editModal.newName}
                            onChange={(e) =>
                                setEditModal(current =>
                                    current ? { ...current, newName: e.target.value } : current
                                )
                            }
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleConfirmEdit();
                                } else if (e.key === 'Escape') {
                                    setEditModal(null);
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={savingEdit}
                                onClick={() => setEditModal(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={savingEdit}
                                onClick={handleConfirmEdit}
                            >
                                {savingEdit ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
