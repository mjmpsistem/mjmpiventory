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
  Bell,
  Trash2,
  Printer,
  Zap,
  Boxes,
  ClipboardList,
  Plus,
  RotateCcw as Recycle,
} from "lucide-react";

export default function TentangAplikasiPage() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <Breadcrumb />

        {/* HERO / INTRO */}
        <section className="grid gap-6 lg:grid-cols-[2fr,1.2fr]">
          <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100 p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:rotate-0 duration-700 text-blue-900">
              <Info size={200} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                  <Info size={28} />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-black text-gray-900 tracking-tight">
                    Evolusi{" "}
                    <span className="text-blue-600">Sistem Inventory</span>
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">
                    Versi Terbaru Maret 2026
                  </p>
                </div>
              </div>

              <p className="text-base text-gray-600 leading-relaxed max-w-2xl mb-8">
                Selamat datang di platform manajemen inventory terintegrasi.
                Sistem ini telah dioptimalkan untuk memisahkan
                <strong> stok pesanan (SPK)</strong> dari{" "}
                <strong>stok umum gudang</strong>, memastikan akurasi data yang
                lebih tinggi dan alur produksi yang lebih transparan bagi
                seluruh tim.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-4 transition-all hover:shadow-md hover:bg-white">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                    Akurasi Stok
                  </p>
                  <p className="text-sm text-gray-900 font-bold">
                    Pemisahan Stok SPK & Gudang Umum.
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4 transition-all hover:shadow-md hover:bg-white">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                    Produksi Cepat
                  </p>
                  <p className="text-sm text-gray-900 font-bold">
                    Opsi Produksi Manual Tanpa SPK.
                  </p>
                </div>
                <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-4 transition-all hover:shadow-md hover:bg-white">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                    Real-time
                  </p>
                  <p className="text-sm text-gray-900 font-bold">
                    Badge Notifikasi Update Otomatis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* MINI FLOW OVERVIEW */}
          <div className="bg-slate-900 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 opacity-10">
              <Workflow size={180} />
            </div>

            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Workflow size={18} />
                </div>
                <h2 className="text-lg font-bold">Alur Pintar Sistem</h2>
              </div>

              <div className="space-y-6 flex-1">
                {[
                  {
                    n: "01",
                    t: "Order Integration",
                    d: "SPK masuk memicu kebutuhan material.",
                  },
                  {
                    n: "02",
                    t: "Isolated Production",
                    d: "Hasil SPK masuk ke jatah pengiriman (Isolated).",
                  },
                  {
                    n: "03",
                    t: "Manual PR",
                    d: "Produksi mandiri langsung menambah stok gudang.",
                  },
                  {
                    n: "04",
                    t: "Return Sync",
                    d: "SPK Retur terintegrasi dalam alur produksi & kirim.",
                  },
                ].map((step) => (
                  <div key={step.n} className="flex gap-4 group">
                    <span className="text-xs font-black text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity">
                      {step.n}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold leading-none mb-1">
                        {step.t}
                      </h4>
                      <p className="text-[11px] text-slate-400">{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NEW FEATURES SECTION */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl shadow-blue-600/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
                <Zap size={10} /> Apa yang Baru?
              </div>
              <h2 className="text-2xl font-black">Penyempurnaan Alur & UI</h2>
              <p className="text-blue-100 text-sm max-w-md">
                Kami baru saja memperbarui sistem untuk membedakan barang yang
                sudah dipesan customer dan stok bebas di gudang.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/20 transition-all">
                <div className="p-2 w-fit rounded-lg bg-blue-400/20 text-blue-300 mb-3">
                  <Boxes size={20} />
                </div>
                <h4 className="font-bold text-sm mb-1">Stok Eksklusif</h4>
                <p className="text-[10px] text-blue-100">
                  Barang hasil SPK "dikunci" untuk SPK tersebut, tidak campur
                  stok umum.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/20 transition-all">
                <div className="p-2 w-fit rounded-lg bg-orange-400/20 text-orange-400 mb-3">
                  <ClipboardList size={20} />
                </div>
                <h4 className="font-bold text-sm mb-1">PR Manual</h4>
                <p className="text-[10px] text-blue-100">
                  Tambah stok Barang Jadi langsung tanpa perlu nomor SPK.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/20 transition-all">
                <div className="p-2 w-fit rounded-lg bg-emerald-400/20 text-emerald-400 mb-3">
                  <Bell size={20} />
                </div>
                <h4 className="font-bold text-sm mb-1">Real-time Notif</h4>
                <p className="text-[10px] text-blue-100">
                  Badge & notifikasi otomatis update tanpa refresh.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTIONS PER MENU UTAMA */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Dashboard & Master Data */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-xl hover:shadow-blue-900/5 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-all">
                  <LayoutDashboard size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Dashboard Interaktif
                  </h2>
                  <p className="text-xs text-gray-500 font-medium tracking-wide border-l-2 border-sky-500 pl-2">
                    KONTROL PUSAT
                  </p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-2 flex-shrink-0" />
                  <span>
                    Visualisasi <strong>stok bahan baku & barang jadi</strong>{" "}
                    secara instan di satu layar utama.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-2 flex-shrink-0" />
                  <span>
                    Waspada dini lewat widget{" "}
                    <strong>stok di bawah minimum</strong> untuk mencegah
                    kekosongan produksi.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-xl hover:shadow-blue-900/5 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Pusat Master Data
                  </h2>
                  <p className="text-xs text-gray-500 font-medium tracking-wide border-l-2 border-emerald-500 pl-2">
                    SUMBER KEBENARAN
                  </p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <span>
                    Manajemen Barang Jadi dan Bahan Baku dengan metadata
                    spesifik (Warna, Ukuran, Tebal).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <span>
                    Sistem unit fleksibel (Kg, Pcs, Roll) untuk akurasi konversi
                    stok.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Transaksi & Laporan */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-xl hover:shadow-blue-900/5 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Modul Transaksi & SPK
                  </h2>
                  <p className="text-xs text-gray-500 font-medium tracking-wide border-l-2 border-orange-500 pl-2">
                    AKTIVITAS HARIAN
                  </p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <span>
                    Alur **SPK Retur** untuk mengelola barang cacat dan produksi
                    ulang barang kembali.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <span>
                    Manajemen **Purchase Order (PO)** yang terhubung langsung
                    dengan kebutuhan trading SPK.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-xl hover:shadow-blue-900/5 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-violet-50 text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-all">
                  <FileBarChart size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Laporan & Pengiriman
                  </h2>
                  <p className="text-xs text-gray-500 font-medium tracking-wide border-l-2 border-violet-500 pl-2">
                    ANALISIS & LOGISTIK
                  </p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                  <span>
                    Pelacakan pengiriman (Shipping) terpadu dengan foto bukti
                    dan status real-time.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                  <span>
                    Laporan stok yang kini memisahkan stok fisik gudang dan stok
                    ter-reserve untuk SPK.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CARA PENGGUNAAN / USER GUIDE */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Workflow size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                Panduan Alur Sistem
              </h2>
              <p className="text-sm text-gray-500">
                Memahami perbedaan alur Produksi SPK dan Produksi Manual
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Workflow 1: Produksi SPK (Isolated) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col hover:border-blue-500/50 transition-colors group">
              <h3 className="text-blue-600 font-black text-sm uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">
                  1
                </span>
                Produksi via SPK
              </h3>
              <div className="space-y-4 flex-1">
                {[
                  {
                    s: "Berdasar SPK",
                    d: "Produksi dipicu oleh pesanan customer yang ada di SPK.",
                  },
                  {
                    s: "Ready to Ship",
                    d: "Hasil produksi langsung dialokasikan ke 'Siap Kirim' SPK tersebut.",
                  },
                  {
                    s: "Bukan Stok Umum",
                    d: "Barang tidak muncul di Master Data sebagai stok bebas (Isolated).",
                  },
                  {
                    s: "Kirim Langsung",
                    d: "Stok berkurang hanya jika SPK dikirim (Shipped).",
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="relative pl-6 border-l border-blue-50"
                  >
                    <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-blue-200 group-hover:bg-blue-600 transition-colors" />
                    <p className="text-xs font-bold text-gray-900 mb-0.5">
                      {step.s}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      {step.d}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow 2: Produksi Manual (Add to Stock) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col hover:border-emerald-500/50 transition-colors group">
              <h3 className="text-emerald-600 font-black text-sm uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">
                  2
                </span>
                Produksi Manual
              </h3>
              <div className="space-y-4 flex-1">
                {[
                  {
                    s: "Tanpa SPK",
                    d: "Digunakan untuk menambah stok barang jadi secara mandiri.",
                  },
                  {
                    s: "Pilih Target",
                    d: "Pilih Barang Jadi langsung dari database Master Data.",
                  },
                  {
                    s: "Instant Stock",
                    d: "Begitu produksi selesai (Complete), currentStock langsung bertambah.",
                  },
                  {
                    s: "Siap Jual",
                    d: "Barang tersedia untuk pesanan baru di masa mendatang (Stock Transfer).",
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="relative pl-6 border-l border-emerald-50"
                  >
                    <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-emerald-200 group-hover:bg-emerald-600 transition-colors" />
                    <p className="text-xs font-bold text-gray-900 mb-0.5">
                      {step.s}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      {step.d}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow 3: Retur & Reshaping */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col hover:border-orange-500/50 transition-colors group">
              <h3 className="text-orange-600 font-black text-sm uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px]">
                  3
                </span>
                Alur Retur (SPK Retur)
              </h3>
              <div className="space-y-4 flex-1">
                {[
                  {
                    s: "Input Retur",
                    d: "Catat pengembalian barang dari modul Shipping/Returns.",
                  },
                  {
                    s: "SPK Retur",
                    d: "Kembangkan SPK Retur untuk barang yang perlu diproduksi ulang.",
                  },
                  {
                    s: "Siklus Produksi",
                    d: "Permintaan bahan & lapor hasil tetap berjalan seperti SPK normal.",
                  },
                  {
                    s: "Re-Delivery",
                    d: "Kirim kembali barang yang sudah diperbaiki/diganti ke customer.",
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className="relative pl-6 border-l border-orange-50"
                  >
                    <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-orange-200 group-hover:bg-orange-600 transition-colors" />
                    <p className="text-xs font-bold text-gray-900 mb-0.5">
                      {step.s}
                    </p>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      {step.d}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* BEST PRACTICES / TIPS */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Tips Operasional
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  BEST PRACTICES
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  t: "Gunakan PR Manual",
                  d: "Untuk stok cadangan (safety stock), gunakan 'Tambah Manual' agar barang langsung muncul di laporan stok utama.",
                },
                {
                  t: "Isolated SPK",
                  d: "Jangan panik jika produksi SPK sudah selesai tapi stok gudang tidak naik; barang tersebut aman di jatah 'Siap Kirim' SPK.",
                },
                {
                  t: "Pantau Badge",
                  d: "Badge merah di sidebar adalah panduan prioritas kerja Anda hari ini tanpa perlu sering refresh.",
                },
                {
                  t: "Audit via Laporan",
                  d: "Gunakan Laporan Stok untuk membandingkan stok fisik gudang vs stok yang dipesan (Reserved).",
                },
              ].map((tip, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors"
                >
                  <h4 className="text-sm font-bold text-gray-900 mb-1">
                    {tip.t}
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    {tip.d}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Zap size={100} />
            </div>
            <h2 className="text-lg font-black mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Navigasi
              Akses Cepat
            </h2>
            <div className="space-y-4">
              {[
                {
                  r: "/dashboard",
                  l: "Monitoring Utama",
                  i: <LayoutDashboard size={14} />,
                },
                {
                  r: "/transaksi/monitoring-waste",
                  l: "Waste Center",
                  i: <Trash2 size={14} />,
                },
                {
                  r: "/transaksi/purchase-order",
                  l: "Daftar PO",
                  i: <ShoppingCart size={14} />,
                },
                {
                  r: "/permintaan-produksi",
                  l: "Produksi Center",
                  i: <Workflow size={14} />,
                },
                {
                  r: "/approval-barang-jadi",
                  l: "Approval Akhir",
                  i: <Zap size={14} />,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between group cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-slate-500 group-hover:text-blue-400 transition-colors">
                      {item.i}
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">
                      {item.l}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded group-hover:bg-blue-500 group-hover:text-white transition-all">
                    {item.r}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between opacity-50">
              <div className="flex gap-4">
                <Sun size={14} />
                <Moon size={14} />
              </div>
              <p className="text-[10px] font-medium italic">
                Powered by Advanced Associe IT
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
