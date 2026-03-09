import {
    CartItem,
    ProductRecord,
    ProductVariationGroup,
    ProductVariant,
    SettingOption,
} from '@/types/store';

type UnknownRecord = Record<string, unknown>;
type OrderItemLike = {
    total?: number;
    unitPrice?: number;
    price?: number;
    quantity?: number;
    qtde?: number;
};

const slugify = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

export const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const parseCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return 0;
    return parseFloat(numericValue) / 100;
};

export const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    return formatCurrency(parseFloat(numericValue) / 100);
};

export const normalizeSettingOptions = (
    options: Array<Record<string, unknown>> = []
): SettingOption[] =>
    options.map((option) => ({
        id: String(option?.id || Date.now()),
        label: String(option?.label || ''),
        active: option?.active !== false,
    }));

export const buildVariantId = (groupValues: Record<string, string>) => {
    const serialized = Object.entries(groupValues)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([groupId, value]) => `${groupId}:${slugify(value)}`)
        .join('|');

    return serialized || `variant-${Date.now()}`;
};

export const buildVariantName = (
    groupValues: Record<string, string>,
    groups: ProductVariationGroup[]
) =>
    groups
        .map((group) => groupValues[group.id])
        .filter(Boolean)
        .join(' / ');

const toPositiveNumber = (value: unknown, fallback = 0) => {
    const parsed = typeof value === 'string' ? Number(value) : Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const generateVariantsFromGroups = (
    groups: ProductVariationGroup[],
    existingVariants: ProductVariant[] = [],
    defaults?: { basePrice?: number; minQty?: number; saleMultiple?: number }
): ProductVariant[] => {
    const validGroups = groups.filter(
        (group) => group.name.trim() && group.values.filter(Boolean).length > 0
    );

    if (validGroups.length === 0) {
        return [];
    }

    const combinations = validGroups.reduce<Record<string, string>[]>(
        (acc, group) => {
            const values = group.values.filter(Boolean);
            if (acc.length === 0) {
                return values.map((value) => ({ [group.id]: value }));
            }

            return acc.flatMap((combo) =>
                values.map((value) => ({ ...combo, [group.id]: value }))
            );
        },
        []
    );

    return combinations.map((optionValues) => {
        const id = buildVariantId(optionValues);
        const existing = existingVariants.find((variant) => variant.id === id);
        const name = buildVariantName(optionValues, validGroups);

        return {
            id,
            name,
            sku: existing?.sku || `SKU-${slugify(name).toUpperCase()}` || `SKU-${Date.now()}`,
            optionValues,
            colorHex: existing?.colorHex || '#D4D4D8',
            price: existing?.price ?? defaults?.basePrice,
            minQty: existing?.minQty ?? defaults?.minQty ?? 1,
            saleMultiple: existing?.saleMultiple ?? defaults?.saleMultiple ?? 1,
            imageUrls: existing?.imageUrls ?? (existing?.imageUrl ? [existing.imageUrl] : []),
            imageUrl: existing?.imageUrls?.[0] ?? existing?.imageUrl ?? '',
            active: existing?.active ?? true,
        };
    });
};

export const normalizeProduct = (id: string, data: UnknownRecord): ProductRecord => {
    const minQty = toPositiveNumber(data.minQty ?? data.minQuantity, 1) || 1;
    const saleMultiple = toPositiveNumber(data.saleMultiple ?? data.multiple, 1) || 1;

    const variationGroups = Array.isArray(data.variationGroups)
        ? (data.variationGroups as Array<Record<string, unknown>>).map((group, index: number) => ({
            id: String(group?.id || `group-${index + 1}`),
            name: String(group?.name || ''),
            values: Array.isArray(group?.values)
                ? group.values.map((value: unknown) => String(value || '')).filter(Boolean)
                : [],
        }))
        : [];

    let variants: ProductVariant[] = [];

    if (Array.isArray(data.variants) && data.variants.length > 0) {
        variants = (data.variants as Array<Record<string, unknown>>).map((variant, index: number) => ({
            id: String(variant?.id || `variant-${index + 1}`),
            name: String(variant?.name || ''),
            sku: String(variant?.sku || `SKU-${index + 1}`),
            optionValues:
                variant?.optionValues && typeof variant.optionValues === 'object'
                    ? (variant.optionValues as Record<string, string>)
                    : { color: String(variant?.name || `Cor ${index + 1}`) },
            colorHex: String(variant?.colorHex || ''),
            price: toPositiveNumber(variant?.price, toPositiveNumber(data.basePrice, 0)),
            minQty: toPositiveNumber(variant?.minQty, minQty),
            saleMultiple: toPositiveNumber(variant?.saleMultiple, saleMultiple),
            imageUrls: Array.isArray(variant?.imageUrls)
                ? (variant.imageUrls as string[]).filter(Boolean)
                : variant?.imageUrl
                    ? [String(variant.imageUrl)]
                    : [],
            imageUrl: Array.isArray(variant?.imageUrls)
                ? (variant.imageUrls as string[])[0]
                : String(variant?.imageUrl || ''),
            active: variant?.active !== false,
        }));
    } else if (Array.isArray(data.variations) && data.variations.length > 0) {
        variants = (data.variations as Array<Record<string, unknown>>).map((variant, index: number) => ({
            id: String(variant?.id || variant?.sku || `legacy-${index + 1}`),
            name: String(variant?.name || `Variação ${index + 1}`),
            sku: String(variant?.sku || `SKU-${index + 1}`),
            optionValues: { color: String(variant?.name || `Cor ${index + 1}`) },
            colorHex: String(variant?.colorHex || ''),
            price: toPositiveNumber(data.basePrice, 0),
            minQty,
            saleMultiple,
            imageUrls: [],
            imageUrl: '',
            active: true,
        }));
    }

    return {
        id,
        name: String(data.name || 'Produto sem nome'),
        description: String(data.description || ''),
        categoryId: String(data.categoryId || ''),
        subcategoryId: String(data.subcategoryId || ''),
        basePrice: toPositiveNumber(data.basePrice, 0),
        minQty,
        saleMultiple,
        images: Array.isArray(data.images) ? data.images.filter(Boolean) : [],
        status: String(data.status || 'ativo'),
        variationGroups,
        variants,
    };
};

export const getActiveVariants = (product: ProductRecord) =>
    product.variants.filter((variant) => variant.active !== false);

export const getDefaultVariant = (product: ProductRecord) =>
    getActiveVariants(product)[0];

export const getVariantPrice = (product: ProductRecord, variant?: ProductVariant) =>
    variant?.price || product.basePrice || 0;

export const getVariantMinQty = (product: ProductRecord, variant?: ProductVariant) =>
    variant?.minQty || product.minQty || 1;

export const getVariantSaleMultiple = (product: ProductRecord, variant?: ProductVariant) =>
    variant?.saleMultiple || product.saleMultiple || 1;

export const getVariantColorLabel = (variant?: ProductVariant) =>
    variant?.optionValues?.color || variant?.name || '';

export const buildCartItemId = (productId: string, variationId?: string) =>
    variationId ? `${productId}:${variationId}` : productId;

export const buildCartItem = (product: ProductRecord, qtde: number, variant?: ProductVariant): CartItem => ({
    id: buildCartItemId(product.id, variant?.id),
    productId: product.id,
    name: product.name,
    price: getVariantPrice(product, variant),
    qtde,
    minQt: getVariantMinQty(product, variant),
    multiple: getVariantSaleMultiple(product, variant),
    imageUrl: (variant?.imageUrls?.[0] ?? variant?.imageUrl) || product.images[0],
    variationId: variant?.id,
    variationName: variant?.name,
    sku: variant?.sku,
});

export const getOrderSubtotal = (items: OrderItemLike[] = []) =>
    items.reduce(
        (acc, item) => acc + (item.total || (item.unitPrice || item.price || 0) * (item.quantity || item.qtde || 0)),
        0
    );
