# Draft Panduan Proses Retur (Integrasi Sistem A)

Dokumen ini menjelaskan alur logika dan variabel yang digunakan dalam proses retur barang pada sistem inventory, untuk dijadikan referensi pengembangan sistem eksternal (Sistem A) agar sinkronisasi data berjalan lancar.

## 1. Variabel Utama (Data Dictionary)

Variabel yang dipertukarkan antara sistem saat terjadi retur:

| Variabel | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `spkNumber` | String | Nomor unik Surat Perintah Kerja (Order ID). |
| `spkItemId` | UUID | ID unik untuk baris barang spesifik di dalam SPK. |
| `shippingItemId` | UUID | ID sesi pengiriman (Surat Jalan Item) tempat barang berasal. |
| `qty` | Float | Jumlah barang yang diretur (bisa parsial). |
| `reason` | Enum | Alasan retur: `REPACK` (Perbaikan) atau `RECYCLE` (Ganti Baru/Daur Ulang). |
| `notes` | String | Catatan tambahan alasan retur dari lapangan/customer. |
| `fulfillmentMethod` | String | Metode pemenuhan: `PRODUCTION` (Custom/MTO) atau `FROM_STOCK` (Ready Stock). |

---

## 2. Logika Pemrosesan Berdasarkan Metode Pemenuhan

Sistem A harus memahami dampak retur terhadap status barang di Inventory:

### A. Retur Layanan Produksi (Make to Order / PRODUCTION)
Barang yang dibuat khusus berdasarkan pesanan.

*   **Kasus: REPACK (Repair)**
    *   **Logika**: Barang hanya butuh perbaikan ringan, tidak butuh produksi dari awal.
    *   **Dampak Variabel**:
        *   `shippedQty` (dikirim) berkurang sesuai `qty` retur.
        *   `readyQty` (siap kirim) bertambah.
        *   `itemStatus` berubah menjadi `READY`.
    *   **Hasil**: Barang muncul kembali di daftar "Siap Kirim" tanpa melalui antrean produksi.

*   **Kasus: RECYCLE (Replace/Scrap)**
    *   **Logika**: Barang rusak total dan harus dibuat ulang dari bahan baku.
    *   **Dampak Variabel**:
        *   `shippedQty` berkurang.
        *   `producedQty` (hasil produksi) dikurangi (karena produk sebelumnya dianggap gagal/waste).
        *   `recycledQty` bertambah (untuk tracking tingkat kegagalan).
        *   `productionRequestId` dihapus/reset.
    *   **Hasil**: Barang otomatis muncul kembali di **Dashboard Produksi** untuk dijadwalkan ulang.

---

### B. Retur Dari Stok (Trading / FROM_STOCK)
Barang yang diambil dari stok gudang yang sudah tersedia.

*   **Kasus: REPACK (Return to Stock)**
    *   **Logika**: Barang salah kirim atau customer batal, barang masih bagus.
    *   **Dampak Variabel**:
        *   `shippedQty` berkurang.
        *   `readyQty` bertambah (masuk kembali ke area packing/siap kirim).
    *   **Hasil**: Barang bisa langsung dikirim ulang atau dialokasikan ke pesanan lain.

*   **Kasus: RECYCLE (Waste/Damaged)**
    *   **Logika**: Barang dari stok rusak saat sampai, harus diganti dengan unit stok baru.
    *   **Dampak Variabel**:
        *   `shippedQty` berkurang.
        *   Stok fisik sebelumnya dianggap keluar (waste).
        *   `itemStatus` kembali ke `QUEUE` (Antrean).
    *   **Hasil**: Admin gudang harus melakukan alokasi stok (`fulfillment`) ulang untuk mengambil unit baru dari gudang.

---

## 3. Penanganan Retur Parsial (Partial Return)

Sistem harus mendukung pengembalian sebagian barang dari satu nota pengiriman.

*   **Validasi**: `qty` retur tidak boleh > `qty` yang tercatat di `shippingItemId`.
*   **Akumulasi**: Total `shippedQty` pada tingkat SPK adalah hasil penjumlahan semua `shipping_item.qty` yang sudah sukses terkirim (dikurangi retur).
*   **Status SPK**:
    *   Jika retur menyebabkan barang yang terkirim < total pesanan, status SPK otomatis kembali ke `PARTIAL` atau `READY_TO_SHIP` agar sisa barang tidak terlupakan.

---

## 4. Struktur Data untuk Sinkronisasi (JSON Example)

Saat Sistem A mengirimkan data retur ke API Inventory, format yang diharapkan:

```json
{
  "shippingItemId": "uuid-pengiriman-terkait",
  "spkItemId": "uuid-item-spk-terkait",
  "qty": 5,
  "reason": "RECYCLE",
  "notes": "Barang pecah di perjalanan, minta ganti baru"
}
```

---

> [!NOTE]
> Integrasi ini memastikan bahwa "Sistem A" tidak perlu mengelola stok secara manual, cukup mengirimkan instruksi retur, dan logic internal Inventory akan mengatur antrean produksi atau ketersediaan stok secara otomatis.
