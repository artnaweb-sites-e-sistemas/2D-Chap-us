export interface CartItem {
    id: string;      // Product ID
    name: string;
    price: number;
    qtde: number;
    minQt: number;
    multiple: number;
    imageUrl?: string;
    variationId?: string; // Optional: for Future color/size support
}

export interface ClientProfile {
    id: string; // The assigned client ID in Firestore
    priceTableId?: string; // Their assigned price table
    razaoSocial: string;
    cnpj: string;
    paymentMethods?: string[];
}
