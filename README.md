# Web Inventory Gudang - Sistem Inventory untuk Pabrik Plastik

Sistem web-based untuk mengelola inventory gudang pabrik plastik dengan fitur lengkap untuk mengelola barang jadi, bahan baku, transaksi masuk/keluar, dan integrasi dengan permintaan produksi.

## 🚀 Fitur Utama

### 1. Dashboard
- Ringkasan total stok bahan baku dan barang jadi
- Stok di bawah minimum
- Barang masuk dan keluar hari ini
- Nilai stok total
- Filter berdasarkan tanggal

### 2. Master Data
- **Data Barang**: Kelola barang jadi dan bahan baku dengan stok minimum, satuan, dan kategori
- **Jenis Barang**: Kelola jenis-jenis barang (Biji Plastik, Pigmen, dll)
- **Satuan**: Kelola satuan barang (Kg, Pcs, Roll, Ball, Pack)

### 3. Transaksi
- **Barang Masuk**: Catat pembelian, hasil produksi, retur, penyesuaian stok
- **Barang Keluar**: Catat untuk produksi, penjualan, penyesuaian, scrap/BS
- Validasi stok tidak boleh minus
- Memo wajib untuk semua transaksi

### 4. Permintaan Bahan Baku Produksi
- **Integrasi SPK**:
  - Melihat detail SPK (Nomor, Item, Spesifikasi Tambahan)
  - Tracking status permintaan (Pending, Approved, Completed, Rejected)
- **Approval System**:
  - Validasi stok otomatis ("Cukup" / "Tidak Cukup")
  - **Auto-deduct Stock**: Saat disetujui, stok fisik otomatis berkurang dan tercatat di Barang Keluar
  - **PDF Export**: Cetak Bukti Permintaan Produksi untuk yang sudah Approved

### 5. Laporan
- **Laporan Stok Real-time**:
  - **Stok Fisik**: Jumlah barang di gudang
  - **Reserved**: Jumlah barang yang sudah di-tag untuk produksi (SPK) tapi belum diambil
  - **Stok Tersedia**: Stok Fisik - Reserved
  - **Nilai Stok**: Perhitungan aset berdasarkan Harga Rata-rata (Weighted Average) atau Harga Manual
- **Fitur Export**: Download laporan stok ke format CSV dengan filter tanggal dan kategori
- **Monitoring**: Highlight stok di bawah minimum
- **Laporan Transaksi**: Filter barang masuk/keluar berdasarkan tanggal dan SPK

## 🛠️ Teknologi

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (dapat diganti ke PostgreSQL/MySQL)
- **ORM**: Prisma
- **Authentication**: JWT

## 📋 Prasyarat

- Node.js 18+ 
- npm atau yarn

## 🔧 Instalasi

1. **Clone repository dan masuk ke folder project**
   ```bash
   cd inventory
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   ```bash
   # Generate Prisma Client
   npm run db:generate
   
   # Run migration
   npm run db:migrate
   
   # Seed database dengan data awal
   npm run db:seed
   ```

4. **Setup environment variables**
   
   Buat file `.env` di root folder dengan isi:
   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="your-secret-key-change-in-production"
   ```

5. **Jalankan development server**
   ```bash
   npm run dev
   ```

6. **Akses aplikasi**
   
   Buka browser dan akses: `http://localhost:3000`

## 👤 Default Users

Setelah menjalankan seed, tersedia user default:

- **Superadmin**
  - Username: `superadmin`
  - Password: `admin123`
  - Akses: Penuh

- **Admin Gudang**
  - Username: `admin`
  - Password: `admin123`
  - Akses: Master data, transaksi, laporan

## 📁 Struktur Project

```
inventory/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard page
│   ├── login/           # Login page
│   ├── master-data/     # Master data pages
│   ├── transaksi/       # Transaction pages
│   ├── permintaan-produksi/  # Production request page
│   └── laporan/         # Report pages
├── components/          # Reusable components
├── lib/                # Utility functions
│   ├── auth.ts         # Authentication utilities
│   ├── prisma.ts       # Prisma client
│   ├── stock.ts        # Stock management functions
│   └── utils.ts        # General utilities
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts        # Seed script
└── public/            # Static files
```

## 🗄️ Database Schema

### Models
- **User**: Users dengan role (SUPERADMIN, ADMIN_GUDANG, STAFF_GUDANG)
- **Item**: Barang dengan kategori (BAHAN_BAKU, BARANG_JADI)
- **ItemType**: Jenis barang
- **Unit**: Satuan barang
- **Transaction**: Transaksi masuk/keluar
- **StockHistory**: Audit log perubahan stok
- **ProductionRequest**: Permintaan bahan baku dari produksi
- **ProductionRequestItem**: Detail bahan baku dalam permintaan

## 🔐 Role & Akses

### Superadmin
- Akses penuh ke semua fitur

### Admin Gudang / Staff Gudang
- Master data (CRUD)
- Transaksi (Barang Masuk/Keluar)
- Laporan
- Permintaan Produksi

### Produksi
- ❌ Tidak memiliki akses ke sistem (input dilakukan oleh Admin Gudang)

## 📝 Core Logic: Sistem Reservasi Stok

Sistem ini menggunakan mekanisme **Stock Reservation** untuk mencegah overselling/double allocation:

1. **Reserved Logic**:
   - Saat SPK Produksi dibuat, stok bahan baku masuk status **Reserved**.
   - Stok Fisik **BELUM** berkurang.
   - Stok Tersedia = Stok Fisik - Reserved.

2. **Fulfillment Logic**:
   - Saat permintaan disetujui (Approved), stok **Reserved** dilepas.
   - Stok Fisik berkurang sesuai jumlah permintaan.
   - Transaksi Barang Keluar tercatat otomatis.

3. **Release Logic**:
   - Jika SPK dibatalkan, stok **Reserved** dikembalikan ke Stok Tersedia.

## ⚖️ Aturan Bisnis Lainnya

1. **Memo Wajib**: Semua transaksi manual harus memiliki memo.
2. **Stok Minus**: Stok fisik tidak boleh kurang dari 0.
3. **Audit Trail**: Setiap perubahan stok (fisik maupun reserved) tercatat di tabel `StockHistory`.

## 🚀 Production Deployment

1. **Ganti database ke PostgreSQL/MySQL**
   - Update `DATABASE_URL` di `.env`
   - Update provider di `prisma/schema.prisma`

2. **Set JWT_SECRET yang kuat**
   ```env
   JWT_SECRET="your-strong-secret-key-here"
   ```

3. **Build aplikasi**
   ```bash
   npm run build
   npm start
   ```

## 🔄 Integrasi dengan Sistem Produksi

Database schema sudah disiapkan untuk integrasi dengan sistem produksi di masa depan:
- Tabel `ProductionRequest` dengan field `spkNumber` untuk link ke SPK Produksi
- Field `spkNumber` di `Transaction` untuk tracking transaksi ke produksi

## 📞 Support

Untuk pertanyaan atau issue, silakan buat issue di repository ini.

## 📄 License

Private project Associe Team - All rights reserved
