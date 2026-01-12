"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ItemCategory, TransactionSource } from "@/lib/constants";
import { Plus, X, Filter, Package, Factory, ArrowRight } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: { name: string };
  itemType?: { name: string };
  currentStock?: number;
  hargaSatuan?: number | null;
}

interface Transaction {
  id: string;
  date: string;
  source: string | null;
  item: Item;
  quantity: number;
  price: number | null;
  vendor: string | null;
  memo: string;
  user: { name: string };
}

export default function BarangMasukPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const [step, setStep] = useState<"SOURCE" | "CATEGORY" | "FORM">("SOURCE");
  const [source, setSource] = useState<"TRADING" | "PRODUKSI" | "">("");
  const [category, setCategory] = useState<"BAHAN_BAKU" | "BARANG_JADI" | "">(
    ""
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    itemId: "",
    quantity: 0,
    memo: "",
  });

  useEffect(() => {
    fetchTransactions();
    fetchItems();
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
      let url = "/api/transactions?type=MASUK";
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

  const fetchItems = async (categoryFilter?: string) => {
    try {
      let url = "/api/items?isActive=true";
      if (categoryFilter) {
        url += `&category=${categoryFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const selectedItem = useMemo(
    () => items.find((i) => i.id === formData.itemId),
    [items, formData.itemId]
  );

  const unitPrice = useMemo(() => {
    if (category !== ItemCategory.BAHAN_BAKU) return 0;
    return selectedItem?.hargaSatuan || 0;
  }, [category, selectedItem]);

  const subtotal = useMemo(() => {
    if (category !== ItemCategory.BAHAN_BAKU) return null;
    return unitPrice * (formData.quantity || 0);
  }, [category, unitPrice, formData.quantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.memo.trim()) {
      alert("Memo wajib diisi");
      return;
    }

    if (!source) {
      alert("Pilih sumber barang masuk");
      return;
    }

    if (!formData.itemId) {
      alert("Pilih barang");
      return;
    }

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: category === ItemCategory.BAHAN_BAKU ? subtotal : null,
          type: "MASUK",
          source: source,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchTransactions();
        fetchItems(category || undefined);
      } else {
        const data = await res.json();
        alert(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
    }
  };

  const resetForm = () => {
    setStep("SOURCE");
    setSource("");
    setCategory("");
    setFormData({
      date: new Date().toISOString().split("T")[0],
      itemId: "",
      quantity: 0,
      memo: "",
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const getSourceLabel = (src: string | null) => {
    if (!src) return "-";
    switch (src) {
      case TransactionSource.TRADING:
        return "Trading Vendor";
      case TransactionSource.PRODUKSI:
        return "Produksi";
      default:
        return src;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Memuat data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter size={18} className="text-gray-500" />

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 px-4 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value={ItemCategory.BAHAN_BAKU}>Bahan Baku</option>
              <option value={ItemCategory.BARANG_JADI}>Barang Jadi</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-400">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 px-3 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Reset
            </button>

            <div className="ml-auto">
              <button
                onClick={() => setShowModal(true)}
                className="h-10 inline-flex items-center gap-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-semibold"
              >
                <Plus size={18} />
                Tambah Barang Masuk
              </button>
            </div>
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
                    Jenis
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Subtotal
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
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <Package
                        className="mx-auto text-gray-400 mb-3"
                        size={48}
                      />
                      <p className="text-gray-600 font-medium">
                        Tidak ada data barang masuk
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {filterCategory !== "ALL"
                          ? `Tidak ada data untuk kategori ${
                              filterCategory === ItemCategory.BAHAN_BAKU
                                ? "Bahan Baku"
                                : "Barang Jadi"
                            }`
                          : "Klik Tambah Barang Masuk untuk menambahkan data"}
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
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.item.itemType?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.quantity} {tx.item.unit.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.price ? formatCurrency(tx.price) : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {tx.memo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.user.name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
                <h3 className="text-xl font-bold">Tambah Barang Masuk</h3>
                <button
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Step 1: Source Selection */}
                {step === "SOURCE" && (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-6 text-center font-medium">
                      Pilih sumber barang masuk
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSource("TRADING");
                          setStep("CATEGORY");
                        }}
                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="text-blue-600" size={24} />
                          <h4 className="text-lg font-semibold text-gray-900">
                            Trading Vendor
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Barang trading dari vendor
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSource("PRODUKSI");
                          setStep("CATEGORY");
                        }}
                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Factory className="text-blue-600" size={24} />
                          <h4 className="text-lg font-semibold text-gray-900">
                            Produksi
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Barang yang diproduksi untuk di stok kembali
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Category Selection */}
                {step === "CATEGORY" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setStep("SOURCE")}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ← Kembali
                      </button>
                    </div>
                    <p className="text-gray-600 mb-6 text-center font-medium">
                      Pilih kategori barang
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setCategory("BAHAN_BAKU");
                          fetchItems("BAHAN_BAKU");
                          setStep("FORM");
                        }}
                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="text-blue-600" size={24} />
                          <h4 className="text-lg font-semibold text-gray-900">
                            Bahan Baku
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Bahan baku untuk produksi
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCategory("BARANG_JADI");
                          fetchItems("BARANG_JADI");
                          setStep("FORM");
                        }}
                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="text-purple-600" size={24} />
                          <h4 className="text-lg font-semibold text-gray-900">
                            Barang Jadi
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600">
                          Barang jadi yang siap dijual
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Form */}
                {step === "FORM" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => setStep("CATEGORY")}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ArrowRight className="rotate-180" size={16} />
                        Kembali
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Sumber:</span>
                        <span className="text-xs font-medium text-blue-600">
                          {getSourceLabel(source)}
                        </span>
                        <span className="text-xs text-gray-500">|</span>
                        <span className="text-xs text-gray-500">Kategori:</span>
                        <span className="text-xs font-medium text-blue-600">
                          {category === ItemCategory.BAHAN_BAKU
                            ? "Bahan Baku"
                            : "Barang Jadi"}
                        </span>
                      </div>
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
                        Barang * (lihat kode & jenis)
                      </label>
                      <select
                        required
                        value={formData.itemId}
                        onChange={(e) =>
                          setFormData({ ...formData, itemId: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Pilih Barang</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.code}) —{" "}
                            {item.itemType?.name || "-"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedItem && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 border rounded-lg bg-gray-50">
                          <p className="text-xs text-gray-500">Jenis</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {selectedItem.itemType?.name || "-"}
                          </p>
                        </div>
                        <div className="p-3 border rounded-lg bg-gray-50">
                          <p className="text-xs text-gray-500">Stok terakhir</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {selectedItem.currentStock ?? 0}{" "}
                            {selectedItem.unit.name}
                          </p>
                        </div>
                        <div className="p-3 border rounded-lg bg-gray-50">
                          <p className="text-xs text-gray-500">
                            Stok setelah tambah
                          </p>
                          <p className="text-sm font-semibold text-gray-800">
                            {(selectedItem.currentStock ?? 0) +
                              (formData.quantity || 0)}{" "}
                            {selectedItem.unit.name}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qty * (stok baru yang ditambahkan)
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

                    {category === ItemCategory.BAHAN_BAKU && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Harga Satuan (dari master)
                          </label>
                          <input
                            type="number"
                            value={unitPrice || 0}
                            readOnly
                            className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subtotal (otomatis)
                          </label>
                          <input
                            type="text"
                            value={
                              subtotal !== null
                                ? formatCurrency(subtotal || 0)
                                : "-"
                            }
                            readOnly
                            className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700"
                          />
                        </div>
                      </div>
                    )}

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
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
