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
  AlertCircle,
  Search,
  Filter,
  Calendar,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import PDFTemplate from "@/components/pdf/PDFTemplate";
import { supabase } from "@/lib/supabase";
import { History as HistoryIcon } from "lucide-react";

interface PurchaseOrderItem {
  id?: string;
  itemId?: string;
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
  paymentMethod: string | null;
  paymentTerm: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  isReceived: boolean;
  receivedAt: string | null;
  suratJalanUrl: string | null;
  signatureUrl: string | null;
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
  const [tabCounts, setTabCounts] = useState({
    tradingNeeded: 0,
    poPending: 0,
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPOForPrint, setSelectedPOForPrint] =
    useState<PurchaseOrder | null>(null);

  const fetchTabCounts = async () => {
    try {
      const res = await fetch("/api/notifications/counts");
      const data = await res.json();
      setTabCounts({
        tradingNeeded: data.tradingNeeded || 0,
        poPending: data.poPending || 0,
      });
    } catch (err) {
      console.error(err);
    }
  };

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
    paymentMethod: "CASH",
    paymentTerm: "7",
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

  // Modal Receipt
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiptData, setReceiptData] = useState({
    receivedAt: new Date().toISOString().split("T")[0],
    suratJalanUrl: "",
    customJatuhTempo: "",
  });
  const [suratJalanFile, setSuratJalanFile] = useState<File | null>(null);
  const [suratJalanPreview, setSuratJalanPreview] = useState<string>("");

  // Modal Payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    method: "TRANSFER",
    notes: "",
  });

  const handlePaymentMethodChangeInModal = (method: string) => {
    setNewPayment((prev) => ({
      ...prev,
      method,
      amount: method === "CASH" && selectedPO 
        ? Math.max(0, selectedPO.totalAmount - (selectedPO.paidAmount || 0)) 
        : prev.amount
    }));
  };

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
    fetchTabCounts();
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
      paymentMethod: "CASH",
      paymentTerm: "7",
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
          paymentMethod: formData.paymentMethod,
          paymentTerm: formData.paymentTerm,
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

  /* New Handlers */
  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setReceiptData({
      receivedAt: new Date().toISOString().split("T")[0],
      suratJalanUrl: po.suratJalanUrl || "",
      customJatuhTempo: "",
    });
    setSuratJalanFile(null);
    setSuratJalanPreview(po.suratJalanUrl || "");
    setShowReceiveModal(true);
  };

  const openPaymentModal = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowPaymentModal(true);
    fetchPaymentHistory(po.id);
  };

  const fetchPaymentHistory = async (poId: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/payments`);
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.payments);
      }
    } catch (error) {
      console.error("Fetch payment history error:", error);
    }
  };

  const handleFileUpload = async (file: File, path: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("bukti-pengiriman")
      .upload(filePath, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("bukti-pengiriman")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    let finalSuratJalanUrl = receiptData.suratJalanUrl;

    try {
      if (suratJalanFile) {
        finalSuratJalanUrl = await handleFileUpload(suratJalanFile, "po");
      }

      const payload = {
        ...receiptData,
        suratJalanUrl: finalSuratJalanUrl,
      };

      const res = await fetch(`/api/purchase-orders/${selectedPO.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Kedatangan barang berhasil dikonfirmasi");
        setShowReceiveModal(false);
        fetchPurchaseOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal konfirmasi");
      }
    } catch (error: any) {
      console.error("Receive handle error:", error);
      toast.error(`Terjadi kesalahan: ${error.message || "Unknown error"}`);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;

    try {
      const res = await fetch(`/api/purchase-orders/${selectedPO.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPayment),
      });

      if (res.ok) {
        toast.success("Pembayaran berhasil dicatat");
        setNewPayment({
          amount: 0,
          paymentDate: new Date().toISOString().split("T")[0],
          method: "TRANSFER",
          notes: "",
        });
        fetchPaymentHistory(selectedPO.id);
        fetchPurchaseOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || "Gagal mencatat pembayaran");
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
      paymentMethod: "CASH",
      paymentTerm: "7",
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
        paymentMethod: po.paymentMethod || "CASH",
        paymentTerm: po.paymentTerm || "7",
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

  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

  const openApproveModal = (poId: string) => {
    setSelectedPOId(poId);
    setIsApproveModalOpen(true);
  };

  const handleApprovePO = async () => {
    if (!selectedPOId) return;

    setApprovingPOId(selectedPOId);
    try {
      const res = await fetch(`/api/purchase-orders/${selectedPOId}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Purchase Order berhasil di-approve");
        fetchPurchaseOrders();
        fetchSpksWithTrading();
      } else {
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setApprovingPOId(null);
      setIsApproveModalOpen(false);
      setSelectedPOId(null);
    }
  };

  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteModal = (id: string) => {
    setSelectedDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDeleteId) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/purchase-orders/${selectedDeleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Purchase Order berhasil dihapus");
        fetchPurchaseOrders();
        setIsDeleteModalOpen(false);
        setSelectedDeleteId(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = (po: PurchaseOrder) => {
    setSelectedPOForPrint(po);
    setShowPrintModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />
        {/* Tabs & Search Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* TABS */}
            <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("spk")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "spk"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                SPK Trading
                {tabCounts.tradingNeeded > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px]">
                    {tabCounts.tradingNeeded}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("po")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "po"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Riwayat PO
                {tabCounts.poPending > 0 && (
                  <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px]">
                    {tabCounts.poPending}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => {
                setEditingPO(null);
                resetForm();
                setItems([{ namaBarang: "", ukuran: "", qty: 1, satuan: "", noticeMerkJenis: "", subTotal: 0 }]);
                setShowModal(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-bold text-sm active:scale-95 w-full sm:w-auto"
            >
              <Plus size={18} />
              Buat PO Baru
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            {activeTab === "spk" ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full animate-fade-in">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari nomor SPK / toko..."
                    value={spkSearch}
                    onChange={(e) => setSpkSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={spkStatus}
                    onChange={(e) => setSpkStatus(e.target.value as any)}
                    className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm appearance-none transition-all"
                  >
                    <option value="ALL">Semua Status SPK</option>
                    <option value="PENDING">Belum Ada PO</option>
                    <option value="APPROVED">Sudah Ada PO</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full animate-fade-in">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari nomor PO / vendor / pembuat..."
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={poStatus}
                    onChange={(e) => setPoStatus(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm appearance-none transition-all"
                  >
                    <option value="ALL">Semua Status PO</option>
                    <option value="PENDING">Draft / Pending</option>
                    <option value="APPROVED">Disetujui</option>
                    <option value="COMPLETED">Selesai</option>
                  </select>
                </div>
              </div>
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
                    <th className="w-[150px] px-4 py-3 text-xs font-semibold uppercase text-left">
                      Nomor PO
                    </th>
                    <th className="w-[150px] px-4 py-3 text-xs font-semibold uppercase text-left">
                      No SPK
                    </th>
                    <th className="w-[180px] px-4 py-3 text-xs font-semibold uppercase text-left">
                      Vendor
                    </th>
                    <th className="w-[120px] px-4 py-3 text-xs font-semibold uppercase text-left">
                      Tanggal
                    </th>
                    <th className="w-[120px] px-4 py-3 text-xs font-semibold uppercase text-left">
                      Jatuh Tempo
                    </th>
                    <th className="w-[140px] px-4 py-3 text-xs font-semibold uppercase text-left">
                      Total
                    </th>
                    <th className="w-[120px] px-4 py-3 text-xs font-semibold uppercase text-left">
                      Status / Bayar
                    </th>
                    <th className="w-[130px] px-4 py-3 text-xs font-semibold uppercase text-left">
                      Kedatangan
                    </th>
                    <th className="w-[160px] px-4 py-3 text-xs font-semibold uppercase text-left">
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
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">
                            {po.spk?.spkNumber || "-"}
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
                            {formatCurrency(po.totalAmount || total)}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] w-fit ${
                                po.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                              }`}>
                                {po.status}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] w-fit ${
                                po.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-700" : 
                                po.paymentStatus === "PARTIAL" ? "bg-orange-100 text-orange-700" : "bg-rose-100 text-rose-700"
                              }`}>
                                {po.paymentStatus === "PAID" ? "LUNAS" : 
                                 po.paymentStatus === "PARTIAL" ? `CICIL (${formatCurrency(po.paidAmount)})` : "BELUM BAYAR"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {po.isReceived ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase w-fit">DITERIMA</span>
                                <span className="text-[8px] text-gray-500 italic">{formatDate(po.receivedAt || "")}</span>
                              </div>
                            ) : (
                              <span className="bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase w-fit">DIJALAN</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleEdit(po)}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                title="Edit PO"
                              >
                                <Edit2 size={14} />
                              </button>
                              
                              {po.status !== "APPROVED" && (
                                <button
                                  onClick={() => openApproveModal(po.id)}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                                  title="Approve PO"
                                >
                                  <CheckCircle size={14} />
                                </button>
                              )}

                              {po.status === "APPROVED" && !po.isReceived && (
                                <button
                                  onClick={() => openReceiveModal(po)}
                                  className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors"
                                  title="Konfirmasi Kedatangan"
                                >
                                  <FileText size={14} />
                                </button>
                              )}

                              <button
                                onClick={() => openPaymentModal(po)}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                                title="Riwayat Pembayaran"
                              >
                                <CheckCircle size={14} />
                              </button>

                              <button
                                onClick={() => handlePrint(po)}
                                className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors"
                                title="Print PO"
                              >
                                <Printer size={14} />
                              </button>
                              
                              <button
                                onClick={() => openDeleteModal(po.id)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                                title="Hapus PO"
                              >
                                <Trash2 size={14} />
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metode Pembayaran
                    </label>
                    <select
                      value={formData.paymentMethod || "CASH"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentMethod: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="CASH">CASH (Lunas)</option>
                      <option value="INSTALLMENT">Cicilan / Tempo</option>
                    </select>
                  </div>

                  {formData.paymentMethod === "INSTALLMENT" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Termin (Hari)
                      </label>
                      <select
                        value={formData.paymentTerm || "7"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentTerm: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="7">7 Hari</option>
                        <option value="14">14 Hari</option>
                        <option value="21">21 Hari</option>
                        <option value="30">30 Hari</option>
                        <option value="45">45 Hari</option>
                        <option value="60">60 Hari</option>
                        <option value="90">90 Hari</option>
                        <option value="BULANAN">Bulanan</option>
                        <option value="CUSTOM">Custom / Sesuai Jatuh Tempo</option>
                      </select>
                    </div>
                  )}
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

      {isApproveModalOpen && (
        <div className="fixed top-6 right-6 z-50">
          <div className="w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="bg-green-100 text-green-600 p-2 rounded-full text-sm">
                ✔
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Approve Purchase Order
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Setelah di-approve, data tidak dapat diubah kembali.
                </p>
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsApproveModalOpen(false)}
                disabled={approvingPOId !== null}
                className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Batal
              </button>

              <button
                onClick={handleApprovePO}
                disabled={approvingPOId !== null}
                className="px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
              >
                {approvingPOId ? "Processing..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kedatangan */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-lg font-bold">Konfirmasi Kedatangan Barang</h3>
              <button onClick={() => setShowReceiveModal(false)} className="hover:bg-amber-700/50 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Sampai *</label>
                <input
                  type="date"
                  required
                  value={receiptData.receivedAt}
                  onChange={(e) => setReceiptData({ ...receiptData, receivedAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Bukti Foto Surat Jalan / Barang *</label>
                <input
                  type="file"
                  accept="image/*"
                  required={!suratJalanPreview}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSuratJalanFile(file);
                      setSuratJalanPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                {suratJalanPreview && (
                  <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden relative group">
                    <img src={suratJalanPreview} alt="Preview Surat Jalan" className="w-full h-auto max-h-[250px] object-contain bg-gray-50" />
                    <button 
                      type="button" 
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setSuratJalanFile(null);
                        setSuratJalanPreview("");
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {selectedPO.paymentMethod === 'INSTALLMENT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Jatuh Tempo (Opsional)</label>
                  <input
                    type="date"
                    value={receiptData.customJatuhTempo}
                    onChange={(e) => setReceiptData({ ...receiptData, customJatuhTempo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 italic">* Jika kosong, jatuh tempo dihitung berdasarkan termin ({selectedPO.paymentTerm} hari) dari tgl sampai.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowReceiveModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                <button type="submit" className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 shadow-md">Konfirmasi Selesai</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Riwayat Pembayaran */}
      {showPaymentModal && selectedPO && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold">Riwayat Pembayaran PO #{selectedPO.nomorPO}</h3>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                  <p className="text-xs opacity-90 bg-white/20 px-2 py-0.5 rounded">Tagihan: {formatCurrency(selectedPO.totalAmount)}</p>
                  <p className="text-xs opacity-90 bg-emerald-500/20 px-2 py-0.5 rounded">Terbayar: {formatCurrency(selectedPO.paidAmount)}</p>
                  <p className="text-xs font-bold bg-rose-500 px-2 py-0.5 rounded shadow-sm">Sisa: {formatCurrency(selectedPO.totalAmount - selectedPO.paidAmount)}</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="hover:bg-indigo-700/50 p-1 rounded transition-colors text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Installment Plan Visualization */}
              {selectedPO.paymentMethod === 'INSTALLMENT' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                      <AlertCircle size={16} /> Rencana Pelunasan (Installment)
                    </h4>
                    <span className="text-[10px] font-black bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {selectedPO.paymentTerm} Hari {selectedPO.paymentTerm === 'BULANAN' ? ' (Tempo Bulanan)' : ''}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white/60 p-2 rounded-lg border border-amber-100/50">
                      <p className="text-[9px] text-amber-600 font-bold uppercase tracking-tighter">Status PO</p>
                      <p className="text-xs font-bold text-amber-900 truncate">{selectedPO.status}</p>
                    </div>
                    <div className="bg-white/60 p-2 rounded-lg border border-amber-100/50">
                      <p className="text-[9px] text-amber-600 font-bold uppercase tracking-tighter">Kedatangan</p>
                      <p className="text-xs font-bold text-amber-900">
                        {selectedPO.isReceived && selectedPO.receivedAt ? formatDate(selectedPO.receivedAt) : "Belum Sampai"}
                      </p>
                    </div>
                    <div className="bg-white/60 p-2 rounded-lg border border-amber-100/50">
                      <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-tighter">Jatuh Tempo</p>
                      <p className={`text-xs font-black ${new Date(selectedPO.jatuhTempo) < new Date() ? 'text-rose-600 animate-pulse' : 'text-indigo-700'}`}>
                        {formatDate(selectedPO.jatuhTempo)}
                      </p>
                    </div>
                    <div className="bg-white/60 p-2 rounded-lg border border-amber-100/50">
                      <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-tighter">Sisa Hari</p>
                      <p className="text-xs font-bold text-emerald-700">
                        {Math.ceil((new Date(selectedPO.jatuhTempo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Hari
                      </p>
                    </div>
                  </div>

                  {selectedPO.paymentTerm === 'BULANAN' && (
                    <div className="mt-3 p-2 bg-indigo-600/5 rounded-lg border border-indigo-100 border-dashed text-center">
                      <p className="text-[10px] text-indigo-700 font-medium">
                        Estimasi cicilan bulanan: <span className="font-bold">{formatCurrency((selectedPO.totalAmount - (selectedPO.paidAmount || 0)) / 2)}</span> selama 2 periode mendatang.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Form Pembayaran Baru */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <h4 className="text-sm font-bold text-indigo-900 mb-3">Input Cicilan / Pelunasan Baru</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-indigo-700 mb-1">Jumlah Bayar</label>
                    <input
                      type="number"
                      value={newPayment.amount || ""}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-700 mb-1">Tanggal Bayar</label>
                    <input
                      type="date"
                      value={newPayment.paymentDate}
                      onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-700 mb-1">Metode</label>
                    <select
                      value={newPayment.method}
                      onChange={(e) => handlePaymentMethodChangeInModal(e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="TRANSFER">TRANSFER</option>
                      <option value="CASH">CASH (Lunas / Tunai)</option>
                      <option value="CHEQUE">CHEQUE / GIRO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-700 mb-1">Catatan</label>
                    <input
                      type="text"
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Min misal: DP, Pelunasan, dsb"
                    />
                  </div>
                </div>
                <button
                  onClick={handlePaymentSubmit}
                  className="mt-4 w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
                >
                  Simpan Pembayaran
                </button>
              </div>

              {/* Tabel Riwayat */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <HistoryIcon size={16} /> Riwayat Terakhir
                </h4>
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 font-bold text-[10px] text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2 text-left">Tgl Bayar</th>
                        <th className="px-4 py-2 text-left">Metode</th>
                        <th className="px-4 py-2 text-left">Jumlah</th>
                        <th className="px-4 py-2 text-left">Catatan</th>
                        <th className="px-4 py-2 text-left">Oleh</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-xs text-gray-600">
                      {paymentHistory.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-gray-400 italic">Belum ada catatan pembayaran.</td>
                        </tr>
                      ) : (
                        paymentHistory.map((p) => (
                          <tr key={p.id}>
                            <td className="px-4 py-2 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
                            <td className="px-4 py-2 font-semibold">{p.method}</td>
                            <td className="px-4 py-2 font-bold text-gray-900">{formatCurrency(p.amount)}</td>
                            <td className="px-4 py-2 italic text-gray-500">{p.notes || "-"}</td>
                            <td className="px-4 py-2">{p.user?.name || "System"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold text-xs border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-right">Total Terbayar:</td>
                        <td className="px-4 py-2 text-emerald-600">{formatCurrency(selectedPO.paidAmount || 0)}</td>
                        <td colSpan={2}></td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-right">Sisa Tagihan:</td>
                        <td className="px-4 py-2 text-rose-600">{formatCurrency(Math.max(0, selectedPO.totalAmount - (selectedPO.paidAmount || 0)))}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed top-6 right-6 z-50">
          <div className="w-80 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="bg-red-100 text-red-600 p-2 rounded-full text-sm">
                ⚠️
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Hapus Purchase Order
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 transition"
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Cetak */}
      <AnimatePresence>
        {showPrintModal && selectedPOForPrint && (
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
                      Pratinjau Purchase Order
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
                  <POPrintDoc po={selectedPOForPrint} />
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

              {/* CSS Khusus Print */}
              <style jsx global>{`
                @media print {
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
                  @page {
                    size: A4;
                    margin: 15mm;
                  }
                  #printable-area {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: block !important;
                    box-shadow: none !important;
                  }
                }
              `}</style>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

// Sub-component for PO Print Content
function POPrintDoc({ po }: { po: PurchaseOrder }) {
  const total = po.items.reduce((sum, item) => sum + item.subTotal, 0);

  return (
    <PDFTemplate
      title="PURCHASE ORDER"
      companyAddress="Komplek Pergudangan Meiko Abadi 7 Blok E18 dan 19."
      companyPhone="Telp: 812-8931-9889"
      logoSrc="/assets/template.png"
      documentInfo={{
        documentNumber: po.nomorPO,
        date: formatDate(po.tanggal),
        status: po.status === "APPROVED" ? "Approved" : "Pending",
      }}
      showSignature
      signatureLeft={{
        label: "Penerima,",
        name: po.kepada,
      }}
      signatureRight={{
        label: "Hormat Kami,",
        name: po.hormatKami || "PT Maju Jaya Mitra Plastindo",
      }}
      footer={
        <>
          <p>Dibuat oleh: {po.user.name}</p>
          <p>Tanggal dibuat: {formatDate(po.tanggal)}</p>
        </>
      }
    >
      {/* Informasi PO */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-gray-700">Kepada</p>
          <p>{po.kepada}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Jatuh Tempo</p>
          <p>{formatDate(po.jatuhTempo)}</p>
        </div>
      </div>

      {/* Tabel Item */}
      <div className="mb-6">
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-50 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="border px-3 py-2 text-center w-12 font-bold">
                No
              </th>
              <th className="border px-3 py-2 text-left font-bold">
                Nama Barang
              </th>
              <th className="border px-3 py-2 text-left font-bold">Ukuran</th>
              <th className="border px-3 py-2 text-center font-bold">Qty</th>
              <th className="border px-3 py-2 text-left font-bold">Satuan</th>
              <th className="border px-3 py-2 text-left font-bold">
                Notice / Merk
              </th>
              <th className="border px-3 py-2 text-right font-bold">
                Sub Total
              </th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item, i) => (
              <tr
                key={item.id || i}
                className="odd:bg-white even:bg-gray-50/50"
              >
                <td className="border px-3 py-2 text-center text-gray-500 font-medium">
                  {i + 1}
                </td>
                <td className="border px-3 py-2 font-semibold text-gray-900">
                  {item.namaBarang}
                </td>
                <td className="border px-3 py-2 text-gray-600">
                  {item.ukuran || "-"}
                </td>
                <td className="border px-3 py-2 text-center font-black text-gray-900">
                  {item.qty.toLocaleString("id-ID")}
                </td>
                <td className="border px-3 py-2 text-gray-600 font-medium">
                  {item.satuan}
                </td>
                <td className="border px-3 py-2 text-gray-600 italic">
                  {item.noticeMerkJenis || "-"}
                </td>
                <td className="border px-3 py-2 text-right font-bold text-blue-600">
                  {formatCurrency(item.subTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-black">
              <td
                colSpan={6}
                className="border px-3 py-3 text-right text-gray-700"
              >
                TOTAL KESELURUHAN
              </td>
              <td className="border px-3 py-3 text-right text-base text-blue-900">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Keterangan Tambahan */}
      {po.keteranganTambahan && (
        <div className="mt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
            Keterangan Tambahan
          </p>
          <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed font-medium">
            {po.keteranganTambahan}
          </div>
        </div>
      )}
    </PDFTemplate>
  );
}
