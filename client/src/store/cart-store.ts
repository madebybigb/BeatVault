import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '@shared/schema';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (beatId: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      
      addItem: (item) => {
        const items = get().items;
        const existingItem = items.find(i => i.beatId === item.beatId);
        
        if (!existingItem) {
          set({ items: [...items, item] });
        }
      },
      
      removeItem: (beatId) => {
        set({ items: get().items.filter(item => item.beatId !== beatId) });
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      toggleCart: () => {
        set({ isOpen: !get().isOpen });
      },
      
      setItems: (items) => {
        set({ items });
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
