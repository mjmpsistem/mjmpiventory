/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import { formatCurrency } from "@/lib/utils";
import {
  Package,
  Plus,
  Edit2,
  Power,
  Filter,
  X,
  ShoppingBag,
  Search,
} from "lucide-react";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  itemType: { id: string; name: string };
  unit: { id: string; name: string };
  stockMinimum: number;
  currentStock: number;
  isActive: boolean;
  vendor?: string | null;
  hargaSatuan?: number | null;
  ukuran?: string | null;
  kuantitas?: number | null;
  isTrading?: boolean;
  transactions?: Array<{ quantity: number; price: number | null }>;
}

export default function DataBarangPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemTypes, setItemTypes] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [step, setStep] = useState<"PILIH_KATEGORI" | "FORM">("PILIH_KATEGORI");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    itemTypeId: "",
    category: "BAHAN_BAKU",
    unitId: "",
    stockMinimum: "",
    vendor: "",
    hargaSatuan: "",
    ukuran: "",
    isTrading: false,
  });
  const [generatedCode, setGeneratedCode] = useState("");

  const BAHAN_BAKU_NAMES = [
    "Biji Plastik",
    "Biji Sedotan",
    "Pigmen Plastik",
    "Pigmen Sedotan",
    "Adiktif",
  ];

  useEffect(() => {
    fetchItems(false);
  }, []);

  useEffect(() => {
    fetchItems(true);
  }, [filterCategory]);

  const fetchItems = async (isRefetch = false) => {
    isRefetch ? setRefetching(true) : setLoading(true);

    try {
      const url = filterCategory
        ? `/api/items?category=${filterCategory}`
        : "/api/items";

      const res = await fetch(url);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      isRefetch ? setRefetching(false) : setLoading(false);
    }
  };

  const fetchItemTypes = async (category?: string) => {
    const url = category
      ? `/api/item-types?category=${category}`
      : "/api/item-types";

    const res = await fetch(url);
    const data = await res.json();
    setItemTypes(data.itemTypes || []);
  };

  const fetchUnits = async () => {
    const res = await fetch("/api/units?isActive=true");
    const data = await res.json();
    setUnits(data.units || []);
  };

  useEffect(() => {
    if (showModal && step === "FORM") {
      fetchUnits();
    }
  }, [showModal, step]);

  const calculateWeightedAveragePrice = (item: Item): number => {
    if (!item.transactions || item.transactions.length === 0) {
      return 0;
    }

    let totalValue = 0;
    let totalQuantity = 0;

    for (const tx of item.transactions) {
      if (tx.price && tx.price > 0 && tx.quantity > 0) {
        totalValue += tx.quantity * tx.price;
        totalQuantity += tx.quantity;
      }
    }

    if (totalQuantity > 0) {
      const avgPrice = totalValue / totalQuantity;
      // Round to 2 decimal places to avoid floating point errors
      return Math.round(avgPrice * 100) / 100;
    }

    return 0;
  };

  const getUnitPrice = (item: Item): number => {
    if (item.hargaSatuan && item.hargaSatuan > 0) {
      return item.hargaSatuan;
    }
    return calculateWeightedAveragePrice(item);
  };

  const fetchNextCode = async (category: string) => {
    try {
      // Find existing items with the same category prefix to calculate next code
      const prefix = category === "BAHAN_BAKU" ? "BB" : "BJ";
      const res = await fetch(`/api/items?category=${category}`);
      const data = await res.json();
      const items = data.items || [];

      // Extract numbers from existing codes
      const numbers = items
        .map((item: Item) => {
          if (item.code.startsWith(prefix)) {
            const match = item.code.match(/\d+$/);
            return match ? parseInt(match[0], 10) : 0;
          }
          return 0;
        })
        .filter((num: number) => num > 0);

      const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
      const formattedNumber = nextNumber.toString().padStart(3, "0");
      setGeneratedCode(`${prefix}${formattedNumber}`);
    } catch (error) {
      console.error("Error fetching next code:", error);
      const prefix = category === "BAHAN_BAKU" ? "BB" : "BJ";
      setGeneratedCode(`${prefix}001`);
    }
  };

  const formatRupiah = (value: string | number): string => {
    const numValue = typeof value === "string" ? parseFloat(value) || 0 : value;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(numValue);
  };

  const parseRupiah = (value: string): number => {
    return parseFloat(value.replace(/[^\d]/g, "")) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingItem ? `/api/items/${editingItem.id}` : "/api/items";
      const method = editingItem ? "PUT" : "POST";

      const submitData: any = {
        name: formData.name,
        itemTypeId: formData.itemTypeId,
        category: formData.category,
        unitId: formData.unitId,
        stockMinimum: parseFloat(formData.stockMinimum.toString()) || 0,
        isTrading: formData.isTrading,
      };

      // Only include code for new items (backend will auto-generate if not provided)
      if (!editingItem) {
        submitData.code = generatedCode || formData.code;
      }

      // Field khusus untuk Bahan Baku
      if (formData.category === "BAHAN_BAKU") {
        submitData.vendor = formData.vendor || null;
        submitData.hargaSatuan =
          typeof formData.hargaSatuan === "string"
            ? parseRupiah(formData.hargaSatuan)
            : formData.hargaSatuan || null;
      }

      // Field khusus untuk Barang Jadi
      if (formData.category === "BARANG_JADI") {
        submitData.ukuran = formData.ukuran || null;
      }

      // For edit, include isActive from the item
      if (editingItem) {
        submitData.isActive = editingItem.isActive;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        toast.success(
          editingItem
            ? "Data barang berhasil diperbarui"
            : "Data barang berhasil ditambahkan",
        );

        setShowModal(false);
        setEditingItem(null);
        resetForm();
        setGeneratedCode("");
        setStep("PILIH_KATEGORI");
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Gagal menyimpan data barang");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      itemTypeId: "",
      category: "BAHAN_BAKU",
      unitId: "",
      stockMinimum: "",
      vendor: "",
      hargaSatuan: "",
      ukuran: "",
      isTrading: false,
    });
    setGeneratedCode("");
  };

  const handleEdit = async (item: Item) => {
    setEditingItem(item);

    // 🔥 PENTING: fetch dulu item types sesuai kategori
    await fetchItemTypes(item.category);
    await fetchUnits();

    setFormData({
      code: item.code,
      name: item.name,
      itemTypeId: item.itemType.id,
      category: item.category,
      unitId: item.unit.id,
      stockMinimum: item.stockMinimum.toString(),
      vendor: item.vendor || "",
      hargaSatuan: item.hargaSatuan ? formatRupiah(item.hargaSatuan) : "",
      ukuran: item.ukuran || "",
      isTrading: item.isTrading || false,
    });

    setGeneratedCode("");
    setStep("FORM");
    setShowModal(true);
  };

  const handleToggleActive = async (item: Item) => {
    try {
      const updateData: any = {
        name: item.name,
        itemTypeId: item.itemType.id,
        category: item.category,
        unitId: item.unit.id,
        stockMinimum: item.stockMinimum,
        isActive: !item.isActive,
        isTrading: item.isTrading || false,
      };

      // Include category-specific fields
      if (item.category === "BAHAN_BAKU") {
        updateData.vendor = item.vendor || null;
        updateData.hargaSatuan = item.hargaSatuan || null;
      } else if (item.category === "BARANG_JADI") {
        updateData.ukuran = item.ukuran || null;
      }

      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (_) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleToggleClick = (item: any) => {
    setSelectedItem(item);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedItem) return;

    await handleToggleActive(selectedItem);

    toast.success(
      `Barang berhasil ${
        selectedItem.isActive ? "dinonaktifkan" : "diaktifkan"
      }`,
    );

    setConfirmOpen(false);
    setSelectedItem(null);
  };

  const columnCount =
    filterCategory === "BARANG_JADI"
      ? 8
      : filterCategory === "BAHAN_BAKU"
        ? 8
        : 10;

  const filteredItems = items.filter((item) => {
    const keyword = search.toLowerCase().trim();

    const matchSearch =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.itemType?.name.toLowerCase().includes(keyword) ||
      item.vendor?.toLowerCase().includes(keyword);

    return matchSearch;
  });

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory]);

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />

        {/* Header */}

        {/* Filter and Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* LEFT: Search */}
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Cari nama / jenis / vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
        w-full pl-10 pr-4 py-2
        border border-gray-300 rounded-lg
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        bg-white text-sm
        dark:bg-gray-800 dark:border-gray-700
      "
            />
          </div>

          {/* RIGHT: Filter + Action */}
          <div className="flex items-center gap-3 justify-end">
            <div className="relative">
              <Filter
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="
          pl-10 pr-4 py-2
          border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          bg-white text-sm
          dark:bg-gray-800 dark:border-gray-700
        "
              >
                <option value="">Semua Kategori</option>
                <option value="BAHAN_BAKU">Bahan Baku</option>
                <option value="BARANG_JADI">Barang Jadi</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                resetForm();
                setStep("PILIH_KATEGORI");
                setGeneratedCode("");
                setShowModal(true);
              }}
              className="
        flex items-center gap-2
        px-4 py-2
        bg-gradient-to-r from-blue-600 to-indigo-600
        text-white rounded-lg
        hover:shadow-lg transition-all
        font-medium
      "
            >
              <Plus size={18} />
              Tambah Barang
            </button>
          </div>
        </div>

        {/* Pagination Bar */}
        <div
          className="
    flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
    px-6 py-4
    rounded-2xl
    bg-white/80 backdrop-blur
    border border-gray-200/60
    shadow-[0_8px_30px_rgb(0,0,0,0.04)]
  "
        >
          {/* LEFT — Info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">
              {startIndex + 1}–{Math.min(endIndex, totalItems)}
            </span>
            <span className="text-gray-400">of</span>
            <span className="text-gray-600">{totalItems} records</span>
          </div>

          {/* RIGHT — Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rows per page */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
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
                  action: () => setCurrentPage(1),
                  disabled: currentPage === 1,
                },
                {
                  label: "‹",
                  action: () => setCurrentPage((p) => Math.max(1, p - 1)),
                  disabled: currentPage === 1,
                },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.action}
                  disabled={btn.disabled}
                  className="
            h-9 w-9
            flex items-center justify-center
            rounded-xl
            border border-gray-200
            bg-white
            text-gray-600
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
                  action: () =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1)),
                  disabled: currentPage === totalPages,
                },
                {
                  label: "»",
                  action: () => setCurrentPage(totalPages),
                  disabled: currentPage === totalPages,
                },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.action}
                  disabled={btn.disabled}
                  className="
            h-9 w-9
            flex items-center justify-center
            rounded-xl
            border border-gray-200
            bg-white
            text-gray-600
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

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Kode
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Nama Barang
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Jenis
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Kategori
                  </th>
                  {(!filterCategory || filterCategory === "BAHAN_BAKU") && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Vendor
                    </th>
                  )}
                  {(!filterCategory || filterCategory === "BARANG_JADI") && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Ukuran
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Stok Minimum
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Harga Satuan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading || refetching ? (
                  /* ================= LOADING ================= */
                  <tr>
                    <td colSpan={columnCount} className="px-6 py-6">
                      <SkeletonTable rows={8} cols={columnCount} />
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  /* ================= EMPTY ================= */
                  <tr>
                    <td
                      colSpan={columnCount}
                      className="px-6 py-12 text-center"
                    >
                      <Package
                        className="mx-auto text-gray-400 mb-3"
                        size={48}
                      />
                      <p className="text-gray-600 font-medium">
                        Tidak ada data barang
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Klik Tambah Barang untuk menambahkan data
                      </p>
                    </td>
                  </tr>
                ) : (
                  /* ================= DATA ================= */
                  paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        !item.isActive ? "bg-gray-50 opacity-60" : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {item.code}
                          </span>
                          {item.isTrading && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                              Trading
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {item.name}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {item.itemType.name}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            item.category === "BAHAN_BAKU"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-indigo-100 text-indigo-800"
                          }`}
                        >
                          {item.category === "BAHAN_BAKU"
                            ? "Bahan Baku"
                            : "Barang Jadi"}
                        </span>
                      </td>

                      {(!filterCategory || filterCategory === "BAHAN_BAKU") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {item.vendor || "-"}
                          </span>
                        </td>
                      )}

                      {(!filterCategory ||
                        filterCategory === "BARANG_JADI") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {item.ukuran || "-"}
                          </span>
                        </td>
                      )}

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.stockMinimum} {item.unit.name}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(getUnitPrice(item))}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleClick(item)}
                            className={
                              item.isActive
                                ? "text-red-600 hover:text-red-800"
                                : "text-green-600 hover:text-green-800"
                            }
                          >
                            <Power size={18} />
                          </button>
                        </div>
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
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h3 className="text-xl font-bold">
                  {editingItem
                    ? "Edit Barang"
                    : step === "PILIH_KATEGORI"
                      ? "Pilih Kategori Barang"
                      : "Tambah Barang Baru"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    resetForm();
                    setStep("PILIH_KATEGORI");
                  }}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {step === "PILIH_KATEGORI" && !editingItem ? (
                <div className="p-6">
                  <p className="text-gray-600 mb-6 text-center">
                    Pilih kategori barang yang ingin ditambahkan
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        const cat = "BAHAN_BAKU";
                        setFormData({
                          ...formData,
                          category: cat,
                          itemTypeId: "",
                        });
                        fetchItemTypes(cat);
                        fetchUnits(); // ⬅️ TAMBAHKAN INI
                        fetchNextCode(cat);
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
                        Untuk bahan baku yang digunakan dalam produksi
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cat = "BARANG_JADI";
                        setFormData({
                          ...formData,
                          category: cat,
                          itemTypeId: "",
                        });
                        fetchItemTypes(cat); // 🔥 FILTER DI SINI
                        fetchNextCode(cat);
                        setStep("FORM");
                      }}
                      className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <ShoppingBag className="text-indigo-600" size={24} />
                        <h4 className="text-lg font-semibold text-gray-900">
                          Barang Jadi
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Untuk produk jadi hasil produksi
                      </p>
                    </button>
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingItem(null);
                        resetForm();
                        setStep("PILIH_KATEGORI");
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kode Barang {!editingItem && "*"}
                      </label>
                      {editingItem ? (
                        <input
                          type="text"
                          value={formData.code}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={generatedCode}
                            disabled
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed text-gray-700 font-medium"
                            placeholder="Kode akan otomatis dibuat"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-gray-500">
                            Auto-generated
                          </span>
                        </div>
                      )}
                      {!editingItem && (
                        <p className="mt-1 text-xs text-gray-500">
                          Kode akan otomatis dibuat berdasarkan kategori (
                          {formData.category === "BAHAN_BAKU" ? "BB" : "BJ"} +
                          nomor urut)
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Barang *
                      </label>

                      {formData.category === "BAHAN_BAKU" ? (
                        <select
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Pilih Nama Bahan Baku</option>
                          {BAHAN_BAKU_NAMES.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan nama barang"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jenis Barang *
                      </label>
                      <select
                        required
                        value={formData.itemTypeId || " "}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            itemTypeId: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Pilih Jenis</option>
                        {itemTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategori *
                      </label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            category: e.target.value,
                          });
                          if (!editingItem) {
                            fetchNextCode(e.target.value);
                          }
                        }}
                        disabled={!!editingItem}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="BAHAN_BAKU">Bahan Baku</option>
                        <option value="BARANG_JADI">Barang Jadi</option>
                      </select>
                    </div>
                  </div>

                  {/* Field untuk Bahan Baku */}
                  {formData.category === "BAHAN_BAKU" && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vendor
                          </label>
                          <input
                            type="text"
                            value={formData.vendor}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                vendor: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Nama vendor"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Harga Satuan
                          </label>
                          <input
                            type="text"
                            value={formData.hargaSatuan}
                            onChange={(e) => {
                              const value = e.target.value.replace(
                                /[^\d]/g,
                                "",
                              );
                              if (value === "") {
                                setFormData({ ...formData, hargaSatuan: "" });
                              } else {
                                const numValue = parseFloat(value);
                                setFormData({
                                  ...formData,
                                  hargaSatuan: formatRupiah(numValue),
                                });
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value) {
                                const numValue = parseRupiah(e.target.value);
                                setFormData({
                                  ...formData,
                                  hargaSatuan: formatRupiah(numValue),
                                });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Rp 0"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Field untuk Barang Jadi */}
                  {formData.category === "BARANG_JADI" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ukuran
                        </label>
                        <input
                          type="text"
                          value={formData.ukuran}
                          onChange={(e) =>
                            setFormData({ ...formData, ukuran: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Contoh: 6mm, 8mm, dll"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.isTrading}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                isTrading: e.target.checked,
                              })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Barang Trading (dapat dikembalikan/refund)
                          </span>
                        </label>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Satuan *
                      </label>
                      <select
                        required
                        value={formData.unitId}
                        onChange={(e) =>
                          setFormData({ ...formData, unitId: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Pilih Satuan</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stok Minimum *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.stockMinimum}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, "");
                          setFormData({
                            ...formData,
                            stockMinimum: value,
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingItem) {
                          setShowModal(false);
                          setEditingItem(null);
                          resetForm();
                        } else {
                          setStep("PILIH_KATEGORI");
                        }
                      }}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      {editingItem ? "Batal" : "Kembali"}
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                    >
                      {editingItem ? "Update" : "Simpan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {confirmOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setConfirmOpen(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-6 animate-in zoom-in-95 fade-in">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedItem.isActive
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  <Power size={22} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    Konfirmasi Aksi
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Yakin ingin{" "}
                    <span className="font-medium">
                      {selectedItem.isActive ? "menonaktifkan" : "mengaktifkan"}
                    </span>{" "}
                    barang:
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedItem.name}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Batal
                </button>

                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition ${
                    selectedItem.isActive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Ya, {selectedItem.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
