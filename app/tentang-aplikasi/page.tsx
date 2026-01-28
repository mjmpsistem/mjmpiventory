/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import {
  Info,
  Workflow,
  LayoutDashboard,
  Database,
  ShoppingCart,
  FileBarChart,
  ShieldCheck,
  Sun,
  Moon,
} from "lucide-react";

export default function TentangAplikasiPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />

        {/* HERO / INTRO */}
        <section className="grid gap-4 lg:grid-cols-[2fr,1.2fr]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Info size={22} />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">
                  Tentang Aplikasi Inventory
                </h1>
                <p className="text-sm text-gray-600">
                  Halaman ini menjelaskan secara singkat cara menggunakan sistem
                  inventory gudang: dari input master data, transaksi harian,
                  sampai membaca laporan.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                  Fokus
                </p>
                <p className="mt-1 text-sm text-blue-900">
                  Kontrol pergerakan stok bahan baku & barang jadi.
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Pengguna
                </p>
                <p className="mt-1 text-sm text-emerald-900">
                  Admin gudang, produksi, & manajemen.
                </p>
              </div>
              <div className="rounded-xl bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                  Mode Tampilan
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-indigo-900">
                  <Sun size={16} className="text-yellow-500" />
                  <span>Light</span>
                  <span className="text-gray-400">/</span>
                  <Moon size={16} className="text-gray-600" />
                  <span>Dark</span>
                </p>
              </div>
            </div>
          </div>

          {/* MINI FLOW OVERVIEW */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <Workflow size={18} />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">
                Alur Besar Sistem
              </h2>
            </div>
            <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
              <li>
                <strong>Setup Master Data</strong> – Input barang, jenis barang,
                dan satuan di menu <span className="font-semibold">Master Data</span>.
              </li>
              <li>
                <strong>Catat Transaksi</strong> – Gunakan menu{" "}
                <span className="font-semibold">Transaksi</span> untuk barang
                masuk, barang keluar, dan purchase order.
              </li>
              <li>
                <strong>Koneksi ke Produksi</strong> – Gunakan{" "}
                <span className="font-semibold">Permintaan Produksi</span> dan{" "}
                <span className="font-semibold">Approval</span> untuk alur SPK.
              </li>
              <li>
                <strong>Monitoring & Analisis</strong> – Lihat ringkasan di{" "}
                <span className="font-semibold">Dashboard</span> dan detail di{" "}
                <span className="font-semibold">Laporan</span>.
              </li>
            </ol>
          </div>
        </section>

        {/* SECTIONS PER MENU UTAMA */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Dashboard & Master Data */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Dashboard
                  </h2>
                  <p className="text-xs text-gray-500">
                    Ringkasan kondisi inventory dan aktivitas terakhir.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>
                  Lihat total stok bahan baku & barang jadi hari ini.
                </li>
                <li>
                  Pantau <span className="font-semibold">stok di bawah minimum</span> untuk
                  tindakan cepat.
                </li>
                <li>
                  Periksa aktivitas terakhir (barang masuk/keluar, permintaan
                  produksi, dan PO) untuk jejak audit singkat.
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Master Data
                  </h2>
                  <p className="text-xs text-gray-500">
                    Sumber kebenaran data barang di seluruh sistem.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>
                  <strong>Data Barang</strong> – daftar semua bahan baku &
                  barang jadi, lengkap dengan kode, type, dan satuan.
                </li>
                <li>
                  <strong>Jenis Barang</strong> – kategori seperti biji plastik,
                  pigmen, trading, dll.
                </li>
                <li>
                  <strong>Satuan</strong> – definisikan Kg, Roll, Pcs, Ball,
                  Pack, dll supaya transaksi konsisten.
                </li>
              </ul>
            </div>
          </div>

          {/* Transaksi & Laporan */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Transaksi
                  </h2>
                  <p className="text-xs text-gray-500">
                    Pencatatan pergerakan stok harian.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>
                  <strong>Barang Masuk</strong> – catat pembelian / retur /
                  penambahan stok lain.
                </li>
                <li>
                  <strong>Barang Keluar</strong> – catat pengeluaran ke produksi,
                  daur ulang, trading, atau ke customer.
                </li>
                <li>
                  <strong>Purchase Order</strong> – buat & kelola PO berdasarkan
                  SPK trading maupun manual.
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-violet-100 text-violet-700">
                  <FileBarChart size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Laporan & Monitoring
                  </h2>
                  <p className="text-xs text-gray-500">
                    Untuk kontrol manajemen & audit.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>
                  <strong>Laporan Barang Masuk</strong> – histori penerimaan
                  barang dari vendor / sumber lain.
                </li>
                <li>
                  <strong>Laporan Barang Keluar</strong> – histori pemakaian /
                  pengeluaran stok.
                </li>
                <li>
                  <strong>Laporan Stok</strong> – posisi stok terkini per
                  barang, untuk keperluan audit & keputusan pembelian.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* BEST PRACTICES / TIPS */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Tips Penggunaan Harian
                </h2>
                <p className="text-xs text-gray-500">
                  Beberapa kebiasaan kecil yang membuat data selalu rapi &
                  akurat.
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
              <li>
                Selalu pastikan <strong>master data barang</strong> sudah benar
                sebelum mulai transaksi.
              </li>
              <li>
                Gunakan <strong>memo</strong> pada transaksi untuk menulis
                konteks singkat (misal: nomor dokumen fisik, alasan koreksi).
              </li>
              <li>
                Manfaatkan <strong>filter tanggal</strong> di setiap halaman
                transaksi & laporan untuk investigasi data.
              </li>
              <li>
                Review rutin menu <strong>stok di bawah minimum</strong> lewat
                dashboard sebelum membuat PO.
              </li>
              <li>
                Gunakan <strong>dark mode</strong> saat kerja lama di depan
                layar untuk mengurangi kelelahan mata.
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Navigasi Cepat
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Beberapa rute penting di sistem ini:
            </p>
            <div className="text-xs text-gray-700 space-y-2">
              <p>
                • <span className="font-mono text-gray-900">/dashboard</span> –{" "}
                Dashboard utama.
              </p>
              <p>
                • <span className="font-mono text-gray-900">/master-data</span> –{" "}
                Master barang, jenis, dan satuan.
              </p>
              <p>
                • <span className="font-mono text-gray-900">/transaksi</span> –{" "}
                Akses cepat ke seluruh transaksi.
              </p>
              <p>
                •{" "}
                <span className="font-mono text-gray-900">
                  /permintaan-produksi
                </span>{" "}
                – Permintaan & approval produksi.
              </p>
              <p>
                • <span className="font-mono text-gray-900">/laporan</span> –{" "}
                Laporan barang masuk, keluar, dan stok.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

