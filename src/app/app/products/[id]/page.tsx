'use client';

import { Suspense, use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ProductRecord, ProductVariant } from '@/types/store';
import { getDefaultVariant, normalizeProduct } from '@/lib/commerce';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductPurchaseControls } from '@/features/storefront/components/ProductPurchaseControls';

interface CategoryRecord {
    id: string;
    name: string;
}

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Carregando produto...</div>}>
            <ProductDetailsContent paramsPromise={params} />
        </Suspense>
    );
}

function ProductDetailsContent({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
    const params = use(paramsPromise);
    const router = useRouter();
    const [product, setProduct] = useState<ProductRecord | null>(null);
    const [categories, setCategories] = useState<CategoryRecord[]>([]);
    const [selectedImage, setSelectedImage] = useState('');
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const [productSnap, categorySnap] = await Promise.all([
                    getDoc(doc(db, 'products', params.id)),
                    getDocs(collection(db, 'categories')),
                ]);

                if (!productSnap.exists()) {
                    setProduct(null);
                    return;
                }

                const normalized = normalizeProduct(productSnap.id, productSnap.data());
                setProduct(normalized);
                const defaultVariant = getDefaultVariant(normalized);
                setSelectedVariant(defaultVariant);
                const defaultImg = defaultVariant?.imageUrls?.[0] ?? defaultVariant?.imageUrl ?? normalized.images[0] ?? '';
                setSelectedImage(defaultImg);
                setCategories(
                    categorySnap.docs.map((category) => ({
                        id: category.id,
                        name: String(category.data().name || ''),
                    }))
                );
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [params.id]);

    const categoryName = useMemo(
        () => categories.find((category) => category.id === product?.categoryId)?.name,
        [categories, product]
    );

    const gallery = useMemo(() => {
        if (!product) return [];
        const images = (selectedVariant?.imageUrls?.length
            ? selectedVariant.imageUrls
            : selectedVariant?.imageUrl
                ? [selectedVariant.imageUrl]
                : product.images
        ).filter(Boolean);
        return images;
    }, [selectedVariant, product?.images]);

    const mainImage = selectedImage || gallery[0];

    const handlePrevImage = () => {
        if (gallery.length < 2) return;
        const currentIndex = gallery.indexOf(mainImage);
        const prevIndex = (currentIndex - 1 + gallery.length) % gallery.length;
        setSelectedImage(gallery[prevIndex]);
    };

    const handleNextImage = () => {
        if (gallery.length < 2) return;
        const currentIndex = gallery.indexOf(mainImage);
        const nextIndex = (currentIndex + 1) % gallery.length;
        setSelectedImage(gallery[nextIndex]);
    };

    const handleVariantChange = useCallback((variant?: ProductVariant) => {
        setSelectedVariant(variant);
        const first = variant?.imageUrls?.[0] ?? variant?.imageUrl;
        if (first) {
            setSelectedImage(first);
        }
    }, []);

    if (loading) {
        return <div className="py-12 text-center text-muted-foreground">Carregando produto...</div>;
    }

    if (!product) {
        return (
            <div className="space-y-4 rounded-xl border border-border bg-card p-8 text-center">
                <h2 className="text-xl font-semibold text-foreground">Produto não encontrado</h2>
                <Link
                    href="/app"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o catálogo
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <Link
                    href="/app"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o catálogo
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {categoryName && <span>{categoryName}</span>}
                    {product.subcategoryId && (
                        <>
                            <span>/</span>
                            <span>{product.subcategoryId}</span>
                        </>
                    )}
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{product.name}</h1>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="space-y-4">
                    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        {mainImage ? (
                            <>
                                <img src={mainImage} alt={product.name} className="aspect-square w-full object-cover transition-all duration-500" />
                                
                                {gallery.length > 1 && (
                                    <>
                                        <button 
                                            onClick={handlePrevImage}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-110 opacity-0 group-hover:opacity-100"
                                            aria-label="Imagem anterior"
                                        >
                                            <ChevronLeft className="h-6 w-6 text-foreground" />
                                        </button>
                                        <button 
                                            onClick={handleNextImage}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-110 opacity-0 group-hover:opacity-100"
                                            aria-label="Próxima imagem"
                                        >
                                            <ChevronRight className="h-6 w-6 text-foreground" />
                                        </button>
                                        
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {gallery.map((_, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className={`h-1.5 rounded-full transition-all ${gallery.indexOf(mainImage) === idx ? 'w-6 bg-primary' : 'w-1.5 bg-white/60'}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
                                Sem foto cadastrada
                            </div>
                        )}
                    </div>

                    {gallery.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide overscroll-x-contain">
                            {gallery.map((image, idx) => (
                                <button
                                    key={`thumb-${idx}`}
                                    type="button"
                                    className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer select-none ${
                                        (selectedImage === image || (!selectedImage && idx === 0)) ? 'border-primary ring-2 ring-primary/20 scale-95' : 'border-border hover:border-primary/50'
                                    }`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedImage(image);
                                    }}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <img src={image} alt={`${product.name} - foto ${idx + 1}`} className="h-full w-full object-cover pointer-events-none" />
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                        <h2 className="text-lg font-semibold text-foreground">Detalhes do produto</h2>
                        {product.description ? (
                            <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                                {product.description}
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Este produto ainda não possui uma descrição detalhada.
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 space-y-6 h-fit">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Comprar produto</h2>
                        <p className="text-sm text-muted-foreground">
                            Escolha a cor desejada, ajuste a quantidade e adicione ao carrinho.
                        </p>
                    </div>

                    <ProductPurchaseControls
                        product={product}
                        onVariantChange={handleVariantChange}
                        onAfterAdd={() => router.push('/app/cart')}
                    />
                </div>
            </div>
        </div>
    );
}
