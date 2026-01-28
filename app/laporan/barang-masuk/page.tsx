/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "react-toastify";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PackagePlus, Filter, FileText } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

interface Transaction {
  id: string;
  date: string;
  item: {
    name: string;
    code: string;
    unit: { name: string };
    hargaSatuan?: number | null;
    itemType?: {
      name: string;
    };
  };
  quantity: number;
  price: number | null;
  vendor: string | null;
  memo: string;
  user: { name: string };
}

export default function LaporanBarangMasukPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterItemId, setFilterItemId] = useState("");
  const [openMemo, setOpenMemo] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  /* ================= PAGINATION ================= */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredTransactions = transactions.filter((tx) => {
    if (!search.trim()) return true;

    const q = search.toLowerCase();

    return (
      tx.item.name.toLowerCase().includes(q) ||
      tx.item.code.toLowerCase().includes(q) ||
      tx.item.itemType?.name?.toLowerCase().includes(q)
    );
  });

  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    endIndex,
  );

  /* reset page kalau filter / pageSize berubah */
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, filterItemId, pageSize, search]);

  useEffect(() => {
    fetchTransactions();
    fetchItems();
  }, [startDate, endDate, filterItemId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = "/api/transactions?type=MASUK";
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (filterItemId) url += `&itemId=${filterItemId}`;

      const res = await fetch(url);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    const res = await fetch("/api/items?isActive=true");
    const data = await res.json();
    setItems(data.items || []);
  };

  const totalQuantity = transactions.reduce((sum, tx) => sum + tx.quantity, 0);

  const totalValue = transactions.reduce((sum, tx) => {
    const unitPrice = tx.item.hargaSatuan ?? 0;
    return sum + tx.quantity * unitPrice;
  }, 0);

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadCSV = async () => {
    if (transactions.length === 0) {
      toast.warning("Tidak ada data untuk di-download");
      return;
    }

    try {
      setIsDownloading(true);

      const headers = [
        "Tanggal",
        "Nama Barang",
        "Kode Barang",
        "Jenis Barang",
        "Qty",
        "Satuan",
        "Harga Satuan",
        "Total Harga",
        "Vendor",
        "User",
        "Memo",
      ];

      const rows = transactions.map((tx) => {
        const hargaSatuan = tx.item?.hargaSatuan ?? 0;
        const totalHarga = tx.quantity * hargaSatuan;

        return [
          formatDate(tx.date),
          tx.item?.name ?? "",
          tx.item?.code ?? "",
          tx.item?.itemType?.name ?? "",
          tx.quantity,
          tx.item?.unit?.name ?? "",
          hargaSatuan,
          totalHarga,
          tx.vendor ?? "",
          tx.user?.name ?? "",
          tx.memo ?? "",
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `laporan-barang-masuk-${startDate || "all"}-${endDate || "all"}.csv`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // biar loading-nya kerasa smooth (optional)
      await new Promise((res) => setTimeout(res, 800));
    } catch (error) {
      console.error("Gagal download CSV:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <Breadcrumb />

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white shadow-lg transition-all hover:shadow-xl">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Total Quantity Masuk
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {totalQuantity.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <PackagePlus size={26} />
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-lg transition-all hover:shadow-xl">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Total Nilai Barang
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {formatCurrency(totalValue)}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <PackagePlus size={26} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* LEFT */}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
              <Filter size={16} className="text-emerald-600" />
              Filter Data
            </div>

            {/* RIGHT */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Download */}
              <button
                onClick={downloadCSV}
                disabled={isDownloading}
                className={`
    relative inline-flex items-center justify-center gap-2
    rounded-xl
    px-5 py-2.5
    text-xs font-semibold
    transition-all
    focus:outline-none focus:ring-2 focus:ring-emerald-500/40

    ${
      isDownloading
        ? "cursor-not-allowed bg-emerald-400 text-white"
        : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-sm hover:shadow-md active:scale-[0.98]"
    }
  `}
              >
                {isDownloading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Menyiapkan CSV...
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6 items-end">
            {/* Tanggal Mulai */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm
        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Tanggal Akhir */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm
        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Search */}
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Cari Barang
              </label>
              <input
                type="text"
                placeholder="Nama / Kode / Jenis barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm
        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Barang */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Barang
              </label>
              <select
                value={filterItemId}
                onChange={(e) => setFilterItemId(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm
        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Semua Barang</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <div>
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setFilterItemId("");
                  setSearch("");
                }}
                className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50
        text-sm font-semibold text-gray-700
        hover:bg-gray-100 transition
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {loading ? (
            <SkeletonTable rows={6} cols={8} />
          ) : totalItems === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              Data transaksi tidak ditemukan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                {/* Header */}
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {[
                      "Tanggal",
                      "Barang",
                      "Qty",
                      "Harga Satuan",
                      "Total Harga",
                      "Vendor",
                      "Memo",
                      "User",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider
    text-gray-500 dark:text-gray-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(tx.date)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {tx.item.name}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {tx.item.code} • {tx.item.itemType?.name}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {tx.quantity} {tx.item.unit.name}
                      </td>

                      <td className="px-5 py-4 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                        {tx.item.hargaSatuan != null
                          ? formatCurrency(tx.item.hargaSatuan)
                          : "-"}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-800 dark:text-gray-200">
                        {tx.item.hargaSatuan != null
                          ? formatCurrency(tx.quantity * tx.item.hargaSatuan)
                          : "-"}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {tx.vendor || "-"}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {tx.memo ? (
                          <button
                            onClick={() => {
                              setSelectedMemo(tx.memo);
                              setOpenMemo(true);
                            }}
                            className="text-gray-400 hover:text-emerald-600 transition"
                            title="Lihat Memo"
                          >
                            <FileText size={18} />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {tx.user.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================= PAGINATION ================= */}
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
                onClick={() => setPage(1)}
                disabled={page === 1}
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
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
          mx-1 px-4 h-9
          flex items-center
          rounded-xl
          bg-gradient-to-r from-blue-600 to-blue-500
          text-white text-sm font-semibold
          shadow-sm
        "
              >
                {page}
                <span className="mx-1 opacity-70">/</span>
                {totalPages}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
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
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
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

        {openMemo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Memo Transaksi
                </h3>
                <button
                  onClick={() => setOpenMemo(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {selectedMemo}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setOpenMemo(false)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
