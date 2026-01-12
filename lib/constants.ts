// Constants to replace Prisma enums (SQLite doesn't support enums)

export const UserRole = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN_GUDANG: 'ADMIN_GUDANG',
  STAFF_GUDANG: 'STAFF_GUDANG',
} as const

export type UserRole = typeof UserRole[keyof typeof UserRole]

export const ItemCategory = {
  BAHAN_BAKU: 'BAHAN_BAKU',
  BARANG_JADI: 'BARANG_JADI',
} as const

export type ItemCategory = typeof ItemCategory[keyof typeof ItemCategory]

export const TransactionType = {
  MASUK: 'MASUK',
  KELUAR: 'KELUAR',
} as const

export type TransactionType = typeof TransactionType[keyof typeof TransactionType]

export const TransactionSource = {
  // For MASUK (Barang Masuk)
  PO: 'PO',                    // PO Pembelian Bahan Baku
  TRADING: 'TRADING',          // Trading Barang dari Vendor
  PRODUKSI: 'PRODUKSI',        // Barang yang diproduksi untuk di stok kembali
  // For KELUAR (Barang Keluar)
  ORDER_CUSTOMER: 'ORDER_CUSTOMER',  // Order Customer lewat web produksi
  BAHAN_BAKU: 'BAHAN_BAKU',          // Barang stok dijadikan bahan baku
  DAUR_ULANG: 'DAUR_ULANG',          // Barang di daur ulang kembali
} as const

export type TransactionSource = typeof TransactionSource[keyof typeof TransactionSource]

export const ProductionRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
} as const

export type ProductionRequestStatus = typeof ProductionRequestStatus[keyof typeof ProductionRequestStatus]

export const ProductGroup = {
  PLASTIK: 'PLASTIK',
  SEDOTAN: 'SEDOTAN',
  ADIKTIF: 'ADIKTIF',
} as const

export type ProductGroup = typeof ProductGroup[keyof typeof ProductGroup]

