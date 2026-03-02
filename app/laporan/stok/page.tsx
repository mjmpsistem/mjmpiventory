"use client";

import { toast } from "react-toastify";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertTriangle, Filter, Package, FileText, Search, Loader2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  itemType: { name: string };
  unit: { name: string };
  stockMinimum: number;
  currentStock: number;
  reservedStock: number;
  hargaSatuan?: number | null;
  transactions?: Array<{ quantity: number; price: number | null }>;
}

interface StockTransaction {
  date: string;
  quantity: number;
  memo?: string | null;
  vendor?: string | null;
  user: { name: string };
  item: {
    name: string;
    code: string;
    unit: { name: string };
    hargaSatuan?: number | null;
    itemType?: { name: string };
  };
}

export default function LaporanStokPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("id-ID");

  /* FILTER */
  const [filterCategory, setFilterCategory] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [search, setSearch] = useState("");

  /* PAGINATION */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchItems();
  }, [filterCategory, showLowStock]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = "/api/items?isActive=true";
      if (filterCategory) url += `&category=${filterCategory}`;

      const res = await fetch(url);
      const data = await res.json();

      let filteredItems = data.items || [];
      if (showLowStock) {
        filteredItems = filteredItems.filter(
          (item: Item) => item.currentStock < item.stockMinimum,
        );
      }

      setItems(filteredItems);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  /* RESET PAGE kalau filter / pageSize berubah */
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, showLowStock, pageSize]);

  /* PAGINATION LOGIC */
  const filteredItems = useMemo(() => {
    if (!search) return items;

    const q = search.toLowerCase();

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.itemType?.name?.toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedItems = useMemo(
    () => filteredItems.slice(startIndex, endIndex),
    [filteredItems, startIndex, endIndex],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  /* PRICE LOGIC */
  const calculateWeightedAveragePrice = (item: Item): number => {
    if (!item.transactions || item.transactions.length === 0) return 0;

    let totalValue = 0;
    let totalQty = 0;

    for (const tx of item.transactions) {
      if (tx.price && tx.price > 0 && tx.quantity > 0) {
        totalValue += tx.quantity * tx.price;
        totalQty += tx.quantity;
      }
    }

    return totalQty > 0 ? Math.round((totalValue / totalQty) * 100) / 100 : 0;
  };

  const getUnitPrice = (item: Item): number =>
    item.hargaSatuan && item.hargaSatuan > 0
      ? item.hargaSatuan
      : calculateWeightedAveragePrice(item);

  const calculateTotalValue = () =>
    items.reduce((total, item) => {
      return total + item.currentStock * getUnitPrice(item);
    }, 0);

  const downloadCSV = async () => {
    try {
      if (items.length === 0) {
        toast.warning("Tidak ada data untuk di-download");
        return;
      }

      setIsDownloading(true);

      const headers = [
        "Kode Barang",
        "Nama Barang",
        "Jenis Barang",
        "Kategori",
        "Stok Fisik",
        "Reserved",
        "Stok Tersedia",
        "Satuan",
        "Harga Satuan",
        "Nilai Stok",
      ];

      const rows = items.map((item) => {
        const unitPrice = getUnitPrice(item);

        // DEFINISI JELAS
        const physicalStock = item.currentStock;
        const reservedStock = item.reservedStock;
        const availableStock = physicalStock - reservedStock;

        // NILAI STOK SELALU PAKAI FISIK
        const stockValue = Math.round(physicalStock * unitPrice * 100) / 100;

        const isLowStock = availableStock < item.stockMinimum;

        return [
          item.code,
          item.name,
          item.itemType.name,
          item.category === "BAHAN_BAKU" ? "Bahan Baku" : "Barang Jadi",
          physicalStock,
          item.reservedStock,
          availableStock,
          item.unit.name,
          unitPrice,
          stockValue,
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-stok-${startDate || "all"}-${endDate || "all"}.csv`;
      link.click();

      URL.revokeObjectURL(url);

      await new Promise((res) => setTimeout(res, 800));
    } catch (error) {
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <Breadcrumb />

        {/* SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div
            className="group relative overflow-hidden rounded-2xl
    bg-gradient-to-br from-blue-500 to-indigo-600
    p-6 text-white shadow-lg transition-all
    hover:-translate-y-1 hover:shadow-xl"
          >
            {/* glow */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Total Nilai Stok
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {formatCurrency(calculateTotalValue())}
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <Package size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* FILTER */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Filter size={16} className="text-blue-600" />
              Filter Data
            </div>

            {/* Download */}
            <button
              onClick={downloadCSV}
              disabled={isDownloading}
              className={`
        relative inline-flex items-center gap-2 w-full sm:w-auto justify-center
        rounded-xl px-4 py-2.5
        text-xs font-semibold text-white
        transition-all duration-200
        shadow-sm
        ${
          isDownloading
            ? "bg-emerald-400 cursor-not-allowed"
            : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.97]"
        }
      `}
            >
              {isDownloading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Menyiapkan...
                </>
              ) : (
                <>
                  <FileText size={15} />
                  Download CSV
                </>
              )}
            </button>
          </div>

          {/* FILTER BODY */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* KIRI: SEARCH */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                Pencarian
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nama / kode barang..."
                  className="
            w-full
            h-[42px]
            rounded-xl border border-gray-300 bg-white
            pl-9 pr-3 text-sm
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30
            transition shadow-sm
          "
                />
              </div>
            </div>

            {/* TENGAH: KATEGORI + LOW STOCK */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                Kategori & Status
              </label>

              <div className="flex items-center gap-3">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="
            flex-1 h-[42px]
            rounded-xl border border-gray-300 bg-white px-3 text-sm
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 shadow-sm
          "
                >
                  <option value="">Semua Kategori</option>
                  <option value="BAHAN_BAKU">Bahan Baku</option>
                  <option value="BARANG_JADI">Barang Jadi</option>
                </select>

                <label
                  className="
            inline-flex items-center gap-2
            h-[42px]
            rounded-xl border border-red-200
            bg-red-50 px-3
            text-sm text-red-700 cursor-pointer
            transition hover:bg-red-100 shadow-sm
          "
                >
                  <input
                    type="checkbox"
                    checked={showLowStock}
                    onChange={(e) => setShowLowStock(e.target.checked)}
                    className="hidden"
                  />

                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border
              ${
                showLowStock
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-red-400"
              }`}
                  >
                    {showLowStock && <span className="text-xs">✓</span>}
                  </div>

                  <AlertTriangle size={14} />
                  <span className="hidden sm:inline">Stok Min</span>
                  <span className="sm:hidden">Min</span>
                </label>
              </div>
            </div>

            {/* KANAN: DATE RANGE */}
            <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                Periode (Filter Tabel)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="
            h-[42px]
            w-full rounded-xl border border-gray-300 bg-white px-3 text-sm
            focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 shadow-sm
          "
                />

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="
            h-[42px]
            w-full rounded-xl border border-gray-300 bg-white px-3 text-sm
            focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 shadow-sm
          "
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            Digunakan untuk filter tabel & export CSV
          </p>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
          {loading ? (
            <SkeletonTable rows={6} cols={10} />
          ) : paginatedItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Data stok tidak ditemukan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Kode",
                      "Nama Barang",
                      "Jenis",
                      "Kategori",
                      "Stok Fisik",
                      "Reserved",
                      "Tersedia",
                      "Min",
                      "Harga",
                      "Nilai Stok",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.map((item) => {
                    const unitPrice = getUnitPrice(item);

                    // DEFINISI JELAS
                    const physicalStock = item.currentStock;
                    const reservedStock = item.reservedStock;
                    const availableStock = physicalStock - reservedStock;

                    // NILAI STOK SELALU PAKAI FISIK
                    const stockValue =
                      Math.round(physicalStock * unitPrice * 100) / 100;

                    const isLowStock = availableStock < item.stockMinimum;

                    return (
                      <tr
                        key={item.id}
                        className={`transition ${
                          isLowStock
                            ? "bg-red-50 hover:bg-red-100"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {/* Kode */}
                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                          {item.code}
                        </td>

                        {/* Nama */}
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {item.name}
                        </td>

                        {/* Jenis */}
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {item.itemType.name}
                        </td>

                        {/* Kategori */}
                        <td className="px-5 py-4 text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium
                    ${
                      item.category === "BAHAN_BAKU"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                          >
                            {item.category === "BAHAN_BAKU"
                              ? "Bahan Baku"
                              : "Barang Jadi"}
                          </span>
                        </td>

                        {/* Stok Fisik */}
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                          {physicalStock} {item.unit.name}
                        </td>

                        {/* Reserved */}
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {item.reservedStock} {item.unit.name}
                        </td>

                        {/* Tersedia */}
                        <td className="px-5 py-4 text-sm font-semibold">
                          <span
                            className={
                              availableStock <= 0
                                ? "text-red-600"
                                : "text-gray-900"
                            }
                          >
                            {availableStock} {item.unit.name}
                          </span>
                        </td>

                        {/* Minimum */}
                        <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {item.stockMinimum} {item.unit.name}
                        </td>

                        {/* Harga */}
                        <td className="px-5 py-4 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                          {formatCurrency(unitPrice)}
                        </td>

                        {/* Nilai Stok */}
                        <td className="px-5 py-4 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(stockValue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          className="
    mt-4
    flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
    px-6 py-4
    rounded-2xl
    bg-white/80 backdrop-blur
    border border-gray-200/60
    shadow-[0_8px_30px_rgb(0,0,0,0.04)]
  "
        >
          {/* Info */}
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {totalItems === 0 ? 0 : startIndex + 1}–
              {Math.min(endIndex, totalItems)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-gray-900">{totalItems}</span>{" "}
            data
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rows */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="
          px-3 py-1.5
          rounded-xl
          border border-gray-200
          bg-gray-50
          text-sm font-medium
          hover:bg-white
          focus:outline-none focus:ring-2 focus:ring-blue-500/40
          transition
        "
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="
          h-9 w-9 flex items-center justify-center
          rounded-xl
          border border-gray-200
          bg-white text-gray-600
          hover:bg-gray-100
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition
        "
              >
                «
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="
          h-9 w-9 flex items-center justify-center
          rounded-xl
          border border-gray-200
          bg-white text-gray-600
          hover:bg-gray-100
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition
        "
              >
                ‹
              </button>

              <div
                className="
          mx-1 px-4 h-9 min-w-[72px]
          flex items-center justify-center
          rounded-xl
          bg-gradient-to-r from-blue-600 to-blue-500
          text-white text-sm font-semibold
          shadow-sm
        "
              >
                {currentPage}
                <span className="mx-1 opacity-70">/</span>
                {totalPages}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="
          h-9 w-9 flex items-center justify-center
          rounded-xl
          border border-gray-200
          bg-white text-gray-600
          hover:bg-gray-100
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition
        "
              >
                ›
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="
          h-9 w-9 flex items-center justify-center
          rounded-xl
          border border-gray-200
          bg-white text-gray-600
          hover:bg-gray-100
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition
        "
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
