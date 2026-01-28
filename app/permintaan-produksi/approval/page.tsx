"use client";

import { toast } from "react-toastify";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Filter,
  Printer,
} from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

interface Item {
  id: string;
  code: string;
  name: string;
  currentStock: number;
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
    spkItems: {
      id: string;
      namaBarang: string;
      qty: number;
      satuan: string;
      salesOrder: {
        spesifikasi_barang?: string;
      };
    }[];
  };
}

export default function ApprovalPage() {
  const [requests, setRequests] = useState<ProductionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true); // ⬅️ TAMBAH INI
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

  const handleApprove = async (id: string) => {
    if (
      !confirm(
        "Yakin ingin menyetujui permintaan ini? Stok bahan baku akan otomatis dikurangi dan tercatat di transaksi barang keluar.",
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
        toast.success(
          "Permintaan disetujui! Stok bahan baku telah dikurangi dan tercatat di transaksi barang keluar.",
        );
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

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Back */}
            <Link
              href="/permintaan-produksi"
              className="h-10 inline-flex items-center px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              ← Kembali
            </Link>

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
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonTable rows={4} cols={1} />
            <SkeletonTable rows={4} cols={1} />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 font-medium">
              Tidak ada permintaan produksi
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {filterStatus === "PENDING"
                ? "Tidak ada permintaan yang perlu di-approve"
                : "Tidak ada data untuk status yang dipilih"}
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
                            request.status,
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Produk:</span>
                        {request.spk && request.spk.spkItems && request.spk.spkItems.length > 0 ? (
                            <ul className="mt-2 space-y-2 pl-2 border-l-2 border-blue-100">
                              {request.spk.spkItems.map((item, idx) => (
                                <li key={idx}>
                                  <div className="flex justify-between gap-4">
                                      <span className="font-semibold text-gray-800">{item.namaBarang}</span>
                                      <span className="text-gray-500 whitespace-nowrap">{item.qty} {item.satuan}</span>
                                  </div>
                                   {item.salesOrder?.spesifikasi_barang && (
                                      <div className="text-xs text-gray-500 mt-0.5 italic">
                                        Spec: {item.salesOrder.spesifikasi_barang}
                                      </div>
                                    )}
                                </li>
                              ))}
                            </ul>
                        ) : (
                             <ul className="list-disc list-inside mt-1 ml-2">
                              {request.productName
                                .split(", ")
                                .map((product, idx) => (
                                  <li key={idx}>{product}</li>
                                ))}
                            </ul>
                        )}

                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Tanggal:</span>{" "}
                        {formatDate(request.createdAt)}
                      </p>
                      {request.approvedAt && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Tanggal Approval:</span>{" "}
                          {formatDate(request.approvedAt)}
                        </p>
                      )}
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
                      Bahan Baku yang Dibutuhkan:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                              Barang
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                              Jenis
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                              Qty Dibutuhkan
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                              Stok Tersedia
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                              Status Stok
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {request.items.map((item) => {
                            const isSufficient =
                              item.item.currentStock >= item.quantity;
                            return (
                              <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  <div>
                                    <div className="font-medium">
                                      {item.item.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {item.item.code}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {item.item.itemType?.name ||
                                    "Tidak ada jenis"}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {item.quantity} {item.item.unit.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {item.item.currentStock} {item.item.unit.name}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {isSufficient ? (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      Cukup
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                      Tidak Cukup
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {request.status === "PENDING" && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={approving === request.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approving === request.id ? (
                          <>
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Memproses...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            Setujui & Kurangi Stok
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={approving === request.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle size={18} />
                        Tolak
                      </button>
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
      </div>
    </Layout>
  );
}
