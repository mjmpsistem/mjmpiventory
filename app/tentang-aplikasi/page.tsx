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
                    Evolusi <span className="text-blue-600">Sistem Inventory</span>
                  </h1>
                  <p className="text-sm text-gray-500 font-medium">Versi Terbaru Februari 2026</p>
                </div>
              </div>
              
              <p className="text-base text-gray-600 leading-relaxed max-w-2xl mb-8">
                Selamat datang di platform manajemen inventory terintegrasi. Sistem ini dirancang untuk memberikan 
                visibilitas penuh terhadap alur kerja manufaktur, dari bahan baku hingga menjadi barang siap kirim, 
                dengan dukungan teknologi <strong>Real-time</strong> yang responsif.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-blue-50/50 border border-blue-100 p-4 transition-all hover:shadow-md hover:bg-white">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Fokus Utama</p>
                  <p className="text-sm text-gray-900 font-bold">Akurasi & Kontrol Stok Bahan Baku.</p>
                </div>
                <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100 p-4 transition-all hover:shadow-md hover:bg-white">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Target Pengguna</p>
                  <p className="text-sm text-gray-900 font-bold">Admin Gudang, Produksi & QC.</p>
                </div>
                <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-4 transition-all hover:shadow-md hover:bg-white">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Teknologi</p>
                  <p className="text-sm text-gray-900 font-bold">Cloud Presence & Real-time Sync.</p>
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
                  { n: "01", t: "Setup", d: "Input barang di Master Data." },
                  { n: "02", t: "Order", d: "Entry SPK & Purchase Order." },
                  { n: "03", t: "Produce", d: "Approval & Pantau Produksi." },
                  { n: "04", t: "Ship", d: "QC & Pengiriman Barang Jadi." }
                ].map((step) => (
                  <div key={step.n} className="flex gap-4 group">
                    <span className="text-xs font-black text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity">{step.n}</span>
                    <div>
                      <h4 className="text-sm font-bold leading-none mb-1">{step.t}</h4>
                      <p className="text-[11px] text-slate-400">{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NEW FEATURES SECTION */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-600/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
                <Zap size={10} /> Apa yang Baru?
              </div>
              <h2 className="text-2xl font-black">Fitur Unggulan Terkini</h2>
              <p className="text-blue-100 text-sm max-w-md">Kami baru saja memperbarui sistem untuk memberikan pengalaman yang lebih cepat dan transparan.</p>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/20 transition-all">
                <div className="p-2 w-fit rounded-lg bg-yellow-400/20 text-yellow-400 mb-3">
                  <Bell size={20} />
                </div>
                <h4 className="font-bold text-sm mb-1">Real-time Notif</h4>
                <p className="text-[10px] text-blue-100">Badge & notifikasi otomatis update tanpa refresh.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/20 transition-all">
                <div className="p-2 w-fit rounded-lg bg-red-400/20 text-red-400 mb-3">
                  <Trash2 size={20} />
                </div>
                <h4 className="font-bold text-sm mb-1">Waste Monitor</h4>
                <p className="text-[10px] text-blue-100">Pantau sampah produksi untuk efisiensi bahan.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/20 transition-all">
                <div className="p-2 w-fit rounded-lg bg-emerald-400/20 text-emerald-400 mb-3">
                  <Printer size={20} />
                </div>
                <h4 className="font-bold text-sm mb-1">Print Preview</h4>
                <p className="text-[10px] text-blue-100">Lihat dokumen dalam modal SEBELUM dicetak.</p>
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
                  <h2 className="text-lg font-bold text-gray-900">Dashboard Interaktif</h2>
                  <p className="text-xs text-gray-500 font-medium tracking-wide border-l-2 border-sky-500 pl-2">KONTROL PUSAT</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-2 flex-shrink-0" />
                  <span>Visualisasi <strong>stok bahan baku & barang jadi</strong> secara instan di satu layar utama.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-2 flex-shrink-0" />
                  <span>Waspada dini lewat widget <strong>stok di bawah minimum</strong> untuk mencegah kekosongan produksi.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-xl hover:shadow-blue-900/5 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Pusat Master Data</h2>
                  <p className="text-xs text-gray-500 font-medium tracking-wide border-l-2 border-emerald-500 pl-2">SUMBER KEBENARAN</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <span>Katalog mandiri untuk mendefinisikan <strong>Spesifikasi Barang</strong>, Jenis, hingga Satuan standar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <span>Dukungan metadata lengkap seperti warna, ketebalan, dan merk untuk pencarian barang yang presisi.</span>
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
                  <h2 className="text-lg font-bold text-gray-900">Modul Transaksi</h2>
                  <p className="text-xs text-gray-500 font-medium tracking-wide border-l-2 border-orange-500 pl-2">AKTIVITAS HARIAN</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <span><strong>Purchase Order</strong> pintar: Otomatis mengisi data dari SPK Trading untuk mempercepat kerja admin.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                  <span>Alur <strong>Barang Keluar</strong> yang terhubung dengan produksi atau penjualan untuk sinkronisasi stok otomatis.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-xl hover:shadow-blue-900/5 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-violet-50 text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-all">
                  <FileBarChart size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Laporan & Audit</h2>
                  <p className="text-xs text-gray-500 font-medium tracking-wide border-l-2 border-violet-500 pl-2">ANALISIS DATA</p>
                </div>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                  <span>Rekap histori pergerakan stok harian yang siap diekspor untuk bahan audit bulanan.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                  <span>Monitoring <strong>Waste Produksi</strong> secara berkala untuk mengevaluasi efisiensi operasional pabrik.</span>
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
              <h2 className="text-2xl font-black text-gray-900">Panduan Penggunaan</h2>
              <p className="text-sm text-gray-500">Ikuti langkah-langkah di bawah untuk workflow yang efisien</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Workflow 1: Produksi Internal */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col hover:border-blue-500/50 transition-colors group">
              <h3 className="text-blue-600 font-black text-sm uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">1</span>
                Workflow Produksi
              </h3>
              <div className="space-y-4 flex-1">
                {[
                  { s: "Input SPK", d: "Admin input SPK baru dan pilih item 'Fulfillment: Production'." },
                  { s: "Request Produksi", d: "Buka menu Produksi, buat permintaan material berdasarkan SPK tadi." },
                  { s: "Approval Produksi", d: "Admin gudang approve permintaan & memotong stok bahan baku." },
                  { s: "Update Hasil", d: "Input hasil produksi di menu Daily Log / SPK Progress." },
                  { s: "QC & Ship", d: "Lakukan approval akhir barang jadi sebelum pengiriman." }
                ].map((step, i) => (
                  <div key={i} className="relative pl-6 border-l border-blue-50">
                    <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-blue-200 group-hover:bg-blue-600 transition-colors" />
                    <p className="text-xs font-bold text-gray-900 mb-0.5">{step.s}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{step.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow 2: Trading (Beli Vendor) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col hover:border-emerald-500/50 transition-colors group">
              <h3 className="text-emerald-600 font-black text-sm uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px]">2</span>
                Workflow Trading
              </h3>
              <div className="space-y-4 flex-1">
                {[
                  { s: "Input SPK Trading", d: "Entry SPK dengan menandai item sebagai 'Fulfillment: Trading'." },
                  { s: "Buat Purchase Order", d: "Buka menu PO, pilih tab 'Trading Needed', buat PO ke Vendor." },
                  { s: "Update Harga", d: "Input harga beli dari vendor di dalam sistem PO." },
                  { s: "Barang Masuk", d: "Saat barang tiba, catat di 'Barang Masuk' untuk menambah stok." },
                  { s: "Invoice & Ship", d: "Cetak Invoice dan kirim barang langsung ke customer." }
                ].map((step, i) => (
                  <div key={i} className="relative pl-6 border-l border-emerald-50">
                    <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-emerald-200 group-hover:bg-emerald-600 transition-colors" />
                    <p className="text-xs font-bold text-gray-900 mb-0.5">{step.s}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{step.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow 3: Stok & Waste */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col hover:border-orange-500/50 transition-colors group">
              <h3 className="text-orange-600 font-black text-sm uppercase tracking-tighter mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-[10px]">3</span>
                Manajemen Stok
              </h3>
              <div className="space-y-4 flex-1">
                {[
                  { s: "Cek Stok Minimum", d: "Cek Dashboard ruitn untuk melihat stok yang harus dibeli." },
                  { s: "Pencatatan Waste", d: "Catat sisa bahan atau cacat produksi di menu Progress." },
                  { s: "Daur Ulang", d: "Waste yang terkumpul bisa dicatat sebagai barang keluar 'Daur Ulang'." },
                  { s: "Stock Opname", d: "Lakukan audit berkala menggunakan Laporan Stok per barang." },
                  { s: "Real-time Sync", d: "Pastikan selalu login untuk menerima update notifikasi instan." }
                ].map((step, i) => (
                  <div key={i} className="relative pl-6 border-l border-orange-50">
                    <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-orange-200 group-hover:bg-orange-600 transition-colors" />
                    <p className="text-xs font-bold text-gray-900 mb-0.5">{step.s}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{step.d}</p>
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
                <h2 className="text-lg font-bold text-gray-900">Keamanan & Performa</h2>
                <p className="text-xs text-gray-500 font-medium">BEST PRACTICES</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { t: "Koneksi Real-time", d: "Jangan heran jika angka badge sidebar berubah sendiri; itu berarti ada rekan Anda yang baru saja menyelesaikan tugas!" },
                { t: "Pratinjau Sebelum Cetak", d: "Selalu manfaatkan tombol 'Cetak' (modal) untuk melihat preview dokumen guna menghemat penggunaan kertas & tinta." },
                { t: "Validasi SPK", d: "Gunakan menu Approval Barang Jadi untuk memvalidasi stok fisik sebelum dilakukan pengiriman akhir ke customer." },
                { t: "Kesehatan Mata", d: "Gunakan Dark Mode jika Anda bekerja di malam hari atau dalam waktu lama untuk kenyamanan ekstra." }
              ].map((tip, i) => (
                <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors">
                  <h4 className="text-sm font-bold text-gray-900 mb-1">{tip.t}</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">{tip.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl shadow-xl p-8 text-white">
            <h2 className="text-lg font-black mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Navigasi Akses Cepat
            </h2>
            <div className="space-y-4">
              {[
                { r: "/dashboard", l: "Monitoring Utama", i: <LayoutDashboard size={14} /> },
                { r: "/transaksi/monitoring-waste", l: "Waste Center", i: <Trash2 size={14} /> },
                { r: "/transaksi/purchase-order", l: "Daftar PO", i: <ShoppingCart size={14} /> },
                { r: "/permintaan-produksi", l: "Produksi Center", i: <Workflow size={14} /> },
                { r: "/approval-barang-jadi", l: "Approval Akhir", i: <Zap size={14} /> }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-500 group-hover:text-blue-400 transition-colors">{item.i}</div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{item.l}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded group-hover:bg-blue-500 group-hover:text-white transition-all">{item.r}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between opacity-50">
              <div className="flex gap-4">
                <Sun size={14} />
                <Moon size={14} />
              </div>
              <p className="text-[10px] font-medium italic">Powered by Advanced MJMP System</p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

