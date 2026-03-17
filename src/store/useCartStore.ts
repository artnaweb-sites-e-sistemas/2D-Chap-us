import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CartItem } from '@/types/store';

const cartStorage = typeof window !== 'undefined'
    ? createJSONStorage<{ items: CartItem[] }>(() => localStorage)
    : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
      };

function snapToValidMultiple(qtde: number, minQt: number, multiple?: number): number {
    if (!Number.isFinite(qtde) || qtde < 0) return minQt;
    const mult = multiple || 1;
    if (mult <= 1) return Math.max(minQt, Math.round(qtde));
    const smallest = Math.ceil(minQt / mult) * mult;
    const candidate = Math.round(qtde / mult) * mult;
    return Math.max(smallest, candidate);
}

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
                    const mergedQtde = snapToValidMultiple(
                        existingItem.qtde + newItem.qtde,
                        existingItem.minQt,
                        existingItem.multiple
                    );
                    return {
                        items: state.items.map(i =>
                            i.id === newItem.id ? { ...i, qtde: mergedQtde } : i
                        )
                    };
                }
                return { items: [...state.items, newItem] };
            }),

            removeItem: (id) => set((state) => ({
                items: state.items.filter(i => i.id !== id)
            })),

            updateQuantity: (id, qtde) => set((state) => ({
                items: state.items.map(i => {
                    if (i.id !== id) return i;
                    const validQtde = snapToValidMultiple(qtde, i.minQt, i.multiple);
                    return { ...i, qtde: validQtde };
                })
            })),

            clearCart: () => set({ items: [] }),

            get subtotal() {
                return get().items.reduce((acc, item) => acc + (item.price * item.qtde), 0);
            }
        }),
        {
            name: 'b2b-cart-storage',
            storage: cartStorage,
            partialize: (state) => ({ items: state.items }),
        }
    )
);
