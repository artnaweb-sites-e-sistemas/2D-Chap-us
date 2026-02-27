'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ShoppingCart, Search } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCartStore } from '@/store/useCartStore';

interface Product {
    id: string;
    name: string;
    description?: string;
    categoryId?: string;
    basePrice: number;
    minQuantity: number;
    multiple: number;
    images?: string[];
}

export default function ClientPortalDashboard() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const items = useCartStore((state) => state.items);
    const cartCount = items.reduce((acc, current) => acc + current.qtde, 0);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'products'));
                const fetchedProducts: Product[] = [];
                querySnapshot.forEach((doc) => {
                    fetchedProducts.push({ id: doc.id, ...doc.data() } as Product);
                });
                setProducts(fetchedProducts);
            } catch (err) {
                console.error("Error fetching products", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
                <>
                    {/* Recomendados - Just taking the first 2 as an MVP example */}
                    {products.length >= 2 && (
                        <div className="space-y-4 rounded-xl bg-primary/10 p-6 border border-primary/20">
                            <h3 className="text-lg font-semibold text-primary">Recomendados para você</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ProductCard product={products[0]} isFeatured />
                                <ProductCard product={products[1]} isFeatured />
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">Todos os Produtos</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                            {filtered.length === 0 && (
                                <p className="col-span-full text-muted-foreground py-8 text-center">Nenhum produto encontrado.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function ProductCard({ product, isFeatured = false }: { product: Product, isFeatured?: boolean }) {
    const addItem = useCartStore((state) => state.addItem);
    const [qtde, setQtde] = useState(product.minQuantity || 1);

    const handleAdd = () => {
        if (qtde < (product.minQuantity || 1)) {
            alert(`Quantidade mínima é ${product.minQuantity || 1}`);
            return;
        }
        if (product.multiple && qtde % product.multiple !== 0) {
            alert(`Este produto é vendido em múltiplos de ${product.multiple}`);
            return;
        }

        addItem({
            id: product.id,
            name: product.name,
            price: product.basePrice,
            qtde: qtde,
            minQt: product.minQuantity || 1,
            multiple: product.multiple || 1,
            imageUrl: product.images?.[0]
        });

    };

    return (
        <div className={`bg-card rounded-xl border ${isFeatured ? 'border-primary/30 shadow-md' : 'border-border shadow-sm'} overflow-hidden flex flex-col`}>
            <div className="aspect-square bg-muted flex flex-col items-center justify-center text-muted-foreground overflow-hidden">
                {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-sm">Sem Foto</span>
                )}
            </div>
            <div className="p-4 flex flex-col flex-1">
                <h4 className="font-medium text-foreground line-clamp-2 min-h-[40px] mt-1">{product.name}</h4>

                <div className="mt-4 mb-4 flex items-end justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Unidade</p>
                        <p className="text-lg font-bold text-foreground">R$ {(product.basePrice || 0).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Venda min: {product.minQuantity || 1}</p>
                        <p className="text-xs text-muted-foreground">Múltiplo: {product.multiple || 1}</p>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex gap-2">
                    <Input
                        type="number"
                        min={product.minQuantity || 1}
                        step={product.multiple || 1}
                        value={qtde}
                        onChange={e => setQtde(Number(e.target.value))}
                        className="w-20"
                    />
                    <Button onClick={handleAdd} className="flex-1">Adicionar</Button>
                </div>
            </div>
        </div>
    );
}
