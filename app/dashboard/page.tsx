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
} from "lucide-react";
import Link from "next/link";

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
}

export default function DashboardPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [date]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const url = date ? `/api/dashboard?date=${date}` : "/api/dashboard";
      const res = await fetch(url);
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        console.error("Error fetching dashboard:", result.error);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Memuat data dashboard...</p>
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
        "id-ID"
      )} unit`,
      icon: ArrowDownCircle,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "Barang Keluar",
      value: `${data.barangKeluarHariIni.totalTransactions} trx`,
      subtitle: `${data.barangKeluarHariIni.totalQuantity.toLocaleString(
        "id-ID"
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
          ? `Barang Masuk: ${tx.item.name}`
          : `Barang Keluar: ${tx.item.name}`,
      description: `${tx.quantity} ${tx.item.unit.name} - ${tx.memo}`,
      user: tx.user.name,
      icon: tx.type === "MASUK" ? ArrowDownCircle : ArrowUpCircle,
      color: tx.type === "MASUK" ? "text-green-600" : "text-orange-600",
      bgColor: tx.type === "MASUK" ? "bg-green-100" : "bg-orange-100",
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-sm border-none focus:ring-0"
              />
            </div>
            <button
              onClick={fetchDashboardData}
              className="p-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, i) => (
            <div
              key={i}
              className="relative bg-white rounded-2xl p-6 shadow-sm
                 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${stat.gradient}`}
              />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{stat.subtitle}</p>
                </div>

                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow`}
                >
                  <stat.icon size={26} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stok Minimum */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">
                Stok di Bawah Minimum
              </h3>
            </div>

            <div className="p-6">
              {data.stokBawahMinimum.length === 0 ? (
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
                      <th className="py-2 text-right">Stok</th>
                      <th className="py-2 text-right">Minimum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stokBawahMinimum.slice(0, 5).map((item, i) => (
                      <tr
                        key={item.id}
                        className={`
                ${i % 2 === 0 ? "bg-red-50/50" : ""}
                hover:bg-red-50 transition
              `}
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
          </div>

          {/* Nilai Stok */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100">
                <DollarSign className="text-blue-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">Nilai Stok Total</h3>
            </div>

            <div className="p-10 text-center">
              <div className="inline-flex w-20 h-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-4 shadow-lg">
                <DollarSign className="text-white" size={40} />
              </div>

              <p className="text-4xl font-extrabold text-gray-900 tracking-tight">
                {formatCurrency(data.totalNilaiStok)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Berdasarkan harga transaksi terakhir
              </p>
            </div>
          </div>

          {/* Aktivitas Terbaru */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100">
                <Clock className="text-indigo-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900">Aktivitas Terbaru</h3>
            </div>

            <div className="p-6 space-y-3">
              {allActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <Link
                    key={activity.id}
                    href={activity.href}
                    className="block p-4 rounded-xl hover:bg-gray-50 transition"
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
          </div>
        </div>
      </div>
    </Layout>
  );
}
