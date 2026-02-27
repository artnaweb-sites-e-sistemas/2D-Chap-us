import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '@/types/store';

interface CartState {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, qtde: number) => void;
    clearCart: () => void;
    subtotal: number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (newItem) => set((state) => {
                const existingItem = state.items.find(i => i.id === newItem.id);
                if (existingItem) {
                    return {
                        items: state.items.map(i =>
                            i.id === newItem.id
                                ? { ...i, qtde: i.qtde + newItem.qtde }
                                : i
                        )
                    };
                }
                return { items: [...state.items, newItem] };
            }),

            removeItem: (id) => set((state) => ({
                items: state.items.filter(i => i.id !== id)
            })),

            updateQuantity: (id, qtde) => set((state) => ({
                items: state.items.map(i => i.id === id ? { ...i, qtde } : i)
            })),

            clearCart: () => set({ items: [] }),

            get subtotal() {
                return get().items.reduce((acc, item) => acc + (item.price * item.qtde), 0);
            }
        }),
        {
            name: 'b2b-cart-storage', // saves to localStorage
        }
    )
);
