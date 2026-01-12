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
- Input permintaan bahan baku dari produksi
- Validasi stok sebelum approval
- Auto-generate transaksi barang keluar saat disetujui
- Status tracking (Pending, Approved, Completed, Rejected)

### 5. Laporan
- **Laporan Stok**: Stok bahan baku, barang jadi, stok di bawah minimum, nilai stok
- **Laporan Barang Masuk**: Filter tanggal dan barang
- **Laporan Barang Keluar**: Filter tanggal dan SPK

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

## 📝 Aturan Bisnis

1. **Memo Wajib**: Semua transaksi harus memiliki memo
2. **Stok Tidak Boleh Minus**: Validasi dilakukan saat barang keluar
3. **Update Stok Otomatis**: Stok update otomatis dari transaksi
4. **Audit Log**: Semua perubahan stok tersimpan di StockHistory
5. **Validasi Stok**: Permintaan produksi divalidasi stok sebelum approval

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

Private project - All rights reserved
