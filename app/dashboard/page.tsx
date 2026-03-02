"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Package,
  Factory,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  RefreshCw,
  Clock,
  ClipboardList,
  FileText,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Recycle,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { motion } from "framer-motion";
import { WasteSummaryCard } from "@/components/dashboard/WasteSummaryCard";
import { ProductionEfficiencyChart } from "@/components/dashboard/ProductionEfficiencyChart";
import { SlowMovingItemsCard } from "@/components/dashboard/SlowMovingItemsCard";

interface StockItem {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  stockMinimum: number;
  unit: { name: string };
}

interface RecentTransaction {
  id: string;
  type: string;
  source?: string; // Add source
  date: string;
  quantity: number;
  memo: string;
  item: {
    name: string;
    code: string;
    unit: { name: string };
  };
  user: { name: string };
}

interface RecentProductionRequest {
  id: string;
  spkNumber: string;
  productName: string;
  status: string;
  createdAt: string;
  user: { name: string };
}

interface RecentPurchaseOrder {
  id: string;
  nomorPO: string;
  kepada: string;
  tanggal: string;
  user: { name: string };
}

interface DashboardData {
  totalStokBahanBaku: number;
  totalStokBarangJadi: number;
  stokBawahMinimum: StockItem[];
  barangMasukHariIni: {
    totalQuantity: number;
    totalTransactions: number;
  };
  barangKeluarHariIni: {
    totalQuantity: number;
    totalTransactions: number;
  };
  totalNilaiStok: number;
  recentActivities: {
    transactions: RecentTransaction[];
    productionRequests: RecentProductionRequest[];
    purchaseOrders: RecentPurchaseOrder[];
  };
  // Data baru
  topBarangKeluar: Array<{
    itemId: string;
    itemName: string;
    itemCode: string;
    totalQuantity: number;
    totalTransactions: number;
    unit: string;
  }>;
  topNilaiStok: Array<{
    itemId: string;
    itemName: string;
    itemCode: string;
    currentStock: number;
    stockValue: number;
    unit: string;
  }>;
  chartData: Array<{
    date: string;
    masuk: number;
    keluar: number;
  }>;
  stokBawahMinimumByCategory: {
    BAHAN_BAKU: number;
    BARANG_JADI: number;
  };
  poJatuhTempo: Array<{
    id: string;
    nomorPO: string;
    kepada: string;
    jatuhTempo: string;
    status: string;
    total: number;
    user: string;
    isOverdue: boolean;
  }>;
  prPending: Array<{
    id: string;
    spkNumber: string;
    productName: string;
    status: string;
    createdAt: string;
    user: string;
    isOverdue: boolean;
  }>;
}

export default function DashboardPage() {
  // const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // Removed unused state
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  
  // State for filters
  type DatePreset = "custom" | "week" | "month" | "year";
  const [datePreset, setDatePreset] = useState<DatePreset>("week");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.1,
        duration: 0.5,
        ease: "easeOut" as const, 
      },
    }),
  };
  const [time, setTime] = useState(
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getDateRangeFromPreset = (preset: DatePreset) => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (preset === "week") {
      const day = now.getDay() || 7;
      from.setDate(now.getDate() - day + 1);
    }

    if (preset === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (preset === "year") {
      from = new Date(now.getFullYear(), 0, 1);
    }

    return {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    };
  };

  useEffect(() => {
    if (datePreset !== "custom") {
      const range = getDateRangeFromPreset(datePreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [datePreset]);

  // Fetch data when dateFrom or dateTo changes
  useEffect(() => {
    if (dateFrom && dateTo) {
        fetchDashboardData();
    }
  }, [dateFrom, dateTo]);

  const fetchDashboardData = async () => {
    try {
      !data ? setLoading(true) : setRefetching(true);

      const params = new URLSearchParams();
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const result = await res.json();

      if (res.ok) setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  };


  if (loading && !data) {
    return (
      <Layout>
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Breadcrumb */}
          <Skeleton className="h-5 w-40" />

          {/* Header */}
          <div className="flex justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stok Minimum */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <Skeleton className="h-5 w-40 mb-4" />
              <SkeletonTable rows={5} cols={3} />
            </div>

            {/* Nilai Stok */}
            <div className="bg-white rounded-2xl p-10 text-center space-y-4 shadow-sm">
              <Skeleton className="h-20 w-20 mx-auto rounded-2xl" />
              <Skeleton className="h-8 w-40 mx-auto" />
              <Skeleton className="h-4 w-56 mx-auto" />
            </div>

            {/* Aktivitas */}
            <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600">Gagal memuat data dashboard</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      title: "Stok Bahan Baku",
      value: data.totalStokBahanBaku.toLocaleString("id-ID"),
      subtitle: "Total unit tersedia",
      icon: Package,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Stok Barang Jadi",
      value: data.totalStokBarangJadi.toLocaleString("id-ID"),
      subtitle: "Siap distribusi",
      icon: Factory,
      gradient: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Barang Masuk",
      value: `${data.barangMasukHariIni.totalTransactions} trx`,
      subtitle: `${data.barangMasukHariIni.totalQuantity.toLocaleString(
        "id-ID",
      )} unit`,
      icon: ArrowDownCircle,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "Barang Keluar",
      value: `${data.barangKeluarHariIni.totalTransactions} trx`,
      subtitle: `${data.barangKeluarHariIni.totalQuantity.toLocaleString(
        "id-ID",
      )} unit`,
      icon: ArrowUpCircle,
      gradient: "from-orange-500 to-amber-600",
    },
  ];

  // Combine all recent activities and sort by date
  const allActivities = [
    ...data.recentActivities.transactions.map((tx) => ({
      type: "transaction" as const,
      id: tx.id,
      date: tx.date,
      title:
        tx.type === "MASUK"
          ? (tx.source === "DAUR_ULANG" ? `Hasil Daur Ulang: ${tx.item.name}` : `Barang Masuk: ${tx.item.name}`)
          : `Barang Keluar: ${tx.item.name}`,
      description: `${tx.quantity} ${tx.item.unit.name} - ${tx.memo}`,
      user: tx.user.name,
      icon: tx.type === "MASUK" ? (tx.source === "DAUR_ULANG" ? Recycle : ArrowDownCircle) : ArrowUpCircle,
      color: tx.type === "MASUK" ? (tx.source === "DAUR_ULANG" ? "text-green-600" : "text-green-600") : "text-orange-600",
      bgColor: tx.type === "MASUK" ? (tx.source === "DAUR_ULANG" ? "bg-green-100" : "bg-green-100") : "bg-orange-100",
      href: `/transaksi/${
        tx.type === "MASUK" ? "barang-masuk" : "barang-keluar"
      }`,
    })),
    ...data.recentActivities.productionRequests.map((pr) => ({
      type: "production" as const,
      id: pr.id,
      date: pr.createdAt,
      title: `Permintaan Produksi: ${pr.spkNumber}`,
      description: pr.productName,
      user: pr.user.name,
      icon: ClipboardList,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      href: `/permintaan-produksi`,
    })),
    ...data.recentActivities.purchaseOrders.map((po) => ({
      type: "purchase" as const,
      id: po.id,
      date: po.tanggal,
      title: `Purchase Order: ${po.nomorPO}`,
      description: `Kepada: ${po.kepada}`,
      user: po.user.name,
      icon: FileText,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      href: `/transaksi/purchase-order`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* === Preset Filter (Segmented Modern) === */}
            <div
              className="
        relative flex items-center
        p-1
        rounded-2xl
        bg-gradient-to-b from-gray-50 to-white
        border border-gray-200
        shadow-sm
      "
            >
              {[
                { label: "Minggu", value: "week" },
                { label: "Bulan", value: "month" },
                { label: "Tahun", value: "year" },
              ].map((p) => {
                const active = datePreset === p.value;

                return (
                  <button
                    key={p.value}
                    onClick={() => setDatePreset(p.value as DatePreset)}
                    className={`
              relative z-10
              px-4 py-1.5
              text-sm font-semibold
              rounded-xl
              transition-all duration-200
              ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }
            `}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* === Refresh Button === */}
            <button
              onClick={fetchDashboardData}
              title="Refresh"
              className="
          group
          p-3
          rounded-2xl
          bg-gradient-to-br from-white to-gray-50
          border border-gray-200
          shadow-sm
          hover:shadow-md
          hover:border-blue-300
          active:scale-95
          transition-all
        "
            >
              <RefreshCw
                size={18}
                className={`
            text-blue-600
            transition-transform duration-300
            group-hover:rotate-180
            ${refetching ? "animate-spin" : ""}
          `}
              />
            </button>
          </div>

          {/* === Custom Date Range === */}
          <div
            className="
        flex items-center gap-2
        px-4 py-2
        rounded-2xl
        bg-white
        border border-gray-200
        shadow-sm
        hover:border-blue-300
        transition
        flex-1 md:flex-initial justify-between md:justify-start
      "
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDatePreset("custom");
                  setDateFrom(e.target.value);
                }}
                className="text-sm text-gray-700 bg-transparent focus:outline-none"
              />
            </div>

            <span className="text-gray-300 text-sm">—</span>

            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDatePreset("custom");
                setDateTo(e.target.value);
              }}
              className="text-sm text-gray-700 bg-transparent focus:outline-none"
            />
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <motion.div
              key={i}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                </div>
                <div
                  className={`p-3 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow`}
                >
                  <stat.icon size={26} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stok Minimum */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">
                Stok di Bawah Minimum
              </h3>
            </div>
            <div className="p-6">
              {refetching ? (
                <SkeletonTable rows={5} cols={3} />
              ) : data.stokBawahMinimum.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-green-100 mb-3">
                    <AlertTriangle className="text-green-600" size={22} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Semua stok aman
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tidak ada stok di bawah minimum
                  </p>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="py-2 text-left">Barang</th>
                      <th className="py-2 text-right text-red-600">Stock</th>
                      <th className="py-2 text-right text-gray-400">Min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stokBawahMinimum.slice(0, 5).map((item, i) => (
                      <tr
                        key={item.id}
                        className={`${i % 2 === 0 ? "bg-red-50/50" : ""} hover:bg-red-50 transition`}
                      >
                        <td className="py-3">
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">{item.code}</p>
                        </td>
                        <td className="py-3 text-right font-semibold text-red-600">
                          {item.currentStock.toLocaleString("id-ID")}{" "}
                          {item.unit.name}
                        </td>
                        <td className="py-3 text-right text-gray-600">
                          {item.stockMinimum.toLocaleString("id-ID")}{" "}
                          {item.unit.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>

          {/* Nilai Stok */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <DollarSign className="text-blue-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">Nilai Stok Total</h3>
            </div>
            <div className="p-10 text-center">
              {refetching ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-20 mx-auto rounded-2xl" />
                  <Skeleton className="h-8 w-40 mx-auto" />
                  <Skeleton className="h-4 w-56 mx-auto" />
                </div>
              ) : (
                <>
                  <div className="inline-flex w-20 h-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-4 shadow-lg">
                    <DollarSign className="text-white" size={40} />
                  </div>
                  <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    {formatCurrency(data.totalNilaiStok)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Berdasarkan rata-rata tertimbang harga pembelian
                  </p>
                </>
              )}
            </div>
          </motion.div>

          {/* Aktivitas Terbaru */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100">
                <Clock className="text-indigo-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">Aktivitas Terbaru</h3>
            </div>
            <div className="p-6 space-y-3 max-h-[360px] overflow-y-auto">
              {refetching
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))
                : allActivities.slice(0, 10).map((activity, i) => {
                    // ambil 10, tapi scroll
                    const Icon = activity.icon;
                    return (
                      <Link
                        key={activity.id}
                        href={activity.href}
                        className="block p-4 rounded-xl hover:bg-gray-50 transition hover:translate-x-1"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl ${activity.bgColor}`}>
                            <Icon size={16} className={activity.color} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.description}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(activity.date)} • {activity.user}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
            </div>
          </motion.div>

          {/* Waste Summary Card (New) */}
          <motion.div
            custom={5}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="h-full"
          >
            <WasteSummaryCard dateFrom={dateFrom} dateTo={dateTo} />
          </motion.div>

          {/* Efisiensi Produksi */}
          <motion.div
            custom={6}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="h-full"
          >
            <ProductionEfficiencyChart dateFrom={dateFrom} dateTo={dateTo} />
          </motion.div>

          {/* Slow Moving Items */}
          <motion.div
            custom={7}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="h-full"
          >
            <SlowMovingItemsCard />
          </motion.div>
        </div>

        {/* ========== SECTION BARU: RINGKASAN STOK & PERGERAKAN ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Barang Paling Sering Keluar */}
          <motion.div
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-100">
                <TrendingDown className="text-orange-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">
                Top 5 Barang Paling Sering Keluar
              </h3>
              <span className="text-xs text-gray-500 ml-auto">
                30 hari terakhir
              </span>
            </div>
            <div className="p-6">
              {refetching ? (
                <SkeletonTable rows={5} cols={3} />
              ) : data.topBarangKeluar.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  Belum ada data
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topBarangKeluar.map((item, index) => (
                    <div
                      key={item.itemId}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.itemName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.itemCode}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {item.totalQuantity.toLocaleString("id-ID")}{" "}
                          {item.unit}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.totalTransactions} transaksi
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Top 5 Barang dengan Nilai Stok Terbesar */}
          <motion.div
            custom={4}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100">
                <DollarSign className="text-emerald-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">
                Top 5 Nilai Stok Terbesar
              </h3>
            </div>
            <div className="p-6">
              {refetching ? (
                <SkeletonTable rows={5} cols={3} />
              ) : data.topNilaiStok.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  Belum ada data
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topNilaiStok.map((item, index) => (
                    <div
                      key={item.itemId}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.itemName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.currentStock.toLocaleString("id-ID")}{" "}
                            {item.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatCurrency(item.stockValue)}
                        </p>
                        <p className="text-xs text-gray-500">{item.itemCode}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Grafik Tren 7 Hari */}
        <motion.div
          custom={5}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100">
              <BarChart3 className="text-blue-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">
              Tren Barang Masuk vs Keluar
            </h3>
          </div>
          <div className="p-6">
            {refetching ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-4">
                {/* Legend */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500"></div>
                    <span className="text-gray-600">Barang Masuk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-orange-500"></div>
                    <span className="text-gray-600">Barang Keluar</span>
                  </div>
                </div>

                {/* Simple Bar Chart */}
                <div className="flex items-end gap-2 h-48">
                  {data.chartData.map((day, index) => {
                    const maxValue = Math.max(
                      ...data.chartData.map((d) => Math.max(d.masuk, d.keluar)),
                    );
                    const masukHeight =
                      maxValue > 0 ? (day.masuk / maxValue) * 100 : 0;
                    const keluarHeight =
                      maxValue > 0 ? (day.keluar / maxValue) * 100 : 0;
                    const date = new Date(day.date);
                    const dayLabel = date.toLocaleDateString("id-ID", {
                      weekday: "short",
                    });

                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="w-full flex flex-col items-center justify-end gap-1 h-40">
                          <div
                            className="w-full bg-green-500 rounded-t hover:bg-green-600 transition"
                            style={{ height: `${masukHeight}%` }}
                            title={`Masuk: ${day.masuk.toLocaleString("id-ID")}`}
                          ></div>
                          <div
                            className="w-full bg-orange-500 rounded-t hover:bg-orange-600 transition"
                            style={{ height: `${keluarHeight}%` }}
                            title={`Keluar: ${day.keluar.toLocaleString("id-ID")}`}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{dayLabel}</p>
                        <p className="text-[10px] text-gray-400">
                          {date.getDate()}/{date.getMonth() + 1}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ========== SECTION BARU: ALERT & RISIKO ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stok Bawah Minimum per Kategori */}
          <motion.div
            custom={6}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100">
                <AlertCircle className="text-red-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">
                Stok Bawah Minimum
              </h3>
            </div>
            <div className="p-6">
              {refetching ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Bahan Baku</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">
                          {data.stokBawahMinimumByCategory.BAHAN_BAKU}
                        </p>
                      </div>
                      <Package className="text-red-400" size={32} />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Barang Jadi</p>
                        <p className="text-2xl font-bold text-orange-600 mt-1">
                          {data.stokBawahMinimumByCategory.BARANG_JADI}
                        </p>
                      </div>
                      <Factory className="text-orange-400" size={32} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* PO Jatuh Tempo */}
          <motion.div
            custom={7}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100">
                <AlertTriangle className="text-amber-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">PO Jatuh Tempo</h3>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {refetching ? (
                <SkeletonTable rows={5} cols={2} />
              ) : data.poJatuhTempo.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-green-100 mb-3">
                    <FileText className="text-green-600" size={22} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Semua PO aman
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.poJatuhTempo.map((po) => (
                    <Link
                      key={po.id}
                      href="/transaksi/purchase-order"
                      className="block p-3 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {po.nomorPO}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {po.kepada}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(po.jatuhTempo)}
                          </p>
                        </div>
                        {po.isOverdue ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                            Segera
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Permintaan Produksi Pending */}
          <motion.div
            custom={8}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100">
                <ClipboardList className="text-purple-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">
                PR Pending/Overdue
              </h3>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {refetching ? (
                <SkeletonTable rows={5} cols={2} />
              ) : data.prPending.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-green-100 mb-3">
                    <CheckCircle className="text-green-600" size={22} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Semua PR sudah di-approve
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.prPending.map((pr) => (
                    <Link
                      key={pr.id}
                      href="/permintaan-produksi"
                      className="block p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {pr.spkNumber}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {pr.productName}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(pr.createdAt)} • {pr.user}
                          </p>
                        </div>
                        {pr.isOverdue ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                            Pending
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
