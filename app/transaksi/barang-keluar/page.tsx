"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { ItemCategory, TransactionSource } from "@/lib/constants";
import { Plus, X, Filter, Package } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  currentStock: number;
  unit: { name: string };
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
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState("");

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
    if (filterCategory === "ALL") {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(
        transactions.filter((tx) => tx.item.category === filterCategory)
      );
    }
  }, [filterCategory, transactions]);

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
    [items, formData.itemId]
  );
  const selectedOutputItem = useMemo(
    () => bahanBakuItems.find((i) => i.id === formData.outputItemId),
    [bahanBakuItems, formData.outputItemId]
  );

  const getSourceLabel = (source: string | null) => {
    if (!source) return "-";
    if (source === TransactionSource.DAUR_ULANG) return "Daur Ulang";
    return source;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.memo.trim()) {
      alert("Memo wajib diisi");
      return;
    }

    if (!formData.itemId) {
      alert("Pilih barang yang akan didaur ulang");
      return;
    }

    if (formData.quantity <= 0) {
      alert("Qty keluar harus lebih dari 0");
      return;
    }

    if (!formData.outputItemId || formData.outputQuantity <= 0) {
      alert("Pilih hasil bahan baku dan qty hasil daur ulang");
      return;
    }

    if (selectedItem && selectedItem.currentStock < formData.quantity) {
      alert(
        `Stok tidak mencukupi. Stok tersedia: ${selectedItem.currentStock} ${selectedItem.unit.name}`
      );
      return;
    }

    try {
      // 1) Transaksi keluar (barang jadi -> daur ulang)
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
        alert(data.error || "Gagal menyimpan barang keluar");
        return;
      }

      // 2) Transaksi masuk (hasil daur ulang ke bahan baku)
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
        alert(
          `Transaksi keluar sudah tercatat, tapi gagal mencatat hasil bahan baku: ${
            data.error || "Gagal menyimpan barang masuk"
          }`
        );
      }

      setShowModal(false);
      resetForm();
      fetchTransactions();
      fetchItems();
      fetchBahanBaku();
    } catch (error) {
      alert("Terjadi kesalahan");
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
          <div className="flex flex-wrap items-end gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 px-4 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ALL">Semua Kategori</option>
                <option value={ItemCategory.BAHAN_BAKU}>Bahan Baku</option>
                <option value={ItemCategory.BARANG_JADI}>Barang Jadi</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-end gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Reset
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action */}
            <button
              onClick={() => setShowModal(true)}
              className="h-10 inline-flex items-center gap-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-semibold"
            >
              <Plus size={18} />
              Tambah Barang Keluar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sumber
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Barang
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tujuan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    SPK
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Memo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  /* ================= LOADING ================= */
                  <tr>
                    <td colSpan={8} className="p-0">
                      <SkeletonTable rows={6} cols={8} />
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  /* ================= EMPTY ================= */
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Package
                        className="mx-auto text-gray-400 mb-3"
                        size={48}
                      />
                      <p className="text-gray-600 font-medium">
                        Tidak ada data barang keluar
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {filterCategory !== "ALL"
                          ? `Tidak ada data untuk kategori ${
                              filterCategory === ItemCategory.BAHAN_BAKU
                                ? "Bahan Baku"
                                : "Barang Jadi"
                            }`
                          : "Klik Tambah Barang Keluar untuk menambahkan data"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          {getSourceLabel(tx.source)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tx.item.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {tx.item.code}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                        {tx.quantity} {tx.item.unit.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.destination || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.spkNumber ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            {tx.spkNumber}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {tx.memo ? (
                          <button
                            onClick={() => {
                              setSelectedMemo(tx.memo);
                              setShowMemoModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                          >
                            Lihat Memo
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.user.name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {showMemoModal && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                  <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Detail Memo
                    </h3>
                    <button
                      onClick={() => setShowMemoModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="px-6 py-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedMemo}
                    </p>
                  </div>

                  <div className="px-6 py-4 border-t flex justify-end">
                    <button
                      onClick={() => setShowMemoModal(false)}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

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
      </div>
    </Layout>
  );
}
