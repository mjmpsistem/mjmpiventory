/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { ClipboardList, Plus, Filter, X, Trash2, Printer } from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";

interface Item {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  category: string;
  unit: { name: string };
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
  user: { name: string };
  items: ProductionRequestItem[];
}

interface SpkItem {
  id: string;
  namaBarang: string;
  qty: number;
  satuan: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  salesOrder: {
    id: number;
    nama_barang: string;
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
  const [spksNeedingProduction, setSpksNeedingProduction] = useState<SpkProductionNeeded[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const [formData, setFormData] = useState({
    spkNumber: "",
    productName: "",
    memo: "",
    items: [] as Array<{ itemId: string; quantity: number }>,
  });

  useEffect(() => {
    fetchRequests();
    fetchSpksNeedingProduction();
    fetchItems();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
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

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemId: "", quantity: 0 }],
    });
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
      alert("Memo wajib diisi");
      return;
    }

    if (formData.items.length === 0) {
      alert("Minimal harus ada 1 bahan baku");
      return;
    }

    try {
      const res = await fetch("/api/production-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          spkNumber: "",
          productName: "",
          memo: "",
          items: [],
        });
        fetchRequests();
        fetchSpksNeedingProduction();
      } else {
        const data = await res.json();
        alert(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan");
    }
  };

  const handleApprove = async (id: string) => {
    if (
      !confirm(
        "Yakin ingin menyetujui permintaan ini? Stok akan otomatis dikurangi."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/production-requests/${id}/approve`, {
        method: "POST",
      });

      if (res.ok) {
        fetchRequests();
        fetchSpksNeedingProduction();
        alert("Permintaan disetujui dan transaksi dibuat");
      } else {
        const data = await res.json();
        alert(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
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
        alert(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
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
            {/* Filter Status */}
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

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action */}
            <button
              onClick={() => setShowModal(true)}
              className="h-10 inline-flex items-center gap-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-semibold"
            >
              <Plus size={18} />
              Tambah Permintaan
            </button>
          </div>
        </div>

        {/* SPK yang Perlu Produksi (belum ada ProductionRequest) */}
        {spksNeedingProduction.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">
              SPK yang Perlu Produksi (Belum Ada Permintaan)
            </h2>
            <div className="space-y-4">
              {spksNeedingProduction.map((spk) => (
                <div
                  key={spk.id}
                  className="bg-white rounded-lg border border-blue-200 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {spk.spkNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Customer: {spk.lead.nama_toko}
                      </p>
                      <p className="text-sm text-gray-600">
                        Tanggal SPK: {formatDate(spk.tglSpk)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {spk.status}
                    </span>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Barang yang Perlu Diproduksi:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {spk.spkItems.map((item) => (
                        <li key={item.id} className="text-sm text-gray-600">
                          {item.namaBarang} - {item.qty} {item.satuan}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {spk.catatan && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                      <span className="font-medium">Catatan:</span> {spk.catatan}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      // Pre-fill form dengan data SPK
                      setFormData({
                        spkNumber: spk.spkNumber,
                        productName: spk.spkItems.map(i => i.namaBarang).join(", "),
                        memo: spk.catatan || `Produksi untuk SPK ${spk.spkNumber}`,
                        items: [],
                      });
                      setShowModal(true);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    Buat Permintaan Produksi untuk SPK ini
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requests List */}
        {requests.length === 0 && spksNeedingProduction.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 font-medium">
              Tidak ada permintaan produksi
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Klik Tambah Permintaan untuk membuat permintaan baru
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          SPK: {request.spkNumber}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Produk:</span>{" "}
                        {request.productName}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Tanggal:</span>{" "}
                        {formatDate(request.createdAt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">User:</span>{" "}
                        {request.user.name}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Memo:
                    </p>
                    <p className="text-sm text-gray-600">{request.memo}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Bahan Baku:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                              Barang
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                              Qty
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                              Stok Tersedia
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {request.items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {item.item.name}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {item.quantity} {item.item.unit.name}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {item.item.currentStock} {item.item.unit.name}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {request.status === "PENDING" && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <Link
                        href="/permintaan-produksi/approval"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Lihat Detail & Approve
                      </Link>
                    </div>
                  )}

                  {request.status === "APPROVED" && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <Link
                        href={`/permintaan-produksi/${request.id}/print`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Printer size={18} />
                        Cetak PDF Produksi
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
                      productName: "",
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Produk yang Dikerjakan *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.productName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productName: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nama produk"
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
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <select
                          required
                          value={item.itemId}
                          onChange={(e) =>
                            handleItemChange(index, "itemId", e.target.value)
                          }
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Pilih Bahan Baku</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} - Stok: {it.currentStock} {it.unit.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="Qty"
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
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
                        productName: "",
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
