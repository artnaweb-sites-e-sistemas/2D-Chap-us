'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductRecord, ProductVariant } from '@/types/store';
import { ProductPurchaseControls } from '@/features/storefront/components/ProductPurchaseControls';
import { getDefaultVariant } from '@/lib/commerce';

interface StoreProductCardProps {
    product: ProductRecord;
    categoryName?: string;
    subcategoryName?: string;
    isFeatured?: boolean;
}

export function StoreProductCard({
    product,
    categoryName,
    subcategoryName,
    isFeatured = false,
}: StoreProductCardProps) {
    const defaultVariant = useMemo(() => getDefaultVariant(product), [product]);
    const [previewVariant, setPreviewVariant] = useState<ProductVariant | undefined>(defaultVariant);
    const [previewImageIndex, setPreviewImageIndex] = useState(0);

    const images = useMemo(() => {
        const urls = previewVariant?.imageUrls?.length
            ? previewVariant.imageUrls
            : previewVariant?.imageUrl
                ? [previewVariant.imageUrl]
                : product.images || [];
        return urls.filter(Boolean);
    }, [previewVariant, product.images]);

    useEffect(() => {
        setPreviewImageIndex(0);
    }, [previewVariant?.id]);

    const displayImage = images[previewImageIndex] ?? images[0];
    const hasMultipleImages = images.length > 1;

    const handlePrevImage = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (images.length < 2) return;
        setPreviewImageIndex((i) => (i - 1 + images.length) % images.length);
    }, [images.length]);

    const handleNextImage = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (images.length < 2) return;
        setPreviewImageIndex((i) => (i + 1) % images.length);
    }, [images.length]);

    return (
        <div
            className={`flex h-full flex-col overflow-hidden rounded-xl border bg-card ${
                isFeatured ? 'border-primary/30 shadow-md' : 'border-border shadow-sm'
            }`}
        >
            <div className="group relative aspect-square overflow-hidden bg-muted">
                {displayImage ? (
                    <>
                        <Link href={`/app/products/${product.id}`} className="block h-full w-full">
                            <img
                                src={displayImage}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        </Link>
                        {hasMultipleImages && (
                            <>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={handlePrevImage}
                                    className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/95 p-1.5 shadow-md opacity-100 transition hover:bg-white hover:scale-105"
                                    aria-label="Foto anterior"
                                >
                                    <ChevronLeft className="h-5 w-5 text-foreground" />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    onClick={handleNextImage}
                                    className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/95 p-1.5 shadow-md opacity-100 transition hover:bg-white hover:scale-105"
                                    aria-label="Próxima foto"
                                >
                                    <ChevronRight className="h-5 w-5 text-foreground" />
                                </button>
                                <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 flex gap-1">
                                    {images.map((_, idx) => (
                                        <span
                                            key={idx}
                                            className={`block h-1 rounded-full transition-all ${
                                                idx === previewImageIndex ? 'w-3 bg-primary' : 'w-1 bg-white/70'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                ) : (
                    <Link href={`/app/products/${product.id}`} className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Sem foto
                    </Link>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {categoryName && (
                            <span className="rounded-full bg-muted px-2 py-1">{categoryName}</span>
                        )}
                        {subcategoryName && (
                            <span className="rounded-full bg-muted px-2 py-1">{subcategoryName}</span>
                        )}
                    </div>

                    <Link href={`/app/products/${product.id}`} className="block">
                        <h4 className="min-h-[40px] line-clamp-2 font-medium text-foreground hover:text-primary">
                            {product.name}
                        </h4>
                    </Link>

                    {product.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                            {product.description}
                        </p>
                    )}

                    {(previewVariant?.imageUrls?.length ?? 0) > 1 && (
                        <p className="text-xs font-medium text-primary">
                            {(previewVariant?.imageUrls?.length ?? 0)} fotos nesta cor
                        </p>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                    <ProductPurchaseControls product={product} compact onVariantChange={setPreviewVariant} />
                </div>
            </div>
        </div>
    );
}
