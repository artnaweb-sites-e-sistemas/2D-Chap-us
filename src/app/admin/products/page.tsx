'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { collection, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { deleteImagesByUrl } from '@/lib/firebase/storageCleanup';
import { Search } from 'lucide-react';

interface ProductData {
    id: string;
    name: string;
    category: string;
    subcategory?: string;
    basePrice: number;
    status?: string;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<ProductData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            // Fetch categories first for mapping
            const catSnap = await getDocs(collection(db, 'categories'));
            const catMap: Record<string, string> = {};
            catSnap.forEach(c => {
                catMap[c.id] = c.data().name;
            });

            const snap = await getDocs(collection(db, 'products'));
            const pData: ProductData[] = [];
            snap.forEach(d => {
                const data = d.data();
                pData.push({
                    id: d.id,
                    name: data.name || 'Sem nome',
                    category: catMap[data.categoryId] || data.categoryId || 'Sem categoria',
                    subcategory: data.subcategoryId || '',
                    basePrice: data.basePrice || 0,
                    status: data.status || 'ativo'
                });
            });
            setProducts(pData);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar produtos.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;

        try {
            const productRef = doc(db, 'products', id);
            const snap = await getDoc(productRef);

            if (snap.exists()) {
                const data = snap.data() as any;
                const urls = new Set<string>();

                (data.images || []).forEach((u: string) => urls.add(u));
                (data.variants || []).forEach((variant: any) => {
                    const vUrls: string[] = [
                        ...(variant.imageUrls || []),
                        ...(variant.imageUrl ? [variant.imageUrl] : []),
                    ];
                    vUrls.forEach((u) => urls.add(u));
                });

                if (urls.size > 0) {
                    await deleteImagesByUrl(Array.from(urls));
                }
            }

            await deleteDoc(productRef);
            toast.success(`Baixa do produto "${name}" realizada.`);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir produto.");
        }
    };

    const filteredProducts = products.filter((product) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
            product.name.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term) ||
            (product.subcategory || '').toLowerCase().includes(term) ||
            product.id.toLowerCase().includes(term)
        );
    });

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Catálogo de Produtos</h2>
                        <p className="text-muted-foreground">Busque, edite e gerencie seus produtos.</p>
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="text"
                                placeholder="Buscar por nome, categoria ou ID..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Link href="/admin/products/categories">
                                <Button variant="outline">Categorias</Button>
                            </Link>
                            <Link href="/admin/products/new">
                                <Button>Novo Produto</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                            <th className="px-4 py-3 font-medium">Produto</th>
                            <th className="px-4 py-3 font-medium">Categoria / Sub</th>
                            <th className="px-4 py-3 font-medium">Preço Base</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando produtos...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto cadastrado.</td></tr>
                        ) : filteredProducts.map(product => (
                            <tr key={product.id} className="hover:bg-muted/50">
                                <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                                <td className="px-4 py-3 text-muted-foreground capitalize">
                                    {product.category}{product.subcategory ? ` > ${product.subcategory}` : ''}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">R$ {(product.basePrice || 0).toFixed(2).replace('.', ',')}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${product.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-muted text-foreground'}`}>
                                        {product.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right space-x-2">
                                    <Link href={`/admin/products/${product.id}`}>
                                        <Button variant="ghost" size="sm">Editar</Button>
                                    </Link>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(product.id, product.name)}>Excluir</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
