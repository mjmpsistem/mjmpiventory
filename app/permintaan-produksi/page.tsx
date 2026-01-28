/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "react-toastify";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { ClipboardList, Plus, Filter, X, Trash2, Printer } from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

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
    spkItems: SpkItem[];
  };
}

interface SpkItem {
  id: string;
  namaBarang: string;
  qty: number;
  satuan: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  salesOrder?: {
    id: number;
    spesifikasi_barang?: string | null;
  };
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
}

export default function PermintaanProduksiPage() {
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [spksNeedingProduction, setSpksNeedingProduction] = useState<
    SpkProductionNeeded[]
  >([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const [activeTab, setActiveTab] = useState<"needed" | "history">("needed");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [formData, setFormData] = useState({
    spkNumber: "",
    products: [] as string[],
    memo: "",
    items: [] as Array<{ itemId: string; quantity: number }>,
  });
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

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
      items: [...formData.items, { itemId: "", quantity: 0 }],
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
      const res = await fetch("/api/production-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          productName,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          spkNumber: "",
          products: [],
          memo: "",
          items: [],
        });
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

  const handleApprove = async (id: string) => {
    if (
      !confirm(
        "Yakin ingin menyetujui permintaan ini? Stok akan otomatis dikurangi.",
      )
    ) {
      return;
    }

    setApproving(id);
    try {
      const res = await fetch(`/api/production-requests/${id}/approve`, {
        method: "POST",
      });

      if (res.ok) {
        fetchRequests();
        fetchSpksNeedingProduction();
        toast.success("Permintaan disetujui dan transaksi dibuat");
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Yakin ingin menolak permintaan ini?")) {
      return;
    }

    try {
      const res = await fetch(`/api/production-requests/${id}/reject`, {
        method: "POST",
      });

      if (res.ok) {
        fetchRequests();
        fetchSpksNeedingProduction();
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
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
          item.salesOrder?.spesifikasi_barang?.toLowerCase().includes(q),
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
      <div className="space-y-6">
        <Breadcrumb />
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tabs */}
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setActiveTab("needed")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "needed"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                SPK Perlu Produksi
                <span className="ml-1 text-xs text-gray-400">
                  ({spksNeedingProduction.length})
                </span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "history"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
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
              onClick={() => setShowModal(true)}
              className="h-10 inline-flex items-center gap-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-semibold"
            >
              <Plus size={18} />
              Tambah Manual
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-sm">
              <input
                type="text"
                placeholder={
                  activeTab === "needed"
                    ? "Cari No SPK / Produk..."
                    : "Cari No SPK / Produk..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Status (History Only) */}
            {activeTab === "history" && (
              <>
                <div className="relative">
                  <Filter
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-10 pl-10 pr-4 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Semua Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
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
                                <span>{item.namaBarang}</span>
                                <span className="text-gray-500">
                                  {item.qty} {item.satuan}
                                </span>
                              </div>
                              {item.salesOrder?.spesifikasi_barang && (
                                <div className="text-xs text-gray-500 mt-1 italic pl-2 border-l-2 border-gray-200">
                                  Spec: {item.salesOrder.spesifikasi_barang}
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
                          setFormData({
                            spkNumber: spk.spkNumber,
                            products: spk.spkItems.map((i) =>
                              i.salesOrder?.spesifikasi_barang
                                ? `${i.namaBarang} (${i.salesOrder.spesifikasi_barang})`
                                : i.namaBarang,
                            ),

                            memo:
                              spk.catatan ||
                              `Produksi untuk SPK ${spk.spkNumber}`,
                            items: [],
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
                                <div className="flex justify-between font-medium">
                                  <span>{item.namaBarang}</span>
                                  <span className="text-gray-500">
                                    {item.qty} {item.satuan}
                                  </span>
                                </div>
                                {item.salesOrder?.spesifikasi_barang && (
                                  <div className="text-xs text-gray-500 italic">
                                    Spec: {item.salesOrder.spesifikasi_barang}
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
                      <div className="pt-4 border-t border-gray-200 flex gap-3">
                        {request.status === "APPROVED" && (
                          <Link
                            href={`/permintaan-produksi/${request.id}/print`}
                            target="_blank"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                          >
                            Cetak PDF Produksi
                          </Link>
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
                  Tambah Permintaan Bahan Baku
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
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
                      const currentStock = selectedItem?.currentStock || 0;
                      const reservedStock = selectedItem?.reservedStock || 0;
                      const availableStock = currentStock - reservedStock;
                      const quantity = item.quantity || 0;
                      const shortage =
                        quantity > availableStock
                          ? quantity - availableStock
                          : 0;
                      const remaining = availableStock - quantity;

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
                                    Stok Tersedia:
                                  </span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {availableStock.toFixed(2)}{" "}
                                    {selectedItem.unit.name}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Stok Total:
                                  </span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {currentStock.toFixed(2)}{" "}
                                    {selectedItem.unit.name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Kuantitas Dibutuhkan
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
                                  <span className="ml-2 text-red-700">
                                    {shortage.toFixed(2)}{" "}
                                    {selectedItem.unit.name}
                                  </span>
                                </div>
                              ) : (
                                <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                                  <span className="font-medium text-green-800">
                                    Sisa Stok:
                                  </span>
                                  <span className="ml-2 text-green-700">
                                    {remaining.toFixed(2)}{" "}
                                    {selectedItem.unit.name}
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
      </div>
    </Layout>
  );
}
