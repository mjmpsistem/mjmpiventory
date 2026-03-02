"use client";

import { 
  Truck, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  Package, 
  FileText, 
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Plus,
  MapPin,
  Camera,
  MessageSquare,
  AlertCircle,
  X,
  ChevronDown,
  Loader2,
  Trash2,
  Undo2,
  ArrowLeftRight,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useEffect, useState, useRef } from "react";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import { formatDate } from "@/lib/utils";

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState("ready");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [shippingData, setShippingData] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Pagination & Filter
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  // Modal States
  const [selectedSpk, setSelectedSpk] = useState<any | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Form States
  const [driverId, setDriverId] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [estimasi, setEstimasi] = useState("");
  const [catatan, setCatatan] = useState("");
  const [finishData, setFinishData] = useState({
    penerimaNama: "",
    catatanSelesai: "",
    fotoBuktiUrl: "",
  });

  const [selectedShippingItem, setSelectedShippingItem] = useState<any | null>(null);
  const [returnData, setReturnData] = useState({
    qty: 0,
    reason: "REPACK",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar (max 5MB)");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal mengunggah foto");

      const data = await res.json();
      setFinishData({ ...finishData, fotoBuktiUrl: data.url });
      toast.success("Foto berhasil diunggah");
    } catch (error) {
      toast.error("Gagal mengunggah foto");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shipping");
      const data = await res.json();
      if (Array.isArray(data)) {
        setShippingData(data);
      }
    } catch (error) {
      toast.error("Gagal mengambil data pengiriman");
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/users?role=DRIVER");
      if (!res.ok) throw new Error("Gagal mengambil data driver");
      const data = await res.json();
      if (Array.isArray(data.users)) {
        setDrivers(data.users);
      }
    } catch (error) {
      console.error("Error fetchDrivers:", error);
      setDrivers([]);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDrivers();
  }, []);

  const handleStartShipping = async () => {
    if (!driverId) {
      toast.error("Pilih driver terlebih dahulu");
      return;
    }

    try {
      const itemsToShip = selectedSpk.spkItems
        .map((item: any) => {
          // Alur Dua-Tahap: 
          // 1. Cek berapa sisa otonom/izin (Izin - Shipped - Transit)
          const availableAuth = (item.approvedQty || 0) - (item.shippedQty || 0) - (item.onTruckQty || 0);
          // 2. Kirim sebanyak Izin jika Stok Fisik mencukupi
          const qty = Math.max(0, Math.min(availableAuth, item.readyQty));
          
          return {
            spkItemId: item.id,
            qty: qty,
          };
        })
        .filter((item: any) => item.qty > 0.01);

      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spkIds: [selectedSpk.id],
          driverId,
          estimasi,
          catatan,
          items: itemsToShip,
        }),
      });

      if (res.ok) {
        toast.success("Pengiriman berhasil diproses");
        setIsConfirmModalOpen(false);
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal memproses pengiriman");
      }
    } catch (error) {
      toast.error("Gagal memproses pengiriman");
    }
  };

  const handleFinishShipping = async () => {
    try {
      const res = await fetch("/api/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingId: selectedSpk.shippingId,
          ...finishData,
        }),
      });

      if (res.ok) {
        toast.success("Pengiriman selesai konfirmasi");
        setIsFinishModalOpen(false);
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal menyelesaikan pengiriman");
      }
    } catch (error) {
      toast.error("Gagal menyelesaikan pengiriman");
    }
  };

  const handleReturnShipping = async () => {
    if (returnData.qty <= 0) {
      toast.error("Jumlah retur harus lebih dari 0");
      return;
    }
    if (returnData.qty > selectedShippingItem.onTruckQty) {
      toast.error("Jumlah retur tidak boleh melebihi jumlah di truk");
      return;
    }

    try {
      // Find the shipping_item ID from the selected SPK
      const sItem = selectedSpk.shipping.shipping_item.find(
        (si: any) => si.spkItemId === selectedShippingItem.id
      );

      if (!sItem) {
        toast.error("Data pengiriman tidak ditemukan");
        return;
      }

      const res = await fetch("/api/shipping/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingItemId: sItem.id,
          qty: returnData.qty,
          reason: returnData.reason,
          notes: returnData.notes,
        }),
      });

      if (res.ok) {
        toast.success("Barang berhasil diretur");
        setIsReturnModalOpen(false);
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Gagal memproses retur");
      }
    } catch (error) {
      toast.error("Gagal memproses retur");
    }
  };

  const hasAuthorizedStock = (item: any) => {
    return item.spkItems.some((si: any) => {
      const availableAuth = (si.approvedQty || 0) - (si.shippedQty || 0) - (si.onTruckQty || 0);
      return availableAuth > 0.001;
    });
  };

  const filteredData = shippingData.filter((item) => {
    const matchesSearch = 
      item.spkNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.lead?.nama_toko?.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === "ready") {
      // SPK muncul di tab Siap Kirim jika:
      // 1. Belum Selesai (bukan DONE)
      // 2. Ada stok yang sudah diizinkan tapi belum berangkat (availableAuth > 0)
      return matchesSearch && item.status !== "DONE" && hasAuthorizedStock(item);
    }
    if (activeTab === "tracking") {
      return matchesSearch && item.status === "SHIPPING";
    }
    if (activeTab === "history") {
      // Masuk history jika DONE, atau PARTIAL tapi sedang tidak ada jatah izin (sudah dikirim semua untuk batch ini)
      return matchesSearch && (item.status === "DONE" || (item.status === "PARTIAL" && !hasAuthorizedStock(item)));
    }
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredData.length / limit);
  const visibleData = filteredData.slice((page - 1) * limit, page * limit);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const readyCount = shippingData.filter(item => item.status !== "DONE" && hasAuthorizedStock(item)).length;
  const trackingCount = shippingData.filter(item => item.status === "SHIPPING").length;

  const CardSkeleton = () => (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-sm animate-pulse p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>
      <div className="h-3 w-48 bg-gray-100 dark:bg-gray-800 rounded" />
      <div className="pt-2 flex gap-3">
        <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />

        {/* HEADER & CONTROLS */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm px-5 py-4 space-y-4">
          <div className="flex border-b border-gray-200 dark:border-gray-800 -mx-5 px-5 overflow-x-auto no-scrollbar whitespace-nowrap">
            {[
              { id: "ready", label: "Siap Kirim", count: readyCount },
              { id: "tracking", label: "Perjalanan", count: trackingCount },
              { id: "history", label: "Riwayat" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`pb-3 px-4 text-sm font-bold transition-all relative shrink-0 ${
                  activeTab === tab.id
                    ? "text-blue-600"
                    : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </div>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabNote"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" 
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari No SPK / Customer..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full pl-9 pr-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                />
              </div>

              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>

              <button 
                onClick={fetchData}
                className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all bg-white dark:bg-slate-900 shadow-sm"
              >
                <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : "text-gray-400"} />
              </button>
            </div>

            <div className="text-xs text-gray-500 font-medium">
              <span className="text-gray-700 dark:text-gray-300 font-bold">{visibleData.length}</span> dari <span className="text-gray-700 dark:text-gray-300 font-bold">{filteredData.length}</span> SPK
            </div>
          </div>
        </div>

        {/* LIST DATA */}
        <div className="space-y-3">
          {loading ? (
             Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          ) : visibleData.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Truck className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400 font-medium italic">Tidak ada data ditemukan</p>
            </div>
          ) : (
            visibleData.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-gray-100">{item.spkNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === "DONE" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" :
                        item.status === "SHIPPING" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" :
                        item.status === "READY_TO_SHIP" ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800" :
                        item.status === "PARTIAL" 
                          ? (activeTab === "history" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200")
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                      }`}>
                        {item.status === "DONE" ? "ALL SHIPPED" : 
                         (item.status === "PARTIAL" && activeTab === "history") ? "SHIPPED PARTIAL" : 
                         item.status.replace(/_/g, " ")}
                      </span>
                      {activeTab === "tracking" && item.shipping && (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                          <User size={12} /> {item.shipping?.driver?.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                       <span className="font-semibold text-gray-700 dark:text-gray-300">{item.lead?.nama_toko}</span>
                       <span>•</span>
                       <span>{formatDate(item.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                    >
                      {expandedId === item.id ? "Tutup Detail" : "Lihat Detail"}
                      <ChevronDown size={14} className={`transition-transform duration-200 ${expandedId === item.id ? "rotate-180" : ""}`} />
                    </button>

                    {activeTab === "ready" && (
                      <button 
                        onClick={() => { setSelectedSpk(item); setIsConfirmModalOpen(true); }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Truck size={14} /> Kirim Sekarang
                      </button>
                    )}

                    {activeTab === "tracking" && (
                      <div className="flex items-center gap-2">
                         {hasAuthorizedStock(item) && (
                            <button 
                              onClick={() => { setSelectedSpk(item); setIsConfirmModalOpen(true); }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                            >
                              <Plus size={14} /> Kirim Lagi
                            </button>
                         )}
                        <button 
                          onClick={() => { 
                            setSelectedSpk(item); 
                            setFinishData({ penerimaNama: "", catatanSelesai: "", fotoBuktiUrl: "" });
                            setIsFinishModalOpen(true); 
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-green-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <CheckCircle2 size={14} /> Selesaikan
                        </button>
                      </div>
                    )}
                    {activeTab === "history" && item.shipping?.fotoBuktiUrl && (
                      <a 
                        href={item.shipping.fotoBuktiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-lg border border-indigo-200 transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <Camera size={14} /> Lihat Bukti
                      </a>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-5 pb-5 overflow-hidden"
                    >
                      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={10} /> Titik Pengiriman
                            </h4>
                            <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                              <p className="text-sm font-semibold">{item.lead?.nama_pic}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.lead?.alamat_toko}</p>
                            </div>
                          </div>

                          {activeTab !== "ready" && item.shipping && (
                             <div className="space-y-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                  <Clock size={10} /> Info Tracking
                                </h4>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-[9px] text-gray-400">Driver</p>
                                    <p className="text-xs font-bold">{item.shipping.driver?.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] text-gray-400">Berangkat</p>
                                    <p className="text-xs font-bold">{formatDate(item.shipping.tglKirim)}</p>
                                  </div>
                                </div>
                             </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Package size={10} /> Daftar Barang
                          </h4>
                          <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto shadow-sm">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-gray-800">
                                <tr>
                                  <th className="px-4 py-2 font-bold text-gray-600">Nama Barang</th>
                                  <th className="px-4 py-2 text-right font-bold text-gray-600">Pesan</th>
                                  <th className="px-4 py-2 text-right font-bold text-blue-600 bg-blue-50/30">Izin</th>
                                  <th className="px-4 py-2 text-right font-bold text-orange-600">Transit</th>
                                  <th className="px-4 py-2 text-right font-bold text-indigo-600 bg-indigo-50/30">Gudang</th>
                                  <th className="px-4 py-2 text-right font-bold text-emerald-600">Shipped</th>
                                  {activeTab === "tracking" && (
                                    <th className="px-4 py-2 text-center font-bold text-red-600">Aksi</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {item.spkItems
                                  ?.filter((si: any) => activeTab !== "history" || (si.shippedQty || 0) > 0)
                                  .map((spkItem: any) => (
                                    <tr key={spkItem.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                      <td className="px-4 py-2.5 font-medium">{spkItem.namaBarang}</td>
                                      <td className="px-4 py-2.5 text-right font-medium text-gray-500">{spkItem.qty}</td>
                                      <td className="px-4 py-2.5 text-right font-bold text-blue-600 bg-blue-50/10">{(spkItem.approvedQty || 0).toLocaleString()}</td>
                                      <td className="px-4 py-2.5 text-right font-bold text-orange-600">{(spkItem.onTruckQty || 0).toLocaleString()}</td>
                                      <td className="px-4 py-2.5 text-right font-bold text-indigo-600 bg-indigo-50/5 text-xs">{(spkItem.readyQty || 0).toLocaleString()}</td>
                                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{(spkItem.shippedQty || 0).toLocaleString()}</td>
                                      {activeTab === "tracking" && (
                                        <td className="px-4 py-2.5 text-center">
                                          {(spkItem.onTruckQty || 0) > 0 && (
                                            <button
                                              onClick={() => {
                                                setSelectedSpk(item);
                                                setSelectedShippingItem(spkItem);
                                                setReturnData({ qty: spkItem.onTruckQty, reason: "REPACK", notes: "" });
                                                setIsReturnModalOpen(true);
                                              }}
                                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                              title="Retur Barang"
                                            >
                                              <Undo2 size={14} />
                                            </button>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4">
             <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm disabled:opacity-40 transition-all hover:bg-gray-50"
            >
              ← Sebelumnya
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 text-sm font-bold rounded-lg transition-all ${
                      page === p
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm disabled:opacity-40 transition-all hover:bg-gray-50"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>

      {/* CONFIRM SHIPPING MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-blue-900 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Truck className="h-6 w-6 text-blue-600" />
                Siapkan Keberangkatan
              </h2>
              <p className="text-sm text-gray-500 mt-1">Konfirmasi driver dan estimasi waktu sampai untuk SPK <span className="font-bold text-blue-600">{selectedSpk?.spkNumber}</span></p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* ITEM SUMMARY */}
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/20 space-y-2">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                  <Package size={12} /> Daftar Barang (Muat ke Armada)
                </p>
                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                  {selectedSpk?.spkItems?.map((item: any) => {
                    const availableAuth = (item.approvedQty || 0) - (item.shippedQty || 0) - (item.onTruckQty || 0);
                    const qty = Math.max(0, Math.min(availableAuth, item.readyQty || 0));
                    if (qty <= 0.001) return null;
                    return (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b border-blue-100/50 dark:border-blue-900/30 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{item.namaBarang}</span>
                        <span className="font-black text-blue-700 dark:text-blue-400 whitespace-nowrap">{qty} {item.satuan}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilih Driver</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select 
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                  >
                    <option value="">-- Pilih Driver Armada --</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>{driver.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimasi Waktu Sampai</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="datetime-local" 
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={estimasi}
                    onChange={(e) => setEstimasi(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan Pengiriman (Opsional)</label>
                <textarea 
                  placeholder="Misal: Barang diturunkan di gudang timur..." 
                  className="w-full min-h-[100px] p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 h-11 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleStartShipping}
                className="flex-[2] h-11 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Kirim Armada
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* FINISH SHIPPING MODAL */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-green-100 dark:border-green-900 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Konfirmasi Kedatangan
              </h2>
              <p className="text-sm text-gray-500 mt-1">Selesaikan pengiriman untuk SPK <span className="font-bold text-green-600">{selectedSpk?.spkNumber}</span></p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Penerima</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    placeholder="Nama orang yang menerima barang..." 
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    value={finishData.penerimaNama}
                    onChange={(e) => setFinishData({...finishData, penerimaNama: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan Selesai</label>
                <textarea 
                  placeholder="Kondisi barang saat diterima, dll..." 
                  className="w-full min-h-[100px] p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-green-500 transition-all resize-none"
                  value={finishData.catatanSelesai}
                  onChange={(e) => setFinishData({...finishData, catatanSelesai: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Foto Bukti Kedatangan</label>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  accept="image/*"
                  onChange={handleFileChange}
                />
                
                {finishData.fotoBuktiUrl ? (
                  <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 aspect-video flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={finishData.fotoBuktiUrl} 
                      alt="Bukti Pengiriman" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const errorMsg = document.createElement('div');
                          errorMsg.className = 'text-red-500 text-xs text-center p-4';
                          errorMsg.innerText = 'Gagal memuat gambar. Pastikan bucket Supabase di-set "Public".';
                          parent.appendChild(errorMsg);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-all"
                        title="Ganti Foto"
                      >
                        <Camera size={20} />
                      </button>
                      <button 
                        onClick={() => setFinishData({...finishData, fotoBuktiUrl: ""})}
                        className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all"
                        title="Hapus Foto"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full h-24 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="text-xs font-medium">Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={24} />
                        <span className="text-xs font-medium">Klik untuk upload foto bukti</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button 
                onClick={() => setIsFinishModalOpen(false)}
                className="flex-1 h-11 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleFinishShipping}
                className="flex-[2] h-11 rounded-xl bg-green-600 text-white font-bold shadow-lg shadow-green-500/20 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Selesaikan Pengiriman
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* RETURN MODAL */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900 shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-red-900 dark:text-red-100 flex items-center gap-2">
                <Undo2 className="h-6 w-6 text-red-600" />
                Retur Barang (Batal Kirim)
              </h2>
              <p className="text-sm text-gray-500 mt-1">Kembalikan sebagian/semua barang dari armada untuk <span className="font-bold text-red-600">{selectedShippingItem?.namaBarang}</span></p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/20 mb-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-red-600 font-bold">Jumlah di Truck:</span>
                  <span className="text-red-700 font-black">{selectedShippingItem?.onTruckQty} {selectedShippingItem?.satuan}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jumlah yang Diretur</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="number"
                    max={selectedShippingItem?.onTruckQty}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold"
                    value={isNaN(returnData.qty) ? "" : returnData.qty}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                      setReturnData({...returnData, qty: val});
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tujuan / Alasan Retur</label>
                <div className="relative">
                  <ArrowLeftRight className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select 
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all appearance-none font-semibold"
                    value={returnData.reason}
                    onChange={(e) => setReturnData({...returnData, reason: e.target.value})}
                  >
                    <option value="REPACK">Gudang (Repacking / Kirim Ulang)</option>
                    <option value="RECYCLE">Daur Ulang (Rusak / Limbah)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan Tambahan</label>
                <textarea 
                  placeholder="Alasan detail barang dikembalikan..." 
                  className="w-full min-h-[80px] p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                  value={returnData.notes}
                  onChange={(e) => setReturnData({...returnData, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button 
                onClick={() => setIsReturnModalOpen(false)}
                className="flex-1 h-11 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleReturnShipping}
                className="flex-[2] h-11 rounded-xl bg-red-600 text-white font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Konfirmasi Retur
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
