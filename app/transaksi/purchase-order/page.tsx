/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  Plus,
  X,
  Edit2,
  Trash2,
  Printer,
  FileText,
  CheckCircle,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { toast } from "react-toastify";

interface PurchaseOrderItem {
  id?: string;
  namaBarang: string;
  ukuran: string;
  qty: number;
  satuan: string;
  noticeMerkJenis: string;
  subTotal: number;
}

interface PurchaseOrder {
  id: string;
  kepada: string;
  nomorPO: string;
  tanggal: string;
  jatuhTempo: string;
  keteranganTambahan: string | null;
  hormatKami: string | null;
  status: string;
  spk?: { id: string; spkNumber: string } | null;
  user: { name: string };
  items: PurchaseOrderItem[];
}

interface SpkOption {
  id: string;
  spkNumber: string;
  lead: { nama_toko: string };
  spkItems: Array<{
    id: string;
    namaBarang: string;
    qty: number;
    satuan: string;
  }>;
  purchaseOrders?: Array<{
    id: string;
    nomorPO: string;
    kepada: string;
    status: string;
  }>;
}

interface SpkWithTrading {
  id: string;
  spkNumber: string;
  status: string;
  tglSpk: string;
  deadline: string | null;
  lead: { id: number; nama_toko: string; nama_owner: string; nama_pic: string };
  user: { id: string; name: string; username: string };
  spkItems: Array<{
    id: string;
    namaBarang: string;
    qty: number;
    satuan: string;
  }>;
  purchaseOrders: Array<{
    id: string;
    nomorPO: string;
    kepada: string;
    status: string;
  }>;
}

export default function PurchaseOrderPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [spksWithTrading, setSpksWithTrading] = useState<SpkWithTrading[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSpks, setLoadingSpks] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [itemsLoading, setItemsLoading] = useState(false);
  const [spkOptions, setSpkOptions] = useState<SpkOption[]>([]);
  const [selectedSpkId, setSelectedSpkId] = useState<string>("");
  const [loadingSpk, setLoadingSpk] = useState(false);
  const [activeTab, setActiveTab] = useState<"po" | "spk">("spk");
  const [poSearch, setPoSearch] = useState("");
  const [spkSearch, setSpkSearch] = useState("");
  const [poStatus, setPoStatus] = useState<"ALL" | string>("ALL");
  const [spkStatus, setSpkStatus] = useState<"ALL" | "APPROVED" | "PENDING">(
    "ALL",
  );

  /* ================= SHARED PAGINATION ================= */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* FILTER LOGIC */
  const filteredSpks = spksWithTrading.filter((spk) => {
    const lowerSearch = spkSearch.toLowerCase();
    const matchesSearch =
      spk.spkNumber.toLowerCase().includes(lowerSearch) ||
      spk.lead.nama_toko.toLowerCase().includes(lowerSearch);

    const hasPO = spk.purchaseOrders && spk.purchaseOrders.length > 0;

    // Status Logic for SPK:
    // APPROVED = Has at least one PO
    // PENDING = No PO
    const matchesStatus =
      spkStatus === "ALL" ? true : spkStatus === "APPROVED" ? hasPO : !hasPO;

    return matchesSearch && matchesStatus;
  });

  const filteredPOs = purchaseOrders.filter((po) => {
    const lowerSearch = poSearch.toLowerCase();
    const matchesSearch =
      po.nomorPO.toLowerCase().includes(lowerSearch) ||
      po.kepada.toLowerCase().includes(lowerSearch) ||
      po.user.name.toLowerCase().includes(lowerSearch);

    const matchesStatus = poStatus === "ALL" ? true : po.status === poStatus;

    return matchesSearch && matchesStatus;
  });

  /* total item sesuai tab */
  const totalItems =
    activeTab === "spk" ? filteredSpks.length : filteredPOs.length;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  /* slice data PER TAB (PENTING) */
  const paginatedSpks = filteredSpks.slice(startIndex, endIndex);
  const paginatedPOs = filteredPOs.slice(startIndex, endIndex);

  /* reset page kalau tab / pageSize berubah */
  useEffect(() => {
    setPage(1);
  }, [activeTab, pageSize]);

  const [formData, setFormData] = useState({
    kepada: "",
    nomorPO: "",
    tanggal: new Date().toISOString().split("T")[0],
    jatuhTempo: "",
    keteranganTambahan: "",
    hormatKami: "",
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>([
    {
      namaBarang: "",
      ukuran: "",
      qty: 0,
      satuan: "",
      noticeMerkJenis: "",
      subTotal: 0,
    },
  ]);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/purchase-orders?${params.toString()}`);
      const data = await res.json();

      // 🔐 PASTIKAN SELALU ARRAY
      const poArray = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.purchaseOrders)
            ? data.purchaseOrders
            : [];

      setPurchaseOrders(poArray);
    } catch (err) {
      console.error(err);
      setPurchaseOrders([]); // ⬅️ PENTING
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSpkOptions();
    fetchSpksWithTrading();
  }, [fetchPurchaseOrders]);

  const fetchSpksWithTrading = async () => {
    try {
      setLoadingSpks(true);
      const res = await fetch("/api/spk/trading-needed");
      const data = await res.json();
      setSpksWithTrading(data.spks || []);
    } catch (err) {
      console.error(err);
      setSpksWithTrading([]);
    } finally {
      setLoadingSpks(false);
    }
  };

  const fetchSpkOptions = async () => {
    try {
      setLoadingSpk(true);
      const res = await fetch("/api/spk/trading-needed");
      const data = await res.json();
      setSpkOptions(data.spks || []);
    } catch (err) {
      console.error(err);
      setSpkOptions([]);
    } finally {
      setLoadingSpk(false);
    }
  };

  const handleSpkSelect = (spkId: string) => {
    setSelectedSpkId(spkId);
    if (!spkId) {
      return;
    }

    const selectedSpk =
      spkOptions.find((spk) => spk.id === spkId) ||
      spksWithTrading.find((spk) => spk.id === spkId);
    if (!selectedSpk) return;

    // Auto-fill form dari SPK
    setFormData({
      ...formData,
      kepada: selectedSpk.lead.nama_toko || "",
    });

    // Auto-fill items dari SPK items
    const spkItems = selectedSpk.spkItems.map((item) => ({
      namaBarang: item.namaBarang,
      ukuran: "",
      qty: item.qty,
      satuan: item.satuan,
      noticeMerkJenis: "",
      subTotal: 0, // User harus input manual
    }));

    setItems(
      spkItems.length > 0
        ? spkItems
        : [
            {
              namaBarang: "",
              ukuran: "",
              qty: 0,
              satuan: "",
              noticeMerkJenis: "",
              subTotal: 0,
            },
          ],
    );
  };

  const handleCreatePOFromSpk = (spk: SpkWithTrading) => {
    setSelectedSpkId(spk.id);
    setFormData({
      kepada: "",
      nomorPO: "",
      tanggal: new Date().toISOString().split("T")[0],
      jatuhTempo: "",
      keteranganTambahan: "",
      hormatKami: "",
    });

    // Auto-fill items dari SPK items
    const spkItems = spk.spkItems.map((item) => ({
      namaBarang: item.namaBarang,
      ukuran: "",
      qty: item.qty,
      satuan: item.satuan,
      noticeMerkJenis: "",
      subTotal: 0, // User harus input manual
    }));

    setItems(
      spkItems.length > 0
        ? spkItems
        : [
            {
              namaBarang: "",
              ukuran: "",
              qty: 0,
              satuan: "",
              noticeMerkJenis: "",
              subTotal: 0,
            },
          ],
    );

    setShowModal(true);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        namaBarang: "",
        ukuran: "",
        qty: 0,
        satuan: "",
        noticeMerkJenis: "",
        subTotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto calculate subTotal if qty or harga changes
    if (field === "qty" || field === "hargaSatuan") {
      // For now, subTotal needs to be calculated manually or we need hargaSatuan field
      // Let's keep it simple and let user input subTotal
    }

    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.subTotal || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.kepada ||
      !formData.nomorPO ||
      !formData.tanggal ||
      !formData.jatuhTempo
    ) {
      toast.error("Mohon lengkapi data PO");
      return;
    }

    if (
      items.length === 0 ||
      items.some(
        (item) => !item.namaBarang || !item.satuan || item.subTotal === 0,
      )
    ) {
      toast.error("Mohon lengkapi data item");
      return;
    }

    try {
      const url = editingPO
        ? `/api/purchase-orders/${editingPO.id}`
        : "/api/purchase-orders";
      const method = editingPO ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          spkId: selectedSpkId || null,
          status: editingPO ? editingPO.status : "PENDING",
          items: items.map((item) => ({
            namaBarang: item.namaBarang,
            ukuran: item.ukuran || null,
            qty: parseFloat(item.qty.toString()) || 0,
            satuan: item.satuan,
            noticeMerkJenis: item.noticeMerkJenis || null,
            subTotal: parseFloat(item.subTotal.toString()) || 0,
          })),
        }),
      });

      if (res.ok) {
        toast.success(
          editingPO
            ? "Purchase Order berhasil diupdate"
            : "Purchase Order berhasil dibuat",
        );
        setShowModal(false);
        resetForm();
        fetchPurchaseOrders();
        fetchSpksWithTrading(); // Refresh SPK list
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const resetForm = () => {
    setEditingPO(null);
    setSelectedSpkId("");
    setFormData({
      kepada: "",
      nomorPO: "",
      tanggal: new Date().toISOString().split("T")[0],
      jatuhTempo: "",
      keteranganTambahan: "",
      hormatKami: "",
    });
    setItems([
      {
        namaBarang: "",
        ukuran: "",
        qty: 0,
        satuan: "",
        noticeMerkJenis: "",
        subTotal: 0,
      },
    ]);
  };

  const handleEdit = (po: PurchaseOrder) => {
    setItemsLoading(true); // ⬅️ WAJIB

    setShowModal(true); // buka modal DULU biar skeleton keliatan

    // kasih delay kecil supaya skeleton sempat render
    setTimeout(() => {
      setEditingPO(po);
      setSelectedSpkId(po.spk?.id || "");

      setFormData({
        kepada: po.kepada,
        nomorPO: po.nomorPO,
        tanggal: po.tanggal.split("T")[0],
        jatuhTempo: po.jatuhTempo.split("T")[0],
        keteranganTambahan: po.keteranganTambahan || "",
        hormatKami: po.hormatKami || "",
      });

      setItems(
        po.items.map((item) => ({
          id: item.id,
          namaBarang: item.namaBarang,
          ukuran: item.ukuran || "",
          qty: item.qty,
          satuan: item.satuan,
          noticeMerkJenis: item.noticeMerkJenis || "",
          subTotal: item.subTotal,
        })),
      );

      setItemsLoading(false); // ⬅️ MATIKAN SKELETON
    }, 300); // 200–400ms ideal
  };

  const [approvingPOId, setApprovingPOId] = useState<string | null>(null);

  const handleApprovePO = async (poId: string) => {
    if (!confirm("Yakin ingin approve Purchase Order ini?")) return;

    setApprovingPOId(poId);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Purchase Order berhasil di-approve");
        fetchPurchaseOrders();
        fetchSpksWithTrading(); // Refresh SPK list
      } else {
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setApprovingPOId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus PO ini?")) return;

    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Purchase Order berhasil dihapus");
        fetchPurchaseOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handlePrint = (po: PurchaseOrder) => {
    window.open(`/transaksi/purchase-order/${po.id}/print`, "_blank");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          {/* ROW 1 — Tabs */}
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setActiveTab("spk")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "spk"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                SPK Trading
                <span className="ml-1 text-xs text-gray-400">
                  ({spksWithTrading.length})
                </span>
              </button>

              <button
                onClick={() => setActiveTab("po")}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                  activeTab === "po"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Purchase Orders
                <span className="ml-1 text-xs text-gray-400">
                  ({purchaseOrders.length})
                </span>
              </button>
            </div>
          </div>

          {/* ROW 2 — Filter */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {activeTab === "spk" && (
              <>
                <input
                  type="text"
                  placeholder="Cari No SPK / Customer"
                  value={spkSearch}
                  onChange={(e) => setSpkSearch(e.target.value)}
                  className="h-10 w-full sm:w-[260px] px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />

                <select
                  value={spkStatus}
                  onChange={(e) => setSpkStatus(e.target.value as any)}
                  className="h-10 w-full sm:w-[160px] px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="APPROVED">Sudah PO</option>
                  <option value="PENDING">Belum PO</option>
                </select>
              </>
            )}

            {activeTab === "po" && (
              <>
                <input
                  type="text"
                  placeholder="Cari No PO / Vendor"
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  className="h-10 w-full sm:w-[260px] px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />

                <select
                  value={poStatus}
                  onChange={(e) => setPoStatus(e.target.value)}
                  className="h-10 w-full sm:w-[150px] px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                </select>

                {/* Date Range */}
                <div className="flex items-center gap-2">
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

                {/* Spacer */}
                <div className="flex-1" />

                {/* Action */}
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="h-10 inline-flex items-center gap-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition text-sm font-semibold"
                >
                  <Plus size={18} />
                  Tambah PO Manual
                </button>
              </>
            )}
          </div>
        </div>

        {/* SPK Trading Table */}
        {/* ================= SPK TRADING TABLE ================= */}
        {activeTab === "spk" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase">
                      Nomor SPK
                    </th>
                    <th className="w-[180px] px-4 py-3 text-left text-xs font-semibold uppercase">
                      Customer
                    </th>
                    <th className="w-[130px] px-4 py-3 text-left text-xs font-semibold uppercase">
                      Tanggal
                    </th>
                    <th className="w-[260px] px-4 py-3 text-left text-xs font-semibold uppercase">
                      Item Trading
                    </th>
                    <th className="w-[260px] px-4 py-3 text-left text-xs font-semibold uppercase">
                      PO Dibuat
                    </th>
                    <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold uppercase">
                      Status
                    </th>
                    <th className="w-[140px] px-4 py-3 text-left text-xs font-semibold uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {paginatedSpks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-10 text-center text-sm text-gray-500"
                      >
                        Tidak ada data SPK
                      </td>
                    </tr>
                  ) : (
                    paginatedSpks.map((spk) => (
                      <tr key={spk.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">
                          {spk.spkNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 truncate">
                          {spk.lead.nama_toko}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(spk.tglSpk)}
                        </td>

                        {/* ITEM */}
                        <td className="px-4 py-3 text-sm">
                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                            {spk.spkItems.map((item) => (
                              <div
                                key={item.id}
                                className="text-xs bg-gray-100 rounded px-2 py-1"
                              >
                                {item.namaBarang}
                                <span className="text-gray-500">
                                  {" "}
                                  ({item.qty} {item.satuan})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* PO */}
                        <td className="px-4 py-3 text-sm">
                          {spk.purchaseOrders?.length ? (
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                              {spk.purchaseOrders.map((po) => (
                                <div
                                  key={po.id}
                                  className="flex justify-between bg-gray-50 rounded px-2 py-1 text-xs"
                                >
                                  <span className="truncate">{po.nomorPO}</span>
                                  <span
                                    className={`px-2 rounded-full text-[10px] font-semibold ${
                                      po.status === "APPROVED"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {po.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Belum ada PO
                            </span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              spk.purchaseOrders?.length
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {spk.purchaseOrders?.length
                              ? `${spk.purchaseOrders.length} PO`
                              : "Belum ada PO"}
                          </span>
                        </td>

                        {/* AKSI */}
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleCreatePOFromSpk(spk)}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-semibold"
                          >
                            <Plus size={14} />
                            Buat PO
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Purchase Orders Table */}
        {/* ================= PURCHASE ORDER TABLE ================= */}
        {activeTab === "po" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="w-[150px] px-4 py-3 text-xs font-semibold uppercase">
                      Nomor PO
                    </th>
                    <th className="w-[180px] px-4 py-3 text-xs font-semibold uppercase">
                      Vendor
                    </th>
                    <th className="w-[120px] px-4 py-3 text-xs font-semibold uppercase">
                      Tanggal
                    </th>
                    <th className="w-[120px] px-4 py-3 text-xs font-semibold uppercase">
                      Jatuh Tempo
                    </th>
                    <th className="w-[140px] px-4 py-3 text-xs font-semibold uppercase">
                      Total
                    </th>
                    <th className="w-[120px] px-4 py-3 text-xs font-semibold uppercase">
                      Status
                    </th>
                    <th className="w-[140px] px-4 py-3 text-xs font-semibold uppercase">
                      User
                    </th>
                    <th className="w-[140px] px-4 py-3 text-xs font-semibold uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8}>
                        <SkeletonTable rows={6} cols={8} />
                      </td>
                    </tr>
                  ) : purchaseOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        Tidak ada Purchase Order
                      </td>
                    </tr>
                  ) : (
                    paginatedPOs.map((po) => {
                      const total = po.items.reduce(
                        (s, i) => s + i.subTotal,
                        0,
                      );

                      return (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">
                            {po.nomorPO}
                          </td>
                          <td className="px-4 py-3 text-sm truncate">
                            {po.kepada}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(po.tanggal)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(po.jatuhTempo)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">
                            {formatCurrency(total)}
                          </td>
                          <td className="px-4 py-3 text-sm">{po.status}</td>
                          <td className="px-4 py-3 text-sm truncate">
                            {po.user.name}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(po)}
                                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors"
                                title="Edit PO"
                              >
                                <Edit2 size={16} />
                              </button>
                              {po.status !== "APPROVED" && (
                                <button
                                  onClick={() => handleApprovePO(po.id)}
                                  disabled={approvingPOId === po.id}
                                  className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Approve PO"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => handlePrint(po)}
                                className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700 transition-colors"
                                title="Print PO"
                              >
                                <Printer size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(po.id)}
                                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                                title="Hapus PO"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= SHARED PAGINATION ================= */}
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
            {/* Info */}
            <p className="text-sm text-gray-600">
              Menampilkan{" "}
              <span className="font-semibold text-gray-900">
                {totalItems === 0 ? 0 : startIndex + 1}–
                {Math.min(endIndex, totalItems)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-gray-900">{totalItems}</span>{" "}
              data
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Page size */}
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
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
                <h3 className="text-xl font-bold">
                  {editingPO ? "Edit Purchase Order" : "Tambah Purchase Order"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* SPK Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih SPK (TRADING) - Opsional
                  </label>
                  <select
                    value={selectedSpkId}
                    onChange={(e) => handleSpkSelect(e.target.value)}
                    disabled={!!editingPO}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">-- Pilih SPK atau buat manual --</option>
                    {loadingSpk ? (
                      <option>Loading...</option>
                    ) : (
                      spkOptions.map((spk) => (
                        <option key={spk.id} value={spk.id}>
                          {spk.spkNumber} - {spk.lead.nama_toko}
                        </option>
                      ))
                    )}
                  </select>
                  {selectedSpkId && (
                    <p className="mt-1 text-xs text-gray-500">
                      Form akan terisi otomatis dari SPK yang dipilih
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kepada (Vendor/Supplier) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.kepada}
                      onChange={(e) =>
                        setFormData({ ...formData, kepada: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nama vendor/supplier"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor PO *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nomorPO}
                      onChange={(e) =>
                        setFormData({ ...formData, nomorPO: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="PO-001/2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.tanggal}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jatuh Tempo *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.jatuhTempo}
                      onChange={(e) =>
                        setFormData({ ...formData, jatuhTempo: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Daftar Barang *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Tambah Item
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b">
                            Nama Barang
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b">
                            Ukuran
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b">
                            QTY
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b">
                            Satuan
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b">
                            Notice/Merk/Jenis
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b">
                            Sub Total
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-b">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsLoading
                          ? /* ================= ITEM SKELETON ================= */
                            Array.from({ length: 3 }).map((_, i) => (
                              <tr key={i}>
                                {Array.from({ length: 7 }).map((__, j) => (
                                  <td key={j} className="px-3 py-2 border-b">
                                    <div className="h-8 bg-gray-200 rounded animate-pulse" />
                                  </td>
                                ))}
                              </tr>
                            ))
                          : items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 border-b">
                                  <input
                                    type="text"
                                    required
                                    value={item.namaBarang}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "namaBarang",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="Nama barang"
                                  />
                                </td>

                                <td className="px-3 py-2 border-b">
                                  <input
                                    type="text"
                                    value={item.ukuran}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "ukuran",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                    placeholder="Ukuran"
                                  />
                                </td>

                                <td className="px-3 py-2 border-b">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={item.qty || ""}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "qty",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>

                                <td className="px-3 py-2 border-b">
                                  <input
                                    type="text"
                                    required
                                    value={item.satuan}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "satuan",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>

                                <td className="px-3 py-2 border-b">
                                  <input
                                    type="text"
                                    value={item.noticeMerkJenis}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "noticeMerkJenis",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>

                                <td className="px-3 py-2 border-b">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={item.subTotal || ""}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "subTotal",
                                        parseFloat(e.target.value) || 0,
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </td>

                                <td className="px-3 py-2 border-b">
                                  {items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(index)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <X size={16} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                      </tbody>

                      <tfoot className="bg-gray-50">
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 py-2 text-right font-medium"
                          >
                            Total:
                          </td>
                          <td className="px-3 py-2 font-bold text-lg">
                            {formatCurrency(calculateTotal())}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keterangan Tambahan
                  </label>
                  <textarea
                    value={formData.keteranganTambahan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        keteranganTambahan: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Keterangan tambahan..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hormat Kami
                  </label>
                  <input
                    type="text"
                    value={formData.hormatKami}
                    onChange={(e) =>
                      setFormData({ ...formData, hormatKami: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nama perusahaan/penandatangan"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                  >
                    {editingPO ? "Update" : "Simpan"}
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
