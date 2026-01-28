# Setup Supabase untuk Inventory Gudang

## 1. Setup Environment Variables

Buat file `.env` di root project dengan isi:

```env
# Database - Supabase Connection String
# Format: postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
# Atau gunakan connection pooling (recommended untuk production):
# postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# JWT Secret (gunakan string yang kuat di production)
JWT_SECRET="your-secret-key-change-in-production"
```

**Cara mendapatkan DATABASE_URL dari Supabase:**
1. Buka project Supabase Anda
2. Pergi ke Settings > Database
3. Copy "Connection string" (pilih "URI" atau "Connection pooling")
4. Ganti `[YOUR-PASSWORD]` dengan password database Anda

## 2. Push Schema ke Supabase

Setelah `.env` sudah diisi dengan benar, jalankan:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema ke Supabase (ini akan membuat semua tabel)
npx prisma db push

# Atau jika ingin menggunakan migration (recommended untuk production):
npx prisma migrate dev --name init
```

## 3. Seed Database (Optional)

Jika ingin mengisi data awal:

```bash
npm run db:seed
```

## Catatan Penting

- Schema sudah diupdate untuk PostgreSQL (Supabase)
- Semua model sudah disesuaikan dengan sistem produksi
- UUID digunakan untuk ID (sesuai dengan PostgreSQL)
- Pastikan database Supabase Anda kosong atau siap untuk di-overwrite
