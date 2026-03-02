"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-toastify";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import {
  Recycle,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import {
  getWasteStocks,
  processRecycling,
  getMaterialsForRecycleDropdown,
} from "@/app/actions/waste";

// Type definitions
type WasteItem = {
  id: string;
  material: {
    id: string;
    name: string;
    unit: { name: string } | null;
    category: string;
    itemType?: { name: string } | null;
  };
  quantity: number;
  spk: {
    spkNumber: string;
    spkItems: { namaBarang: string }[];
  };
  notes?: string;
  createdAt: Date;
};

type GroupedWaste = {
  spkNumber: string;
  spkId: string;
  items: WasteItem[];
  totalWaste: number;
};

export default function WastePage() {
  const [wasteGroups, setWasteGroups] = useState<GroupedWaste[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSpk, setFilterSpk] = useState("");
  const [filterStatus, setFilterStatus] = useState("PENDING"); // PENDING, COMPLETED, ALL

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWaste, setSelectedWaste] = useState<WasteItem | null>(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    const res = await getWasteStocks({
      spkNumber: filterSpk,
      status: filterStatus === "ALL" ? undefined : filterStatus,
    });

    if (res.success && res.data) {
      // Group by SPK
      const grouped = res.data.reduce((acc: any, item: any) => {
        const spkNum = item.spk.spkNumber;
        if (!acc[spkNum]) {
          acc[spkNum] = {
            spkNumber: spkNum,
            spkId: item.spk.id,
            items: [],
            totalWaste: 0,
          };
        }
        acc[spkNum].items.push(item);
        acc[spkNum].totalWaste += item.quantity;
        return acc;
      }, {});

      setWasteGroups(Object.values(grouped));
    } else {
      // Cast error safely
      const errorMsg = (res as any).error || "Gagal memuat data waste.";
      toast.error(errorMsg);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  // Client-side Pagination Logic
  const totalPages = Math.ceil(wasteGroups.length / limit);
  // Reset page if out of bounds (e.g. filter change)
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [wasteGroups.length, limit, totalPages]);

  const visibleGroups = wasteGroups.slice((page - 1) * limit, page * limit);

  return (
    <Layout>
      <div className="space-y-8 bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans p-2 md:p-4 rounded-xl">
        <Breadcrumb />
        {/* HEADER */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Cari No SPK..."
                value={filterSpk}
                onChange={(e) => setFilterSpk(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
                className="pl-9 pr-4 py-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none shadow-sm text-sm"
              >
                <option value="PENDING">Pending Recycle</option>
                <option value="COMPLETED">Selesai (0 Kg)</option>
                <option value="ALL">Semua Status</option>
              </select>

              <button
                onClick={() => fetchData()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Loader2 className={loading ? "animate-spin h-4 w-4" : "hidden"} />
                {loading ? "Memuat..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Tampilkan:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 px-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="text-xs text-gray-500 font-medium">
              Menampilkan <span className="text-gray-900 dark:text-gray-100 font-bold">{visibleGroups.length}</span> dari <span className="text-gray-900 dark:text-gray-100 font-bold">{wasteGroups.length}</span> SPK
            </div>
          </div>
        </div>

        {/* WASTE LIST */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
            </div>
          ) : wasteGroups.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-gray-500">Tidak ada data waste ditemukan.</p>
            </div>
          ) : (
            visibleGroups.map((group) => (
              <WasteGroupCard
                key={group.spkId}
                group={group}
                onRecycle={(item) => {
                  setSelectedWaste(item);
                  setIsModalOpen(true);
                }}
              />
            ))
          )}
        </div>

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 text-sm rounded-md border disabled:opacity-40 bg-white hover:bg-gray-50 transition"
            >
              ← Sebelumnya
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                // Limit displayed pages if too many
                if (
                  totalPages > 7 &&
                  (p < page - 2 || p > page + 2) &&
                  p !== 1 &&
                  p !== totalPages
                ) {
                  if (p === page - 3 || p === page + 3)
                    return (
                      <span key={p} className="px-2 text-gray-400">
                        ...
                      </span>
                    );
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      page === p
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white hover:bg-gray-100"
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
              className="px-3 py-1 text-sm rounded-md border disabled:opacity-40 bg-white hover:bg-gray-50 transition"
            >
              Berikutnya →
            </button>
          </div>
        )}

        {/* RECYCLE MODAL */}
        <AnimatePresence>
          {isModalOpen && selectedWaste && (
            <RecycleModal
              waste={selectedWaste}
              onClose={() => {
                setIsModalOpen(false);
                setSelectedWaste(null);
              }}
              onSuccess={() => {
                fetchData();
                setIsModalOpen(false);
                setSelectedWaste(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

// Sub-Component: Waste Group Card
function WasteGroupCard({
  group,
  onRecycle,
}: {
  group: GroupedWaste;
  onRecycle: (item: WasteItem) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-2 rounded-lg ${expanded ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "bg-gray-100 text-gray-500 dark:bg-slate-800"}`}
          >
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          <div>
            <h3 className="font-bold text-lg">{group.spkNumber}</h3>
            <p className="text-sm text-gray-500">
              Total Waste:{" "}
              <span className="font-semibold text-orange-500">
                {group.totalWaste.toFixed(2)} Kg
              </span>
            </p>
          </div>
          {/* List items briefly */}
          <div className="hidden md:flex gap-2">
            {Array.from(
              new Set(
                group.items
                  .map((i) => i.spk.spkItems?.[0]?.namaBarang)
                  .filter(Boolean),
              ),
            ).map((name, idx) => (
              <span
                key={idx}
                className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full text-gray-600 dark:text-gray-300 border dark:border-slate-700"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-950 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Bahan Baku Asal</th>
                  <th className="px-6 py-3">Jumlah (Kg)</th>
                  <th className="px-6 py-3">Keterangan</th>
                  <th className="px-6 py-3">Tanggal Input</th>
                  <th className="px-6 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {group.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">
                      {item.material.name}
                      <span className="block text-xs text-blue-500 font-medium mt-0.5">
                        {item.material.itemType?.name || item.material.category}
                      </span>
                      <span className="block text-xs text-gray-400 font-normal">
                        Unit: {item.material.unit?.name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-orange-600 dark:text-orange-400">
                      {item.quantity.toFixed(2)} Kg
                    </td>
                    <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate">
                      {item.notes || "-"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {format(new Date(item.createdAt), "dd MMM yyyy HH:mm", {
                        locale: id,
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.quantity > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRecycle(item);
                          }}
                          className="inline-flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Recycle size={14} />
                          Daur Ulang
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                          <CheckCircle2 size={14} /> Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Sub-Component: Recycle Modal
function RecycleModal({
  waste,
  onClose,
  onSuccess,
}: {
  waste: WasteItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [recycleType, setRecycleType] = useState<
    "RETURN_TO_ORIGIN" | "NEW_ITEM"
  >("RETURN_TO_ORIGIN");
  const [quantity, setQuantity] = useState(waste.quantity);
  const [targetItemId, setTargetItemId] = useState("");
  // Fix type for available items
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (recycleType === "NEW_ITEM") {
      // Load items for dropdown
      getMaterialsForRecycleDropdown().then((res) => {
        if (res.success && res.data) {
          setAvailableItems(res.data);
        }
      });
    }
  }, [recycleType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Removed userId passing, action handles it from cookies
    const res = await processRecycling({
      wasteId: waste.id,
      quantity: Number(quantity),
      recycleType,
      targetItemId: recycleType === "NEW_ITEM" ? targetItemId : undefined,
    });

    if (res.success) {
      toast.success("Daur ulang berhasil diproses!");
      onSuccess();
    } else {
      toast.error((res as any).error || "Gagal memproses.");
    }
    setSubmitting(false);
  };

  // Group items by itemType
  const bahanBakuGroups = availableItems.reduce((acc: any, item: any) => {
    const groupName = item.itemType?.name || item.category || "Lainnya";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-800"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold">Proses Daur Ulang</h2>
          <p className="text-sm text-gray-500">
            Sumber: <b>{waste.material.name}</b> ({waste.quantity} Kg)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* METODE */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Metode Daur Ulang
            </label>

            <div className="grid gap-3">
              {/* RETURN */}
              <label
                className={`relative flex items-start p-4 cursor-pointer rounded-xl border transition-all
              ${
                recycleType === "RETURN_TO_ORIGIN"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={recycleType === "RETURN_TO_ORIGIN"}
                  onChange={() => {
                    setRecycleType("RETURN_TO_ORIGIN");
                    setTargetItemId("");
                  }}
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    <Recycle size={16} /> Kembalikan ke Stok Asal
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Stok masuk ke: <b>{waste.material.name}</b>
                  </div>
                </div>
                {recycleType === "RETURN_TO_ORIGIN" && (
                  <CheckCircle2 size={18} className="text-blue-500" />
                )}
              </label>

              {/* NEW ITEM */}
              <label
                className={`relative flex items-start p-4 cursor-pointer rounded-xl border transition-all
              ${
                recycleType === "NEW_ITEM"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800"
              }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={recycleType === "NEW_ITEM"}
                  onChange={() => setRecycleType("NEW_ITEM")}
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    <Recycle size={16} /> Jadikan Item Baru
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Contoh: Biji Plastik Daur Ulang
                  </div>
                </div>
                {recycleType === "NEW_ITEM" && (
                  <CheckCircle2 size={18} className="text-blue-500" />
                )}
              </label>
            </div>
          </div>

          {/* TARGET ITEM */}
          <AnimatePresence>
            {recycleType === "NEW_ITEM" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <label className="block text-sm font-medium mb-1">
                    Item Target (Bahan Baku)
                  </label>

                  <div className="relative">
                    <select
                      required
                      value={targetItemId}
                      onChange={(e) => setTargetItemId(e.target.value)}
                      className="
          w-full p-2.5 pr-10 rounded-xl border
          bg-white dark:bg-slate-800
          text-sm
          focus:ring-2 focus:ring-blue-500
        "
                    >
                      <option value="">-- Pilih Bahan Baku --</option>

                      {Object.keys(bahanBakuGroups).map((group) => (
                        <optgroup
                          key={group}
                          label={`Kategori: ${group}`}
                          className="font-medium"
                        >
                          {bahanBakuGroups[group].map((item: any) => (
                            <option key={item.id} value={item.id}>
                              {item.code} • {item.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* QTY */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Jumlah Hasil (Kg)
            </label>
            <input
              type="number"
              step="0.01"
              min={0.01}
              max={waste.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border bg-white dark:bg-slate-800 font-mono font-bold text-lg"
            />

            {quantity > 0 && waste.quantity - quantity > 0 && (
              <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                Susut {(waste.quantity - quantity).toFixed(2)} Kg (hilang/buang)
              </p>
            )}
          </div>

          {/* ACTION */}
          <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                quantity <= 0 ||
                quantity > waste.quantity ||
                (recycleType === "NEW_ITEM" && !targetItemId)
              }
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "Proses Restock"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
