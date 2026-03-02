"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { ItemCategory, TransactionSource } from "@/lib/constants";
import { Plus, X, Filter, Package, Search } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { toast } from "react-toastify";

interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  currentStock: number;
  unit: { name: string };
  itemType?: {
    name: string;
  } | null;
}

interface Transaction {
  id: string;
  date: string;
  source: string | null;
  item: Item;
  quantity: number;
  destination: string | null;
  spkNumber: string | null;
  memo: string;
  user: { name: string };
}

export default function BarangKeluarPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [items, setItems] = useState<Item[]>([]);
  const [bahanBakuItems, setBahanBakuItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    endIndex,
  );

  /* reset page kalau filter berubah */
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterSource, startDate, endDate, pageSize, search]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    itemId: "",
    quantity: 0,
    destination: "Daur Ulang",
    spkNumber: "",
    memo: "",
    outputItemId: "",
    outputQuantity: 0,
  });

  useEffect(() => {
    fetchTransactions();
    fetchItems();
    fetchBahanBaku();
  }, [startDate, endDate]);

  useEffect(() => {
    let filtered = [...transactions];

    // Filter category
    if (filterCategory !== "ALL") {
      filtered = filtered.filter((tx) => tx.item.category === filterCategory);
    }

    // Filter source
    if (filterSource !== "ALL") {
      filtered = filtered.filter((tx) => tx.source === filterSource);
    }

    // 🔍 SEARCH: nama, kode, jenis, SPK
    if (search.trim()) {
      const q = search.toLowerCase();

      filtered = filtered.filter((tx) => {
        return (
          tx.item.name.toLowerCase().includes(q) ||
          tx.item.code.toLowerCase().includes(q) ||
          tx.item.itemType?.name?.toLowerCase().includes(q) ||
          tx.spkNumber?.toLowerCase().includes(q) // ✅ SPK YANG BENAR
        );
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, filterCategory, filterSource, search]);

  const fetchTransactions = async () => {
    try {
      let url = "/api/transactions?type=KELUAR";
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

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
    try {
      const url = "/api/items?isActive=true&category=BARANG_JADI";
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const fetchBahanBaku = async () => {
    try {
      const url = "/api/items?isActive=true&category=BAHAN_BAKU";
      const res = await fetch(url);
      const data = await res.json();
      setBahanBakuItems(data.items || []);
    } catch (error) {
      console.error("Error fetching bahan baku items:", error);
    }
  };

  const selectedItem = useMemo(
    () => items.find((i) => i.id === formData.itemId),
    [items, formData.itemId],
  );
  const selectedOutputItem = useMemo(
    () => bahanBakuItems.find((i) => i.id === formData.outputItemId),
    [bahanBakuItems, formData.outputItemId],
  );

  const getSourceLabel = (source: string | null) => {
    if (!source) return "-";
    const sourceLabels: Record<string, string> = {
      [TransactionSource.DAUR_ULANG]: "Daur Ulang",
      [TransactionSource.ORDER_CUSTOMER]: "Order Customer",
      [TransactionSource.BAHAN_BAKU]: "Bahan Baku",
      [TransactionSource.TRADING]: "Trading",
      [TransactionSource.PRODUKSI]: "Produksi",
    };
    return sourceLabels[source] || source;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.memo.trim()) {
      toast.error("Memo wajib diisi");
      return;
    }

    if (!formData.itemId) {
      toast.error("Pilih barang yang akan didaur ulang");
      return;
    }

    if (formData.quantity <= 0) {
      toast.error("Qty keluar harus lebih dari 0");
      return;
    }

    if (!formData.outputItemId || formData.outputQuantity <= 0) {
      toast.error("Pilih hasil bahan baku dan qty hasil daur ulang");
      return;
    }

    if (selectedItem && selectedItem.currentStock < formData.quantity) {
      toast.error(
        `Stok tidak mencukupi. Stok tersedia: ${selectedItem.currentStock} ${selectedItem.unit.name}`,
      );
      return;
    }

    try {
      // 1️⃣ Transaksi keluar (barang jadi → daur ulang)
      const keluarRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formData.date,
          itemId: formData.itemId,
          quantity: formData.quantity,
          destination: formData.destination || "Daur Ulang",
          spkNumber: formData.spkNumber || null,
          memo: formData.memo,
          type: "KELUAR",
          source: TransactionSource.DAUR_ULANG,
        }),
      });

      if (!keluarRes.ok) {
        const data = await keluarRes.json();
        toast.error(data?.error || "Gagal menyimpan barang keluar");
        return;
      }

      // 2️⃣ Transaksi masuk (hasil daur ulang → bahan baku)
      const masukRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formData.date,
          itemId: formData.outputItemId,
          quantity: formData.outputQuantity,
          memo: `Hasil daur ulang dari ${
            selectedItem?.name || "barang jadi"
          }. ${formData.memo}`,
          type: "MASUK",
          source: TransactionSource.DAUR_ULANG,
          price: null,
          vendor: null,
        }),
      });

      if (!masukRes.ok) {
        const data = await masukRes.json();
        toast.warning(
          `Barang keluar berhasil, tapi gagal mencatat hasil bahan baku: ${
            data?.error || "Terjadi kesalahan"
          }`,
        );
      } else {
        toast.success("Proses daur ulang berhasil dicatat ♻️");
      }

      setShowModal(false);
      resetForm();

      await Promise.all([fetchTransactions(), fetchItems(), fetchBahanBaku()]);
    } catch {
      toast.error("Terjadi kesalahan pada server");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      itemId: "",
      quantity: 0,
      destination: "Daur Ulang",
      spkNumber: "",
      memo: "",
      outputItemId: "",
      outputQuantity: 0,
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 gap-4 items-end">
            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</label>
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="h-10 pl-9 pr-4 w-full border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="ALL">Semua Kategori</option>
                  <option value={ItemCategory.BAHAN_BAKU}>Bahan Baku</option>
                  <option value={ItemCategory.BARANG_JADI}>Barang Jadi</option>
                </select>
              </div>
            </div>

            {/* Source */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sumber</label>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="h-10 px-4 w-full border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              >
                <option value="ALL">Semua Sumber</option>
                <option value={TransactionSource.ORDER_CUSTOMER}>
                  Order Customer
                </option>
                <option value={TransactionSource.TRADING}>Trading</option>
                <option value={TransactionSource.PRODUKSI}>Produksi</option>
                <option value={TransactionSource.BAHAN_BAKU}>Bahan Baku</option>
                <option value={TransactionSource.DAUR_ULANG}>Daur Ulang</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pencarian</label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nama / kode / jenis / SPK"
                  className="h-10 pl-9 pr-4 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 flex-1 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
                <span className="text-gray-400 text-sm">–</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 flex-1 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setFilterCategory("ALL");
                  setFilterSource("ALL");
                }}
                className="h-10 flex-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                Reset
              </button>

              <button
                onClick={() => setShowModal(true)}
                className="h-10 flex-[2] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-semibold whitespace-nowrap"
              >
                <Plus size={18} />
                <span>Tambah</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="relative overflow-x-auto">
            {/* batas lebar biar ga kepanjangan */}
            <div className="min-w-[1100px] max-w-[1400px] mx-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="w-[110px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Tanggal
                    </th>
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Sumber
                    </th>
                    <th className="w-[280px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Barang
                    </th>
                    <th className="w-[90px] px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Qty
                    </th>
                    <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Tujuan
                    </th>
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      SPK
                    </th>
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Memo
                    </th>
                    <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      User
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <SkeletonTable rows={pageSize} cols={8} />
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <Package
                          className="mx-auto text-gray-400 mb-3"
                          size={48}
                        />
                        <p className="text-gray-600 font-medium">
                          Tidak ada data barang keluar
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* Tanggal */}
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>

                        {/* Sumber */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              tx.source === TransactionSource.TRADING
                                ? "bg-blue-100 text-blue-800"
                                : tx.source === TransactionSource.PRODUKSI
                                  ? "bg-green-100 text-green-800"
                                  : tx.source ===
                                      TransactionSource.ORDER_CUSTOMER
                                    ? "bg-purple-100 text-purple-800"
                                    : tx.source === TransactionSource.BAHAN_BAKU
                                      ? "bg-orange-100 text-orange-800"
                                      : tx.source ===
                                          TransactionSource.DAUR_ULANG
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-red-100 text-red-800"
                            }`}
                          >
                            {getSourceLabel(tx.source)}
                          </span>
                        </td>

                        {/* Barang */}
                        <td className="px-4 py-3">
                          <div className="max-w-[260px]">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {tx.item.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {tx.item.code} • {tx.item.itemType?.name || "-"}
                            </div>
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                          {tx.quantity} {tx.item.unit.name}
                        </td>

                        {/* Tujuan */}
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">
                          {tx.destination || "-"}
                        </td>

                        {/* SPK */}
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {tx.spkNumber ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {tx.spkNumber}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* Memo */}
                        <td className="px-4 py-3 text-sm">
                          {tx.memo ? (
                            <button
                              onClick={() => {
                                setSelectedMemo(tx.memo);
                                setShowMemoModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              Lihat
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* User */}
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[140px] truncate">
                          {tx.user.name}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ================= PAGINATION ================= */}
        {totalItems > 0 && (
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
            {/* LEFT — Info */}
            <div className="text-sm text-gray-600">
              Menampilkan{" "}
              <span className="font-semibold text-gray-900">
                {totalItems === 0 ? 0 : startIndex + 1}–
                {Math.min(endIndex, totalItems)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-gray-900">{totalItems}</span>{" "}
              data
            </div>

            {/* RIGHT — Controls */}
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
                {[
                  {
                    label: "«",
                    onClick: () => setCurrentPage(1),
                    disabled: currentPage === 1,
                  },
                  {
                    label: "‹",
                    onClick: () => setCurrentPage((p) => Math.max(1, p - 1)),
                    disabled: currentPage === 1,
                  },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.onClick}
                    disabled={btn.disabled}
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
                    {btn.label}
                  </button>
                ))}

                {/* Page indicator */}
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
                  {currentPage}
                  <span className="mx-1 opacity-70">/</span>
                  {totalPages}
                </div>

                {[
                  {
                    label: "›",
                    onClick: () =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1)),
                    disabled: currentPage === totalPages,
                  },
                  {
                    label: "»",
                    onClick: () => setCurrentPage(totalPages),
                    disabled: currentPage === totalPages,
                  },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.onClick}
                    disabled={btn.disabled}
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
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
                <h3 className="text-xl font-bold">Daur Ulang Barang Jadi</h3>
                <button
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-semibold text-red-600">Sumber:</span>
                  <span>Daur Ulang (Barang Jadi → Bahan Baku)</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggal *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barang Jadi yang Didaur Ulang *
                  </label>
                  <select
                    required
                    value={formData.itemId}
                    onChange={(e) =>
                      setFormData({ ...formData, itemId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Pilih Barang Jadi</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code}) - Stok: {item.currentStock}{" "}
                        {item.unit.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedItem && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <strong>Stok tersedia:</strong> {selectedItem.currentStock}{" "}
                    {selectedItem.unit.name}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qty Keluar (barang jadi) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.quantity || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor SPK (opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.spkNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, spkNumber: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Masukkan nomor SPK jika ada"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barang Hasil (masuk ke Bahan Baku) *
                  </label>
                  <select
                    required
                    value={formData.outputItemId}
                    onChange={(e) =>
                      setFormData({ ...formData, outputItemId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Pilih Bahan Baku</option>
                    {bahanBakuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qty Hasil Daur Ulang (masuk) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.outputQuantity || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          outputQuantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tujuan (opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          destination: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Daur Ulang, Produksi, dll"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Memo * (Wajib)
                  </label>
                  <textarea
                    required
                    value={formData.memo}
                    onChange={(e) =>
                      setFormData({ ...formData, memo: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Catatan tentang transaksi ini..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-800">
                  Memo Transaksi
                </h3>
                <button
                  onClick={() => setShowMemoModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedMemo || "-"}
                </p>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t flex justify-end">
                <button
                  onClick={() => setShowMemoModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200"
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
