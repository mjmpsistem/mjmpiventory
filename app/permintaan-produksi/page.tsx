/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "react-toastify";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { ClipboardList, Plus, Filter, X, Trash2, Printer, Package, RefreshCcw, Search, Calendar, Loader2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { motion, AnimatePresence } from "framer-motion";
import PDFTemplate from "@/components/pdf/PDFTemplate";

interface Item {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  reservedStock?: number;
  category: string;
  unit: { name: string };
  itemType?: { name: string };
}

interface ProductionRequestItem {
  id: string;
  item: Item;
  quantity: number;
}

interface ProductionRequest {
  id: string;
  spkNumber: string;
  productName: string;
  status: string;
  memo: string;
  createdAt: string;
  approvedAt?: string | null;
  user: { name: string };
  items: ProductionRequestItem[];
  spk: {
    id: string;
    spkItems: SpkItem[];
    lead: {
      nama_toko: string;
      alamat_toko: string;
      no_telp: string;
    };
  };
}

interface SpkItem {
  id: string;
  namaBarang: string;
  qty: number;
  producedQty?: number;
  shippedQty?: number;
  readyQty?: number;
  approvedQty?: number;
  satuan: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  productionStatus?: string | null;
  salesOrder?: {
    id: number;
    spesifikasi_tambahan?: string | null;
  };
  shipping_item?: Array<{
    id: string;
    qty: number;
    shipping?: {
      waktuSampai?: string | null;
    };
  }>;
}

interface SpkProductionNeeded {
  id: string;
  spkNumber: string;
  status: string;
  tglSpk: string;
  deadline: string | null;
  catatan: string | null;
  lead: {
    id: number;
    nama_toko: string;
    nama_owner: string;
    nama_pic: string;
  };
  user: {
    id: string;
    name: string;
    username: string;
  };
  spkItems: SpkItem[];
  materialUsages: Array<{
    materialId: string;
    quantityNeeded: number;
    material: Item;
  }>;
}

export default function PermintaanProduksiPage() {
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [spksNeedingProduction, setSpksNeedingProduction] = useState<
    SpkProductionNeeded[]
  >([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedRequestForPrint, setSelectedRequestForPrint] =
    useState<ProductionRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState("");

  const [activeTab, setActiveTab] = useState<"needed" | "history">("needed");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [formData, setFormData] = useState({
    id: "" as string | null, // Tambahkan ID untuk mode edit
    spkNumber: "",
    products: [] as string[],
    memo: "",
    items: [] as Array<{
      itemId: string;
      quantity: number;
      originalQuantity?: number;
    }>,
  });
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedItemForProgress, setSelectedItemForProgress] = useState<{
    spkId: string;
    item: SpkItem;
  } | null>(null);
  const [progressQty, setProgressQty] = useState<number>(0);
  const [submittingProgress, setSubmittingProgress] = useState(false);

  const handleReportProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForProgress || progressQty <= 0) return;

    setSubmittingProgress(true);
    try {
      const res = await fetch(
        `/api/spk/${selectedItemForProgress.spkId}/production-progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spkItemId: selectedItemForProgress.item.id,
            additionalQty: progressQty,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mencatat progres");
      }

      toast.success("Progres produksi berhasil dicatat");
      setShowProgressModal(false);
      setProgressQty(0);
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingProgress(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchSpksNeedingProduction();
    fetchItems();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true); // ⬅️ penting
      let url = "/api/production-requests";
      if (filterStatus) url += `?status=${filterStatus}`;

      const res = await fetch(url);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpksNeedingProduction = async () => {
    try {
      const res = await fetch("/api/spk/production-needed");
      const data = await res.json();
      setSpksNeedingProduction(data.spks || []);
    } catch (error) {
      console.error("Error fetching SPKs needing production:", error);
    }
  };

  const fetchItems = async () => {
    const res = await fetch("/api/items?category=BAHAN_BAKU&isActive=true");
    const data = await res.json();
    setItems(data.items || []);
  };

  // Fetch items periodically to get real-time stock
  useEffect(() => {
    const interval = setInterval(() => {
      if (showModal) {
        fetchItems();
      }
    }, 3000); // Update every 3 seconds when modal is open

    return () => clearInterval(interval);
  }, [showModal]);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { itemId: "", quantity: 0, originalQuantity: 0 },
      ],
    });
  };

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, ""],
    });
  };

  const handleRemoveProduct = (index: number) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    });
  };

  const handleProductChange = (index: number, value: string) => {
    const newProducts = [...formData.products];
    newProducts[index] = value;
    setFormData({ ...formData, products: newProducts });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.memo.trim()) {
      toast.error("Memo wajib diisi");
      return;
    }

    if (
      formData.products.length === 0 ||
      formData.products.some((p) => !p.trim())
    ) {
      toast.error("Minimal harus ada 1 produk yang dikerjakan");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Minimal harus ada 1 bahan baku");
      return;
    }

    // Validate all items have quantity > 0
    if (formData.items.some((item) => !item.itemId || item.quantity <= 0)) {
      toast.error("Semua bahan baku harus memiliki kuantitas yang valid");
      return;
    }

    setSaving(true);
    try {
      const productName = formData.products.filter((p) => p.trim()).join(", ");
      const isEdit = !!formData.id;
      const url = isEdit
        ? `/api/production-requests/${formData.id}`
        : "/api/production-requests";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          productName,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          id: null,
          spkNumber: "",
          products: [],
          memo: "",
          items: [],
        });
        toast.success(isEdit ? "Permintaan diperbarui" : "Permintaan dibuat");
        fetchRequests();
        fetchSpksNeedingProduction();
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "APPROVED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Filter Logic
  const filteredSpks = spksNeedingProduction.filter((spk) => {
    const q = searchQuery.toLowerCase();

    return (
      spk.spkNumber.toLowerCase().includes(q) ||
      spk.lead.nama_toko.toLowerCase().includes(q) ||
      spk.spkItems.some(
        (item) =>
          item.namaBarang.toLowerCase().includes(q) ||
          item.salesOrder?.spesifikasi_tambahan?.toLowerCase().includes(q),
      )
    );
  });

  const filteredRequests = requests.filter((req) => {
    const lowerQuery = searchQuery.toLowerCase();
    const matchesSearch =
      req.spkNumber.toLowerCase().includes(lowerQuery) ||
      req.productName.toLowerCase().includes(lowerQuery);

    const matchStatus = filterStatus ? req.status === filterStatus : true;

    let matchesDate = true;
    if (startDate && endDate) {
      const reqDate = new Date(req.createdAt).toISOString().split("T")[0];
      matchesDate = reqDate >= startDate && reqDate <= endDate;
    }

    return matchesSearch && matchStatus && matchesDate;
  });

  // Tambahkan di awal komponen page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const currentData = activeTab === "needed" ? filteredSpks : filteredRequests;

  // Hitung total halaman
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

  // Ambil data yang akan ditampilkan di halaman sekarang
  const paginatedData = currentData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset page on tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterStatus, startDate, endDate]);

  return (
    <Layout>
      <div className="print:hidden space-y-6">
        <Breadcrumb />
        {/* Header */}
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="inline-flex rounded-xl bg-gray-100 dark:bg-slate-800 p-1 w-full sm:w-auto overflow-x-auto no-scrollbar whitespace-nowrap">
              <button
                onClick={() => setActiveTab("needed")}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "needed"
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                SPK Perlu Produksi
                <span className="ml-1 text-xs text-gray-400">
                  ({spksNeedingProduction.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "history"
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                Riwayat Permintaan
                <span className="ml-1 text-xs text-gray-400">
                  ({requests.length})
                </span>
              </button>
            </div>

            {/* Action */}
            <button
              onClick={() => {
                setFormData({
                  id: null,
                  spkNumber: "",
                  products: [""],
                  memo: "",
                  items: [],
                });
                setShowModal(true);
              }}
              className="w-full sm:w-auto h-11 inline-flex items-center justify-center gap-2 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all text-sm font-bold active:scale-95"
            >
              <Plus size={18} />
              Tambah Manual
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "needed"
                    ? "Cari No SPK / Produk / Toko..."
                    : "Cari No SPK / Produk..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              />
            </div>

            {/* Filter Status & Date (History Only) */}
            {activeTab === "history" && (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-48">
                  <Filter
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm appearance-none"
                  >
                    <option value="">Semua Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-40">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 pl-10 pr-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                  </div>
                  <span className="text-gray-400 hidden sm:inline">—</span>
                  <div className="relative flex-1 sm:w-40">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-10 pl-10 pr-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SPK yang Perlu Produksi (belum ada ProductionRequest) */}
        {activeTab === "needed" && (
          <>
            {paginatedData.length > 0 ? (
              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 mb-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-4">
                  SPK Perlu Produksi (Belum Ada Permintaan)
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(paginatedData as SpkProductionNeeded[]).map((spk) => (
                    <div
                      key={spk.id}
                      className="bg-white border border-blue-200 rounded-xl p-4 hover:shadow-md transition"
                    >
                      {/* HEADER */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {spk.spkNumber}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {spk.lead.nama_toko}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(spk.tglSpk)}
                          </p>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                          {spk.status}
                        </span>
                      </div>

                      {/* ITEM PRODUK */}
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Item Produksi
                        </p>
                        <ul className="space-y-1">
                          {spk.spkItems.map((item) => (
                            <li
                              key={item.id}
                              className="flex flex-col border-b border-gray-100 last:border-0 pb-2 mb-2 last:mb-0 last:pb-0"
                            >
                              <div className="flex justify-between text-sm text-gray-600">
                                <div className="flex flex-col">
                                  <span>{item.namaBarang}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                    <span>Target: {item.qty}</span>
                                    {item.producedQty !== undefined && <span>Hasil: {item.producedQty}</span>}
                                    {item.approvedQty !== undefined && item.approvedQty > 0 && (
                                      <span className="text-blue-600 font-semibold">Diapprove: {item.approvedQty}</span>
                                    )}
                                    {item.productionStatus === "SIAP_KIRIM" && (
                                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit">
                                        <Package size={8} /> SIAP KIRIM
                                      </span>
                                    )}
                                    {item.productionStatus === "REPLACEMENT" && (
                                      <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 w-fit border border-orange-200">
                                        <RefreshCcw size={8} /> PENGAJUAN ULANG (REPLACEMENT)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-gray-500">
                                  {item.qty} {item.satuan}
                                </span>
                              </div>
                              {item.salesOrder?.spesifikasi_tambahan && (
                                <div className="text-xs text-gray-500 mt-1 italic pl-2 border-l-2 border-gray-200">
                                  Spec: {item.salesOrder.spesifikasi_tambahan}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {spk.catatan && (
                        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 mb-3">
                          <span className="font-medium">Catatan:</span>{" "}
                          {spk.catatan}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          const initialItems: Array<{
                            itemId: string;
                            quantity: number;
                            originalQuantity: number;
                          }> = [];

                          // Collect all material usages from SPK root
                          if (spk.materialUsages) {
                            spk.materialUsages.forEach((mu) => {
                              initialItems.push({
                                itemId: mu.materialId,
                                quantity: mu.quantityNeeded,
                                originalQuantity: mu.quantityNeeded,
                              });
                            });
                          }

                          setFormData({
                            id: null,
                            spkNumber: spk.spkNumber,
                            products: spk.spkItems.map((i) =>
                              i.salesOrder?.spesifikasi_tambahan
                                ? `${i.namaBarang} (${i.salesOrder.spesifikasi_tambahan})`
                                : i.namaBarang,
                            ),

                            memo:
                              spk.catatan ||
                              `Produksi untuk SPK ${spk.spkNumber}`,
                            items: initialItems,
                          });
                          setShowModal(true);
                        }}
                        className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                      >
                        Buat Permintaan Produksi
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
                <ClipboardList size={48} className="mb-4 text-gray-400" />
                <p>Tidak ada SPK yang perlu produksi saat ini.</p>
              </div>
            )}
          </>
        )}

        {/* Requests List */}
        {activeTab === "history" && (
          <>
            {loading ? (
              <div className="space-y-4">
                <SkeletonTable rows={4} cols={1} />
                <SkeletonTable rows={4} cols={1} />
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <ClipboardList
                  className="mx-auto text-gray-400 mb-4"
                  size={48}
                />
                <p className="text-gray-600 font-medium">
                  Tidak ada riwayat permintaan produksi
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Klik Tambah Permintaan untuk membuat permintaan baru
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(paginatedData as ProductionRequest[]).map((request) => (
                  <div
                    key={request.id}
                    className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition"
                  >
                    <div className="p-6">
                      {/* HEADER */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            SPK {request.spkNumber}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Dibuat: {formatDate(request.createdAt)}
                          </p>
                          {request.approvedAt && (
                            <p className="text-xs text-gray-500">
                              Disetujui: {formatDate(request.approvedAt)}
                            </p>
                          )}
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            request.status,
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>

                      {/* PRODUK */}
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Produk / Item Produksi
                        </p>

                        {request.spk &&
                        request.spk.spkItems &&
                        request.spk.spkItems.length > 0 ? (
                          <ul className="space-y-2">
                            {request.spk.spkItems.map((item) => (
                              <li
                                key={item.id}
                                className="text-sm text-gray-600 border-b border-gray-100 last:border-0 pb-2"
                              >
                                  <div className="flex flex-col">
                                    <div className="flex justify-between font-medium">
                                      <span>{item.namaBarang}</span>
                                      <span className="text-gray-500">
                                        {item.qty} {item.satuan}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                        <span>Hasil: {item.producedQty || 0}</span>
                                        {item.approvedQty !== undefined && item.approvedQty > 0 && (
                                          <span className="text-blue-600 font-semibold">Diapprove: {item.approvedQty}</span>
                                        )}
                                        {item.productionStatus === "SIAP_KIRIM" && (
                                          <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider">SIAP KIRIM</span>
                                        )}
                                        {item.productionStatus === "REPLACEMENT" && (
                                          <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider">REPLACEMENT</span>
                                        )}
                                      </div>

                                      {/* Tracking Status */}
                                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {(() => {
                                          const onTruck = item.shipping_item?.reduce((sum: number, si: any) => {
                                            if (!si.shipping?.waktuSampai) return sum + si.qty;
                                            return sum;
                                          }, 0) || 0;

                                          return (
                                            <>
                                              {(item.shippedQty || 0) > 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md flex items-center gap-1 font-bold italic">
                                                  ✓ Terkirim {item.shippedQty}
                                                </span>
                                              )}
                                              {onTruck > 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md flex items-center gap-1 font-bold animate-pulse">
                                                  🚚 Di Armada {onTruck}
                                                </span>
                                              )}
                                              {(item.readyQty || 0) > 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md flex items-center gap-1 font-bold">
                                                  📦 Warehouse {item.readyQty}
                                                </span>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                      {request.status === "APPROVED" && (
                                        <button
                                          onClick={() => {
                                            setSelectedItemForProgress({
                                              spkId: request.spk?.id as string,
                                              item: item,
                                            });
                                            setShowProgressModal(true);
                                          }}
                                          className="text-[10px] px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
                                        >
                                          + Lapor Hasil
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                {item.salesOrder?.spesifikasi_tambahan && (
                                  <div className="text-xs text-gray-500 italic">
                                    Spec: {item.salesOrder.spesifikasi_tambahan}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          // Fallback if spkItems not available (backward compatibility)
                          <p className="text-sm text-gray-600">
                            {request.productName}
                          </p>
                        )}
                      </div>

                      {/* MEMO */}
                      <div className="mb-4 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Memo Produksi
                        </p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {request.memo || "-"}
                        </p>
                      </div>

                      {/* ACTION */}
                      <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                        {request.status === "PENDING" && (
                          <button
                            onClick={() => {
                              const productsArr = request.spk?.spkItems?.map(
                                (i) =>
                                  i.salesOrder?.spesifikasi_tambahan
                                    ? `${i.namaBarang} (${i.salesOrder.spesifikasi_tambahan})`
                                    : i.namaBarang,
                              ) || [request.productName];

                              setFormData({
                                id: request.id,
                                spkNumber: request.spkNumber,
                                products: productsArr,
                                memo: request.memo,
                                items: request.items.map((item) => ({
                                  itemId: item.item.id,
                                  quantity: item.quantity,
                                  originalQuantity: item.quantity,
                                })),
                              });
                              setShowModal(true);
                            }}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition"
                          >
                            Edit Permintaan
                          </button>
                        )}
                        {request.status === "APPROVED" && (
                          <button
                            onClick={() => {
                              setSelectedRequestForPrint(request);
                              setShowPrintModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all hover:shadow-md"
                          >
                            <Printer size={16} />
                            Pratinjau & Cetak
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            {/* Prev */}
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              Prev
            </button>

            {/* Page Numbers */}
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded-lg ${
                    currentPage === i + 1
                      ? "bg-blue-600 text-white border-blue-600"
                      : ""
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* Next */}
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h3 className="text-xl font-bold">
                  {formData.id
                    ? "Edit Permintaan Bahan Baku"
                    : "Tambah Permintaan Bahan Baku"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      id: null,
                      spkNumber: "",
                      products: [],
                      memo: "",
                      items: [],
                    });
                  }}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor SPK *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.spkNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, spkNumber: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Contoh: SPK-2024-001"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Produk yang Dikerjakan *
                      </label>
                      <button
                        type="button"
                        onClick={handleAddProduct}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                      >
                        <Plus size={14} />
                        Tambah Produk
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formData.products.map((product, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={product}
                            onChange={(e) =>
                              handleProductChange(index, e.target.value)
                            }
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Produk ${index + 1}`}
                          />
                          {formData.products.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      {formData.products.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          Klik Tambah Produk untuk menambahkan produk
                        </p>
                      )}
                    </div>
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
                    placeholder="Keterangan permintaan..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Daftar Bahan Baku *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    >
                      <Plus size={16} />
                      Tambah Bahan Baku
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.items.map((item, index) => {
                      const selectedItem = items.find(
                        (it) => it.id === item.itemId,
                      );
                      const physicalStock = selectedItem?.currentStock || 0;
                      const reservedStock = selectedItem?.reservedStock || 0;

                      // stok yang benar-benar bisa dipakai sekarang
                      const availableStock = physicalStock - reservedStock;

                      // qty lama (kalau edit) dianggap sudah “megang stok”
                      const originalQuantity = item.originalQuantity || 0;

                      // stok tersedia + jatah yang sudah dipegang request ini
                      const adjustedAvailable =
                        availableStock + originalQuantity;

                      const quantity = item.quantity || 0;
                      const shortage =
                        quantity > adjustedAvailable
                          ? quantity - adjustedAvailable
                          : 0;
                      const remaining = adjustedAvailable - quantity;

                      return (
                        <div
                          key={index}
                          className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <div className="flex gap-2 mb-3">
                            <select
                              required
                              value={item.itemId}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "itemId",
                                  e.target.value,
                                )
                              }
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Pilih Bahan Baku</option>
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>
                                  {it.name} -{" "}
                                  {it.itemType?.name || "Tidak ada jenis"} (
                                  {it.code})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          {selectedItem && (
                            <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                              <div className="mb-2 pb-2 border-b border-gray-200">
                                <div className="text-sm">
                                  <span className="text-gray-600">
                                    Jenis Bahan Baku:
                                  </span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {selectedItem.itemType?.name ||
                                      "Tidak ada jenis"}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {selectedItem.name} ({selectedItem.code})
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-600">
                                    Stok Fisik:
                                  </span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {physicalStock} {selectedItem.unit.name}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Stok Ter-reserve:
                                  </span>
                                  <span className="ml-2 font-semibold text-amber-600">
                                    {reservedStock} {selectedItem.unit.name}
                                  </span>
                                </div>
                                <div className="col-span-2 p-2 bg-blue-50 rounded-lg border border-blue-100 mt-1">
                                  <span className="text-blue-700 font-medium">
                                    Stok Tersedia (Siap Pakai):
                                  </span>
                                  <span className="ml-2 font-bold text-blue-900">
                                    {availableStock} {selectedItem.unit.name}
                                  </span>
                                  <p className="text-[10px] text-blue-500 mt-0.5">
                                    * Stok Fisik dikurangi stok yang sudah
                                    dipesan SPK/produksi lain
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Kuantitas yang Diminta Sekarang
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                value={item.quantity || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    "quantity",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                placeholder="0.00"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {selectedItem && quantity > 0 && (
                            <div className="mt-3 space-y-1">
                              {shortage > 0 ? (
                                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                                  <span className="font-medium text-red-800">
                                    Kekurangan:
                                  </span>
                                  <span className="ml-2 text-red-700 font-bold">
                                    {shortage} {selectedItem.unit.name}
                                  </span>
                                </div>
                              ) : (
                                <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                                  <span className="font-medium text-green-800">
                                    Sisa Stok (Setelah Permintaan Ini):
                                  </span>
                                  <span className="ml-2 text-green-700 font-bold">
                                    {remaining} {selectedItem.unit.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {formData.items.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Klik Tambah Bahan Baku untuk menambahkan item
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({
                        id: null,
                        spkNumber: "",
                        products: [],
                        memo: "",
                        items: [],
                      });
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>{" "}
      {/* End of print:hidden container */}
      {/* Modal Pratinjau Cetak */}
      <AnimatePresence>
        {showPrintModal && selectedRequestForPrint && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0 print:block">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col relative print:max-w-none print:max-h-none print:shadow-none print:rounded-none"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200 rounded-t-2xl z-20 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <Printer size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Pratinjau Dokumen
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                      Siap untuk dicetak
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Konten Modal (Preview area) */}
              <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-8 print:bg-white print:p-0 print:overflow-visible">
                <div
                  id="printable-area"
                  className="bg-white shadow-2xl mx-auto w-full max-w-[210mm] min-h-[297mm] print:max-w-none print:min-h-0 print:shadow-none print:mx-0"
                >
                  <ProductionPrintDoc request={selectedRequestForPrint} />
                </div>
              </div>

              {/* Footer Modal */}
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl print:hidden">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all font-bold text-sm"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Printer size={16} />
                  Cetak Sekarang
                </button>
              </div>

              {/* CSS Khusus Print - Extreme isolation */}
              <style jsx global>{`
                @media print {
                  /* Menyembunyikan elemen global yang sering lolos */
                  nav,
                  sidebar,
                  header,
                  footer,
                  .breadcrumb,
                  button,
                  main > div:not(.z-\\[100\\]) {
                    display: none !important;
                    height: 0 !important;
                    overflow: hidden !important;
                  }

                  /* Reset body & html & all parent containers */
                  html,
                  body,
                  #__next,
                  main {
                    margin: 0 !important;
                    padding: 0 !important;
                    height: auto !important;
                    min-height: 0 !important;
                    background: white !important;
                    overflow: visible !important;
                  }

                  /* Paksa layout modal agar memenuhi halaman */
                  .fixed.inset-0.z-\\[100\\] {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    display: block !important;
                    padding: 0 !important;
                    background: white !important;
                  }

                  .bg-white.rounded-2xl {
                    border: none !important;
                    box-shadow: none !important;
                    max-height: none !important;
                    border-radius: 0 !important;
                  }

                  /* Atur ukuran kertas ke A4 dengan margin yang pas */
                  @page {
                    size: A4;
                    margin: 15mm;
                  }

                  /* Pastikan printable area adalah satu-satunya yang terlihat */
                  #printable-area {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: block !important;
                    min-height: 0 !important;
                    box-shadow: none !important;
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                  }
                }
              `}</style>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        {/* Progress Modal */}
        {showProgressModal && selectedItemForProgress && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Lapor Hasil Produksi
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Item: <span className="font-semibold">{selectedItemForProgress.item.namaBarang}</span>
                <br />
                Target: {selectedItemForProgress.item.qty} {selectedItemForProgress.item.satuan}
                <br />
                Sudah Selesai: {selectedItemForProgress.item.producedQty || 0}
              </p>

              <form onSubmit={handleReportProgress} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Barang Selesai Baru *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    value={progressQty || ""}
                    onChange={(e) => setProgressQty(parseFloat(e.target.value) || 0)}
                    disabled={submittingProgress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Masukkan jumlah..."
                  />
                  <p className="text-[10px] text-gray-400 mt-1 italic">
                    * Ini akan menambah saldo Siap Kirim di Dashboard Approval Gudang.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProgressModal(false);
                      setProgressQty(0);
                    }}
                    disabled={submittingProgress}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingProgress || progressQty <= 0}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {submittingProgress ? "Menyimpan..." : "Simpan Laporan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </Layout>
  );
}

// Sub-component for the document content
function ProductionPrintDoc({ request }: { request: ProductionRequest }) {
  const docNumber = `PR-${request.spkNumber.replace("SPK/", "")}`;

  return (
    <PDFTemplate
      title="PERMINTAAN PRODUKSI"
      subtitle="Dokumen Instruksi Persiapan Bahan & Produksi"
      companyName="PT Maju Jaya Mitra Plastindo"
      logoSrc="/assets/template.png"
      documentInfo={{
        date: formatDate(request.createdAt),
        documentNumber: docNumber,
        status: request.status,
      }}
      showSignature
      signatureLeft={{
        label: "Disetujui oleh,",
        name: "Admin Produksi",
      }}
      signatureRight={{
        label: "Dibuat oleh,",
        name: request.user.name,
      }}
    >
      {/* ================= BARANG YANG DIKERJAKAN ================= */}
      <div className="mb-8">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-blue-900 border-l-4 border-blue-600 pl-3">
          Produk yang Dikerjakan
        </p>

        <div className="space-y-4 ml-4">
          {request.spk?.spkItems?.length ? (
            request.spk.spkItems.map((item) => (
              <div key={item.id} className="relative">
                <p className="text-base font-bold text-gray-900">
                  {item.qty} {item.satuan} – {item.namaBarang}
                </p>

                {item.salesOrder?.spesifikasi_tambahan && (
                  <div className="mt-1 flex items-start gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded font-bold uppercase h-fit mt-0.5">
                      SPEC
                    </span>
                    <p className="text-xs text-gray-600 italic leading-relaxed">
                      {item.salesOrder.spesifikasi_tambahan}
                    </p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-base font-bold text-gray-900">
              {request.productName}
            </p>
          )}
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="mb-10">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-blue-900 border-l-4 border-blue-600 pl-3">
          Bahan Baku yang Dibutuhkan
        </p>

        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm ml-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-3 text-left w-12 font-bold uppercase tracking-wider text-[10px]">
                  No
                </th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">
                  Kode
                </th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">
                  Nama Barang
                </th>
                <th className="px-4 py-3 text-center w-24 font-bold uppercase tracking-wider text-[10px]">
                  Qty
                </th>
                <th className="px-4 py-3 text-left w-24 font-bold uppercase tracking-wider text-[10px]">
                  Satuan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {request.items.map((item, idx) => (
                <tr
                  key={item.id}
                  className="hover:bg-blue-50/30 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-400 font-medium">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-600 font-bold">
                    {item.item.code}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {item.item.name}
                  </td>
                  <td className="px-4 py-3 text-center font-black text-gray-900">
                    {item.quantity.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-medium">
                    {item.item.unit.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MEMO ================= */}
      {request.memo && (
        <div className="mt-8 ml-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Keterangan / Memo
          </p>
          <div className="whitespace-pre-line rounded-2xl border border-blue-100 bg-blue-50/30 p-4 text-sm text-gray-700 leading-relaxed font-medium">
            {request.memo}
          </div>
        </div>
      )}
    </PDFTemplate>
  );
}
