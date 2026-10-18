'use client'

import { create } from 'zustand'

// Filtros de la vista principal (catálogo). Viven en un store zustand para
// que sobrevivan al unmount al navegar a un negocio y volver (SPA hash-router).
interface CatalogState {
  q: string
  categoryId: string
  setQ: (q: string) => void
  setCategoryId: (id: string) => void
}

export const useCatalogStore = create<CatalogState>((set) => ({
  q: '',
  categoryId: 'all',
  setQ: (q) => set({ q }),
  setCategoryId: (categoryId) => set({ categoryId }),
}))
