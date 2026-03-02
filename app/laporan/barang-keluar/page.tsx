"use client";

import { toast } from "react-toastify";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { Filter, PackageMinus, FileText, Package, X } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

interface Transaction {
  id: string;
  date: string;
  item: {
    name: string;
    code: string;
    unit: { name: string };
    itemType?: {
      name: string;
    } | null;
    hargaSatuan?: number | null;
  };
  quantity: number;
  destination: string | null;
  spkNumber: string | null;
  source: string | null;
  memo: string;
  user: { name: string };
}

export default function LaporanBarangKeluarPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  /* FILTER */
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterSpk, setFilterSpk] = useState("");

  /* PAGINATION */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* MEMO */
  const [openMemo, setOpenMemo] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate, filterSpk]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = "/api/transactions?type=KELUAR";
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      const data = await res.json();

      let filtered = data.transactions || [];
      if (filterSpk.trim()) {
        const q = filterSpk.toLowerCase();

        filtered = filtered.filter(
          (tx: Transaction) =>
            tx.spkNumber?.toLowerCase().includes(q) || // SPK
            tx.item.name.toLowerCase().includes(q) || // Nama barang
            tx.item.code.toLowerCase().includes(q) || // Kode barang
            tx.item.itemType?.name?.toLowerCase().includes(q) || // Jenis barang
            tx.destination?.toLowerCase().includes(q), // Tujuan
        );
      }

      setTransactions(filtered);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  /* RESET PAGE kalau filter / pageSize berubah */
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, filterSpk, pageSize]);

  /* PAGINATION LOGIC */
  const totalItems = transactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedData = useMemo(
    () => transactions.slice(startIndex, endIndex),
    [transactions, startIndex, endIndex],
  );

  const totalQuantity = transactions.reduce((sum, tx) => sum + tx.quantity, 0);

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
        "Tujuan",
        "Sumber",
        "SPK",
        "Harga Satuan",
        "Total Harga",
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
          tx.destination ?? "",
          tx.source ?? "-",
          tx.spkNumber ?? "",
          hargaSatuan,
          totalHarga,
          tx.user?.name ?? "",
          tx.memo ?? "",
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
      link.download = `laporan-barang-keluar-${startDate || "all"}-${endDate || "all"}.csv`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // biar animasi loading kerasa smooth
      await new Promise((res) => setTimeout(res, 700));
    } catch (err) {
      console.error("Gagal download CSV:", err);
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
    bg-gradient-to-br from-rose-500 to-red-600
    dark:from-rose-600 dark:to-red-700
    p-6 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
          >
            {/* glow */}
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Total Quantity Keluar
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  {totalQuantity.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <PackageMinus size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* FILTER */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Filter size={16} className="text-blue-600" />
              Filter Data
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={downloadCSV}
                disabled={isDownloading || transactions.length === 0}
                className="
        inline-flex items-center gap-2
        rounded-xl
        bg-gradient-to-r from-blue-600 to-blue-500
        px-4 py-2
        text-xs font-semibold text-white
        shadow-md
        hover:from-blue-700 hover:to-blue-600
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        transition
      "
              >
                {isDownloading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Menyiapkan CSV…
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Start Date */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* SPK */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">
                Search Data
              </label>
              <input
                type="text"
                value={filterSpk}
                onChange={(e) => setFilterSpk(e.target.value)}
                placeholder="SPK / Nama / Kode / Jenis / Tujuan"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm
    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Action */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setFilterSpk("");
                }}
                className="flex h-10 w-full items-center justify-center rounded-xl
        border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700
        hover:bg-gray-100 transition"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <SkeletonTable rows={6} cols={7} />
          ) : paginatedData.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package
                className="mx-auto text-gray-400 mb-3"
                size={48}
              />
              <p className="text-gray-600 font-medium">
                Tidak ada data transaksi barang keluar
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Silakan sesuaikan filter atau cari kata kunci lain
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Tanggal",
                      "Barang",
                      "Qty",
                      "Tujuan",
                      "Sumber",
                      "SPK",
                      "Memo",
                      "User",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {paginatedData.map((tx) => (
                    <tr key={tx.id} className="transition hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {formatDate(tx.date)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {tx.item.name}
                        </div>

                        <div className="mt-0.5 text-xs text-gray-500">
                          {tx.item.code}
                          {tx.item.itemType?.name && (
                            <> • {tx.item.itemType.name}</>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        {tx.quantity} {tx.item.unit.name}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                        {tx.destination || "-"}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          tx.source === 'REPACK' ? 'bg-indigo-100 text-indigo-700' :
                          tx.source === 'SHIPPING' ? 'bg-blue-100 text-blue-700' :
                          tx.source === 'WASTE' ? 'bg-rose-100 text-rose-700' :
                          tx.source === 'PRODUKSI' ? 'bg-emerald-100 text-emerald-700' :
                          tx.source === 'DAUR_ULANG' ? 'bg-amber-100 text-amber-700' :
                          tx.source === 'BAHAN_BAKU' ? 'bg-orange-100 text-orange-700' :
                          tx.source === 'ORDER_CUSTOMER' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {tx.source || "UMUM"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600 font-semibold text-blue-600">
                        {tx.spkNumber || "-"}
                      </td>

                      {/* Memo button */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tx.memo ? (
                          <button
                            onClick={() => {
                              setSelectedMemo(tx.memo);
                              setOpenMemo(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                          >
                            Lihat
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {tx.user.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {openMemo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  Memo Transaksi
                </h3>
                <button
                  onClick={() => setOpenMemo(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
                {selectedMemo}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setOpenMemo(false)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

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
          {/* Info kiri */}
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {totalItems === 0 ? 0 : startIndex + 1}–
              {Math.min(endIndex, totalItems)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-gray-900">{totalItems}</span>{" "}
            data
          </div>

          {/* Control kanan */}
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
