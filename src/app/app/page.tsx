'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ShoppingCart, Search } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCartStore } from '@/store/useCartStore';
import { useAuth } from '@/features/auth/AuthContext';
import { ProductRecord } from '@/types/store';
import { normalizeProduct } from '@/lib/commerce';
import { StoreProductCard } from '@/features/storefront/components/StoreProductCard';

interface Category {
    id: string;
    name: string;
    subcategories: string[];
}

function canSeeProduct(product: ProductRecord, clientId: string | undefined): boolean {
    const exclusive = product.exclusiveToClientIds;
    if (!exclusive || exclusive.length === 0) return true;
    if (!clientId) return false;
    return exclusive.includes(clientId);
}

export default function ClientPortalDashboard() {
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<ProductRecord[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();
    const clientId = user?.clientId;
    const items = useCartStore((state) => state.items);
    const cartCount = items.length;

    useEffect(() => {
        const fetchStorefrontData = async () => {
            try {
                const [productSnapshot, categorySnapshot] = await Promise.all([
                    getDocs(collection(db, 'products')),
                    getDocs(collection(db, 'categories')),
                ]);

                const allProducts = productSnapshot.docs
                    .map((doc) => normalizeProduct(doc.id, doc.data()))
                    .filter((product) => product.status !== 'inativo');

                const fetchedCategories = categorySnapshot.docs
                    .map((doc, index) => {
                        const data = doc.data();
                        const order =
                            typeof data.order === 'number'
                                ? data.order
                                : index;
                        return {
                            id: doc.id,
                            name: String(data.name || ''),
                            subcategories: Array.isArray(data.subcategories)
                                ? data.subcategories
                                : [],
                            order,
                        };
                    })
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                setProducts(allProducts);
                setCategories(fetchedCategories);
            } catch (err) {
                console.error("Error fetching products", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStorefrontData();
    }, []);

    const categoryMap = categories.reduce<Record<string, Category>>((acc, category) => {
        acc[category.id] = category;
        return acc;
    }, {});

    const visibleProducts = products.filter((p) => canSeeProduct(p, clientId));
    const featuredProducts = visibleProducts.slice(0, 2);
    const filtered = visibleProducts.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = !selectedCategoryId || product.categoryId === selectedCategoryId;
        const matchesSubcategory = !selectedSubcategory || product.subcategoryId === selectedSubcategory;

        return matchesSearch && matchesCategory && matchesSubcategory;
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between pb-6 border-b border-border">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Catálogo</h2>
                    <p className="text-muted-foreground">Tabela de Preços vinculada: Padrão B2B</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar produtos..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link href="/app/cart">
                        <Button variant="outline" className="relative">
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Carrinho
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </Button>
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Carregando catálogo...</div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <aside className="space-y-4 rounded-xl border border-border bg-card p-4 h-fit">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Categorias</h3>
                            {(selectedCategoryId || selectedSubcategory) && (
                                <button
                                    className="text-xs text-primary hover:underline"
                                    onClick={() => {
                                        setSelectedCategoryId('');
                                        setSelectedSubcategory('');
                                    }}
                                >
                                    Limpar filtros
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <button
                                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                                    !selectedCategoryId ? 'border-primary bg-primary/5 text-primary' : 'border-border'
                                }`}
                                onClick={() => {
                                    setSelectedCategoryId('');
                                    setSelectedSubcategory('');
                                }}
                            >
                                Todas as categorias
                            </button>

                            {categories.map((category) => (
                                <div key={category.id} className="rounded-lg border border-border p-2">
                                    <button
                                        className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${
                                            selectedCategoryId === category.id
                                                ? 'bg-primary/10 text-primary'
                                                : 'hover:bg-muted'
                                        }`}
                                        onClick={() => {
                                            setSelectedCategoryId(category.id);
                                            setSelectedSubcategory('');
                                        }}
                                    >
                                        {category.name}
                                    </button>

                                    {selectedCategoryId === category.id && category.subcategories.length > 0 && (
                                        <div className="mt-2 space-y-1 border-t border-border pt-2">
                                            {category.subcategories.map((subcategory) => (
                                                <button
                                                    key={subcategory}
                                                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                                                        selectedSubcategory === subcategory
                                                            ? 'bg-muted font-medium text-foreground'
                                                            : 'text-muted-foreground hover:bg-muted/60'
                                                    }`}
                                                    onClick={() => setSelectedSubcategory(subcategory)}
                                                >
                                                    {subcategory}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </aside>

                    <div className="space-y-6">
                        {featuredProducts.length >= 2 && !selectedCategoryId && !searchTerm && (
                            <div className="space-y-4 rounded-xl bg-primary/10 p-6 border border-primary/20">
                                <h3 className="text-lg font-semibold text-primary">Recomendados para você</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {featuredProducts.map((product) => (
                                        <StoreProductCard
                                            key={product.id}
                                            product={product}
                                            categoryName={categoryMap[product.categoryId || '']?.name}
                                            subcategoryName={product.subcategoryId}
                                            isFeatured
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <h3 className="text-lg font-semibold text-foreground">Todos os Produtos</h3>
                                <p className="text-sm text-muted-foreground">
                                    {filtered.length} produto(s) encontrado(s)
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filtered.map((product) => (
                                    <StoreProductCard
                                        key={product.id}
                                        product={product}
                                        categoryName={categoryMap[product.categoryId || '']?.name}
                                        subcategoryName={product.subcategoryId}
                                    />
                                ))}
                                {filtered.length === 0 && (
                                    <p className="col-span-full text-muted-foreground py-8 text-center">
                                        Nenhum produto encontrado.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
