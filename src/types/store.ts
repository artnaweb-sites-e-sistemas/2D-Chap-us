export interface SettingOption {
    id: string;
    label: string;
    active: boolean;
}

export interface ProductVariationGroup {
    id: string;
    name: string;
    values: string[];
}

export interface ProductVariant {
    id: string;
    name: string;
    sku: string;
    optionValues: Record<string, string>;
    colorHex?: string;
    price?: number;
    minQty?: number;
    saleMultiple?: number;
    /** Uma ou mais imagens desta cor; na vitrine o cliente vê a galeria da cor selecionada */
    imageUrls?: string[];
    /** @deprecated Use imageUrls[0]; mantido para compatibilidade */
    imageUrl?: string;
    active?: boolean;
}

export interface ProductRecord {
    id: string;
    name: string;
    description?: string;
    categoryId?: string;
    subcategoryId?: string;
    basePrice: number;
    minQty: number;
    saleMultiple: number;
    images: string[];
    status: string;
    variationGroups: ProductVariationGroup[];
    variants: ProductVariant[];
}

export interface CartItem {
    id: string;
    productId: string;
    name: string;
    price: number;
    qtde: number;
    minQt: number;
    multiple: number;
    imageUrl?: string;
    variationId?: string;
    variationName?: string;
    sku?: string;
}

export interface DeliveryAddress {
    cep?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    uf?: string;
    complement?: string;
    reference?: string;
}

export interface ClientProfile {
    id: string;
    email?: string;
    priceTableId?: string;
    razaoSocial: string;
    cnpj: string;
    paymentMethods?: string[];
    paymentMethod?: string;
    carrier?: string;
    creditLimit?: number;
    minimumOrderValue?: number;
    notes?: string;
    deliveryAddress?: DeliveryAddress;
}

export interface OrderItemRecord {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    variationId?: string | null;
    variationName?: string;
    sku?: string;
    imageUrl?: string;
}

export interface OrderHistoryEntry {
    status: string;
    changedBy: string;
    timestamp: string;
}

export interface OrderRecord {
    id: string;
    userId: string;
    clientId?: string | null;
    clientName?: string;
    items: OrderItemRecord[];
    subtotal: number;
    freight: number;
    total: number;
    status: string;
    paymentMethod?: string;
    carrier?: string;
    deliveryLeadTime?: string;
    minimumOrderValue?: number;
    deliveryAddress?: DeliveryAddress | null;
    observations?: string;
    createdAt?: { seconds: number; toDate?: () => Date };
    history?: OrderHistoryEntry[];
}
