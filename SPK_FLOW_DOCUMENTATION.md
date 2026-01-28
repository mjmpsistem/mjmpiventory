# Dokumentasi Flow SPK dengan Sistem Reservasi Stok

## Overview

Dokumen ini menjelaskan alur lengkap pengelolaan SPK (Surat Perintah Kerja) dengan sistem reservasi stok yang aman untuk mencegah double booking dan stok minus.

## Konsep Dasar

### 1. Stok Fisik vs Stok Tersedia

- **`currentStock`**: Stok fisik yang benar-benar ada di gudang
- **`reservedStock`**: Stok yang sudah di-reserve oleh SPK dengan status `IN_PROGRESS`
- **Available Stock**: `currentStock - reservedStock` (stok yang benar-benar tersedia untuk SPK baru)

### 2. Status SPK

- **QUEUE**: SPK belum deal / belum diproses
- **IN_PROGRESS**: SPK sudah deal dengan client, stok di-reserve
- **QC_CHECK**: Barang sedang dalam proses quality check
- **COMPLETED**: SPK selesai
- **CANCELLED**: SPK dibatalkan

### 3. Fulfillment Method

- **FROM_STOCK**: Barang diambil dari stok gudang
- **PRODUCTION**: Barang harus diproduksi terlebih dahulu
- **TRADING**: Barang dibeli dari vendor

### 4. Fulfillment Status (untuk SpkItem)

- **PENDING**: Belum di-reserve (SPK masih QUEUE)
- **RESERVED**: Stok sudah di-reserve (SPK IN_PROGRESS, stok dikunci tapi belum diambil)
- **FULFILLED**: Barang sudah diambil dari gudang (stok fisik sudah dikurangi)
- **CANCELLED**: SPK dibatalkan, reserved stock sudah di-release

## Flow Lengkap

### Flow 1: SPK Baru Dibuat (Status: QUEUE)

**Kondisi Awal:**
- SPK dibuat dengan status `QUEUE`
- Semua SpkItem memiliki `fulfillmentStatus = PENDING`
- Stok belum di-reserve

**Aksi:**
1. Admin membuat SPK baru melalui API `POST /api/spk`
2. Untuk setiap SpkItem:
   - Jika `fulfillmentMethod = FROM_STOCK`, harus link ke `itemId` (Item inventory)
   - Jika `fulfillmentMethod = PRODUCTION`, `itemId` bisa null

**Hasil:**
- SPK tersimpan dengan status `QUEUE`
- Stok belum terpengaruh
- SPK belum muncul di halaman produksi (karena belum IN_PROGRESS)

---

### Flow 2: SPK Berubah ke IN_PROGRESS

**Kondisi Awal:**
- SPK dengan status `QUEUE`
- Stok belum di-reserve

**Aksi:**
1. Admin mengubah status SPK menjadi `IN_PROGRESS` melalui API `PUT /api/spk/[id]` dengan `{ status: "IN_PROGRESS" }`
2. Sistem melakukan validasi dan reservasi stok:
   - Untuk setiap SpkItem dengan `fulfillmentMethod = FROM_STOCK`:
     - Cek `availableStock = currentStock - reservedStock`
     - Jika `availableStock < qty`, throw error (stok tidak cukup)
     - Jika cukup, panggil `reserveStock()`:
       - `reservedStock += qty` (tidak mengurangi `currentStock`)
       - Update `fulfillmentStatus = RESERVED`
   - Untuk SpkItem dengan `fulfillmentMethod = PRODUCTION`:
     - Tidak ada reservasi stok (karena belum ada barang jadi)
     - `fulfillmentStatus` tetap `PENDING`
     - SPK akan muncul di halaman Permintaan Produksi

**Hasil:**
- SPK status menjadi `IN_PROGRESS`
- Item FROM_STOCK: `reservedStock` meningkat, `currentStock` tetap
- Item FROM_STOCK: `fulfillmentStatus = RESERVED`
- Stok tersebut TIDAK bisa digunakan SPK lain (karena `availableStock` berkurang)
- Item PRODUCTION: Siap untuk dibuat ProductionRequest

**Contoh:**
```
Sebelum:
- Item A: currentStock = 100, reservedStock = 0
- Available Stock = 100

SPK-001 (qty: 30) → IN_PROGRESS:
- Item A: currentStock = 100, reservedStock = 30
- Available Stock = 70 (bisa digunakan SPK lain)

SPK-002 (qty: 50) → IN_PROGRESS:
- Item A: currentStock = 100, reservedStock = 80
- Available Stock = 20 (bisa digunakan SPK lain)
```

---

### Flow 3: Item FROM_STOCK Diambil dari Gudang (Fulfill)

**Kondisi Awal:**
- SPK dengan status `IN_PROGRESS`
- Item FROM_STOCK dengan `fulfillmentStatus = RESERVED`
- Stok sudah di-reserve tapi belum diambil fisik

**Aksi:**
1. Staff gudang mengambil barang fisik dari gudang
2. Staff memanggil API `POST /api/spk/[id]/fulfill` dengan `{ spkItemIds: [...] }`
3. Sistem melakukan fulfill:
   - Untuk setiap SpkItem yang di-fulfill:
     - Panggil `fulfillReservedStock()`:
       - `reservedStock -= qty`
       - `currentStock -= qty`
       - Update `fulfillmentStatus = FULFILLED`
     - Buat Transaction record (type: KELUAR, source: ORDER_CUSTOMER)
     - Buat StockHistory

**Hasil:**
- Stok fisik benar-benar berkurang
- Reserved stock juga berkurang
- Item status menjadi `FULFILLED`
- Ada record transaksi dan history

**Contoh:**
```
Sebelum Fulfill:
- Item A: currentStock = 100, reservedStock = 30
- Available Stock = 70

Fulfill SPK-001 (qty: 30):
- Item A: currentStock = 70, reservedStock = 0
- Available Stock = 70
```

---

### Flow 4: Item PRODUCTION - Buat ProductionRequest

**Kondisi Awal:**
- SPK dengan status `IN_PROGRESS`
- SpkItem dengan `fulfillmentMethod = PRODUCTION`
- `fulfillmentStatus = PENDING`

**Aksi:**
1. Admin membuat ProductionRequest melalui API `POST /api/production-requests`
2. ProductionRequest dibuat dengan status `PENDING`
3. ProductionRequest berisi bahan baku yang dibutuhkan

**Hasil:**
- ProductionRequest muncul di halaman Permintaan Produksi
- Menunggu approval

---

### Flow 5: Item PRODUCTION - Approve ProductionRequest

**Kondisi Awal:**
- ProductionRequest dengan status `PENDING`
- Bahan baku belum dikurangi

**Aksi:**
1. Admin approve ProductionRequest melalui API `POST /api/production-requests/[id]/approve`
2. Sistem mengurangi stok bahan baku:
   - Untuk setiap ProductionRequestItem:
     - Kurangi `currentStock` bahan baku (bukan reservedStock, karena ini bahan baku)
     - Buat Transaction (type: KELUAR, source: BAHAN_BAKU)
     - Buat StockHistory

**Hasil:**
- ProductionRequest status menjadi `APPROVED`
- Stok bahan baku berkurang
- Produksi bisa dimulai

**Catatan:**
- Bahan baku langsung dikurangi saat approve (tidak ada reservasi)
- Ini berbeda dengan barang jadi yang di-reserve dulu

---

### Flow 6: Item PRODUCTION - Produksi Selesai, Barang Masuk Gudang

**Kondisi Awal:**
- Produksi selesai
- Barang jadi sudah dibuat

**Aksi:**
1. Staff mencatat barang jadi masuk gudang
2. Sistem menambah stok barang jadi:
   - Tambah `currentStock` barang jadi
   - Buat Transaction (type: MASUK, source: PRODUKSI)
   - Buat StockHistory

**Hasil:**
- Barang jadi tersedia di gudang
- Bisa diambil untuk SPK (jika FROM_STOCK) atau langsung fulfill untuk SPK yang memproduksi

**Catatan:**
- Jika barang produksi langsung untuk SPK tertentu, bisa langsung fulfill tanpa masuk stok dulu

---

### Flow 7: SPK Dibatalkan (CANCELLED)

**Kondisi Awal:**
- SPK dengan status `IN_PROGRESS`
- Item FROM_STOCK dengan `fulfillmentStatus = RESERVED` (belum diambil)

**Aksi:**
1. Admin mengubah status SPK menjadi `CANCELLED` melalui API `PUT /api/spk/[id]` dengan `{ status: "CANCELLED" }`
2. Sistem me-release reserved stock:
   - Untuk setiap SpkItem dengan `fulfillmentMethod = FROM_STOCK` dan `fulfillmentStatus = RESERVED`:
     - Panggil `releaseReservedStock()`:
       - `reservedStock -= qty` (tidak mengubah `currentStock`)
       - Update `fulfillmentStatus = CANCELLED`
   - Untuk SpkItem yang sudah `FULFILLED`:
     - Tidak di-release (karena sudah diambil fisik)
     - Tetap `FULFILLED`

**Hasil:**
- Reserved stock di-release
- Stok kembali tersedia untuk SPK lain
- Item status menjadi `CANCELLED` (jika belum FULFILLED)

**Contoh:**
```
Sebelum Cancel:
- Item A: currentStock = 100, reservedStock = 30
- Available Stock = 70

Cancel SPK-001 (qty: 30, status: RESERVED):
- Item A: currentStock = 100, reservedStock = 0
- Available Stock = 100 (kembali tersedia)
```

**Catatan:**
- Jika item sudah `FULFILLED`, tidak bisa di-cancel (karena sudah diambil fisik)
- Untuk membatalkan item yang sudah FULFILLED, perlu transaksi terpisah (return barang)

---

### Flow 8: ProductionRequest Ditolak (REJECTED)

**Kondisi Awal:**
- ProductionRequest dengan status `PENDING` atau `APPROVED`

**Aksi:**
1. Admin reject ProductionRequest melalui API `POST /api/production-requests/[id]/reject`
2. Jika status masih `PENDING`:
   - Tidak ada yang perlu di-release (karena belum ada stok yang dikurangi)
3. Jika status sudah `APPROVED`:
   - **PENTING**: Bahan baku yang sudah dikurangi TIDAK otomatis dikembalikan
   - Perlu transaksi manual untuk return bahan baku (jika masih bisa dikembalikan)

**Hasil:**
- ProductionRequest status menjadi `REJECTED`
- SPK tetap `IN_PROGRESS` (karena reject production request tidak membatalkan SPK)

**Catatan:**
- Reject ProductionRequest tidak otomatis membatalkan SPK
- Jika ingin membatalkan SPK, harus ubah status SPK ke `CANCELLED`

---

## Ringkasan Perubahan Stok

### Item FROM_STOCK

| Event | currentStock | reservedStock | Available Stock | fulfillmentStatus |
|-------|-------------|---------------|-----------------|-------------------|
| SPK Created (QUEUE) | 100 | 0 | 100 | PENDING |
| SPK → IN_PROGRESS | 100 | 30 | 70 | RESERVED |
| Item Fulfilled | 70 | 0 | 70 | FULFILLED |
| SPK Cancelled (sebelum fulfill) | 100 | 0 | 100 | CANCELLED |

### Item PRODUCTION

| Event | Bahan Baku Stock | Barang Jadi Stock | fulfillmentStatus |
|-------|------------------|-------------------|-------------------|
| SPK Created (QUEUE) | 100 | 0 | PENDING |
| SPK → IN_PROGRESS | 100 | 0 | PENDING |
| ProductionRequest Created | 100 | 0 | PENDING |
| ProductionRequest Approved | 70 (dikurangi) | 0 | PENDING |
| Produksi Selesai | 70 | 50 (barang jadi masuk) | PENDING |
| Item Fulfilled | 70 | 0 (dikurangi untuk SPK) | FULFILLED |

## API Endpoints

### 1. GET /api/spk
Mendapatkan daftar SPK (dengan filter status opsional)

### 2. POST /api/spk
Membuat SPK baru
```json
{
  "leadId": 1,
  "tglSpk": "2026-01-15T00:00:00Z",
  "deadline": "2026-01-30T00:00:00Z",
  "catatan": "Catatan SPK",
  "spkItems": [
    {
      "salesOrderId": 1,
      "namaBarang": "Barang A",
      "qty": 30,
      "satuan": "pcs",
      "fulfillmentMethod": "FROM_STOCK",
      "itemId": "uuid-item-a"
    },
    {
      "salesOrderId": 2,
      "namaBarang": "Barang B",
      "qty": 50,
      "satuan": "pcs",
      "fulfillmentMethod": "PRODUCTION",
      "itemId": null
    }
  ]
}
```

### 3. GET /api/spk/[id]
Mendapatkan detail SPK

### 4. PUT /api/spk/[id]
Update SPK (termasuk update status)
```json
{
  "status": "IN_PROGRESS",
  "deadline": "2026-01-30T00:00:00Z",
  "catatan": "Updated catatan"
}
```

**Perilaku saat update status:**
- `IN_PROGRESS`: Otomatis reserve stok untuk item FROM_STOCK
- `CANCELLED`: Otomatis release reserved stock untuk item FROM_STOCK yang masih RESERVED

### 5. POST /api/spk/[id]/fulfill
Fulfill item FROM_STOCK (mengambil barang dari gudang)
```json
{
  "spkItemIds": ["uuid-spk-item-1", "uuid-spk-item-2"]
}
```

## Validasi dan Error Handling

### 1. Validasi Stok Saat IN_PROGRESS
- Cek `availableStock = currentStock - reservedStock`
- Jika `availableStock < qty`, throw error dengan pesan jelas
- Validasi dilakukan dalam transaction untuk atomicity

### 2. Validasi Saat Fulfill
- Hanya bisa fulfill item dengan `fulfillmentStatus = RESERVED`
- Hanya bisa fulfill item dengan `fulfillmentMethod = FROM_STOCK`
- SPK harus dalam status `IN_PROGRESS`

### 3. Validasi Saat Cancel
- Hanya release item dengan `fulfillmentStatus = RESERVED`
- Item yang sudah `FULFILLED` tidak di-release (karena sudah diambil fisik)

## Best Practices

1. **Selalu gunakan transaction** untuk operasi yang melibatkan multiple updates
2. **Validasi stok sebelum reserve** untuk mencegah double booking
3. **Gunakan availableStock** (bukan currentStock) saat cek ketersediaan untuk SPK baru
4. **Jangan langsung kurangi currentStock** saat SPK IN_PROGRESS, gunakan reservedStock dulu
5. **Fulfill item satu per satu** atau batch, tapi pastikan semua dalam satu transaction
6. **Track semua perubahan** melalui StockHistory untuk audit trail

## Migration Steps

Untuk mengimplementasikan sistem ini:

1. **Update Schema Prisma:**
   ```bash
   npx prisma migrate dev --name add_stock_reservation_system
   ```

2. **Update Existing Data:**
   - Set `reservedStock = 0` untuk semua Item yang sudah ada
   - Set `fulfillmentStatus = 'PENDING'` untuk semua SpkItem yang sudah ada
   - Link `itemId` untuk SpkItem yang `fulfillmentMethod = FROM_STOCK` (jika belum)

3. **Test Flow:**
   - Buat SPK baru
   - Ubah ke IN_PROGRESS (cek reservedStock)
   - Fulfill item (cek currentStock dan reservedStock berkurang)
   - Cancel SPK (cek reservedStock di-release)

## Troubleshooting

### Q: Stok minus setelah implementasi?
**A:** Pastikan semua operasi menggunakan transaction dan validasi availableStock sebelum reserve.

### Q: Reserved stock tidak ter-release saat cancel?
**A:** Pastikan item memiliki `fulfillmentStatus = RESERVED` (bukan FULFILLED).

### Q: SPK lain bisa menggunakan stok yang sudah di-reserve?
**A:** Pastikan validasi menggunakan `availableStock = currentStock - reservedStock`, bukan hanya `currentStock`.

### Q: Bagaimana jika item sudah FULFILLED tapi SPK dibatalkan?
**A:** Item yang sudah FULFILLED tidak otomatis di-release. Perlu transaksi manual untuk return barang ke gudang.

---

**Dokumen ini akan terus di-update sesuai dengan perkembangan sistem.**
