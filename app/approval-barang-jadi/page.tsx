/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "react-toastify";

import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { ClipboardList, Camera, AlertCircle, CheckCircle2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Unit {
  name: string;
}

interface Item {
  id: string;
  name: string;
  unit: Unit;
}

interface SpkItem {
  id: string;
  namaBarang: string;
  qty: number;
  readyQty: number; // Kuantitas di gudang siap kirim
  producedQty: number; // Kuantitas yang sudah diproduksi
  shippedQty: number; // Kuantitas yang sudah dikirim
  approvedQty: number; // Kuantitas yang sudah disetujui (total)
  onTruckQty: number; // Kuantitas sedang di jalan
  availableToApprove: number; // Kuantitas fisik belum di-approve
  satuan: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  item?: Item;
  salesOrder?: {
    spesifikasi_tambahan?: string | null;
  };
  lastStage: string | null;
}

interface LeadInfo {
  id: number;
  nama_toko: string;
  nama_owner: string;
  nama_pic: string;
}

interface UserInfo {
  id: string;
  name: string;
  username: string;
}

interface SpkForApproval {
  id: string;
  spkNumber: string;
  status: string;
  tglSpk: string;
  deadline: string | null;
  catatan: string | null;
  lead: LeadInfo;
  user: UserInfo;
  spkItems: SpkItem[];
  hasProductionItems: boolean;
  hasTradingItems: boolean;
  tradingApproved: boolean;
  warehouseApproved: boolean; // ✅ DARI BACKEND
  fotoBuktiUrl?: string | null; // ✅ DARI BACKEND
  canApprove: boolean; // ✅ DARI BACKEND
}

export default function ApprovalBarangJadiPage() {
  const [spks, setSpks] = useState<SpkForApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "status">("date");
  const [limit, setLimit] = useState(5);
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "WAITING" | "APPROVED"
  >("ALL");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState<
    "ALL" | "FROM_STOCK" | "TRADING" | "PRODUCTION"
  >("ALL");
  const [activeTab, setActiveTab] = useState<"waiting" | "history">("waiting");

  const [openApprove, setOpenApprove] = useState(false);
  const [selectedSpk, setSelectedSpk] = useState<any>(null);

  useEffect(() => {
    fetchSpks();
  }, []);

  // State untuk Modal Approval Parsial
  const [shippingQuantities, setShippingQuantities] = useState<
    Record<string, number>
  >({});

  const fetchSpks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spk/finished-goods-approval");

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("API Error:", errorData);
        toast.error(`Error: ${errorData.error || "Gagal mengambil data SPK"}`);
        setSpks([]);
        return;
      }

      const data = await res.json();
      console.log("Fetched SPK data:", data);

      // Debug: Log production completion status
      if (data.spks && data.spks.length > 0) {
        console.log(`=== DEBUG: Received ${data.spks.length} SPKs ===`);
        data.spks.forEach((spk: SpkForApproval) => {
          const productionItems = spk.spkItems.filter(
            (i) => i.fulfillmentMethod === "PRODUCTION",
          );
          console.log(`SPK ${spk.spkNumber}:`, {
            hasProductionItems: spk.hasProductionItems,
            canApprove: spk.canApprove,
            productionItems: productionItems.map((i) => ({
              namaBarang: i.namaBarang,
              fulfillmentStatus: i.fulfillmentStatus,
            })),
          });
        });
        console.log("=== END DEBUG ===");
      }

      const processedSpks = (data.spks || []).map((spk: SpkForApproval) => ({
        ...spk,
        spkItems: spk.spkItems.map((item) => ({
          ...item,
          // 💡 Logic: Yang bisa di-approve adalah readyQty FISIK
          // dikurangi yang SUDAH di-approve sebelumnya (tapi belum dikirim)
          availableToApprove: Math.max(
            0,
            item.readyQty - (item.onTruckQty || 0),
          ),
        })),
      }));

      const sortedSpks = processedSpks.sort(
        (a: SpkForApproval, b: SpkForApproval) =>
          new Date(b.tglSpk).getTime() - new Date(a.tglSpk).getTime(),
      );

      setSpks(sortedSpks);
    } catch (error) {
      console.error("Error fetching SPK for finished goods approval:", error);
      toast.error(
        "Terjadi kesalahan saat mengambil data SPK. Silakan refresh halaman.",
      );
      setSpks([]);
    } finally {
      setLoading(false);
    }
  };

  // Treat produksi selesai ketika sudah DONE atau COMPLETED di SPK item
  const PRODUCTION_DONE_STATUSES = ["DONE", "COMPLETED", "FULFILLED"];

  // ✅ FINAL
  const canApproveSpk = (spk: SpkForApproval) => {
    // 1. Minimal ada satu item dengan readyQty > 0
    const hasReadyItem = spk.spkItems.some((i) => i.readyQty > 0);

    // 2. Jika ada item TRADING, maka PO harus sudah disetujui
    const isTradingApproved = !spk.hasTradingItems || spk.tradingApproved;

    // 3. Jika ada item PRODUCTION, maka item produksi tersebut harus sudah selesai
    const productionItems = spk.spkItems.filter(
      (i) => i.fulfillmentMethod === "PRODUCTION",
    );
    const isProductionApproved =
      productionItems.length === 0 ||
      productionItems.every((i) =>
        ["DONE", "COMPLETED", "FULFILLED"].includes(i.fulfillmentStatus),
      );

    return hasReadyItem && isTradingApproved && isProductionApproved;
  };

  const handleApprove = async (spk: SpkForApproval) => {
    // ================= VALIDASI AWAL =================
    if (!canApproveSpk(spk)) {
      const reasons: string[] = [];

      const productionItems = spk.spkItems.filter(
        (i) => i.fulfillmentMethod === "PRODUCTION",
      );

      const unfinishedProduction = productionItems.some(
        (i) => !PRODUCTION_DONE_STATUSES.includes(i.fulfillmentStatus),
      );

      if (unfinishedProduction) {
        const unfinishedItems = productionItems
          .filter(
            (i) => !PRODUCTION_DONE_STATUSES.includes(i.fulfillmentStatus),
          )
          .map((i) => `${i.namaBarang} (${i.fulfillmentStatus})`)
          .join(", ");
        reasons.push(`Produksi belum selesai: ${unfinishedItems}`);
      }

      if (spk.hasTradingItems && !spk.tradingApproved) {
        reasons.push("Purchase Order belum di-approve");
      }

      if (reasons.length === 0) {
        reasons.push(
          "Belum ada saldo barang yang siap dikirim (Siap Kirim: 0)",
        );
      }

      toast.warning(`SPK belum bisa di-approve karena: ${reasons.join(", ")}`);
      return;
    }

    // ================= AMBIL ITEM =================
    // FROM_STOCK: boleh di-approve kalau masih RESERVED atau sudah COMPLETED
    const fromStockItems = spk.spkItems.filter(
      (i) =>
        i.fulfillmentMethod === "FROM_STOCK" &&
        (i.fulfillmentStatus === "RESERVED" ||
          i.fulfillmentStatus === "COMPLETED"),
    );

    const tradingItems = spk.spkItems.filter(
      (i) => i.fulfillmentMethod === "TRADING",
    );

    const completedProductionItems = spk.spkItems.filter(
      (i) =>
        i.fulfillmentMethod === "PRODUCTION" &&
        PRODUCTION_DONE_STATUSES.includes(i.fulfillmentStatus),
    );

    // ================= ITEM TYPES (CONFIRM TEXT) =================
    const itemTypes: string[] = [];

    if (fromStockItems.length > 0) {
      itemTypes.push(`${fromStockItems.length} item FROM_STOCK`);
    }

    if (tradingItems.length > 0 && spk.tradingApproved) {
      itemTypes.push(`${tradingItems.length} item TRADING`);
    }

    if (completedProductionItems.length > 0) {
      itemTypes.push(`${completedProductionItems.length} item PRODUCTION`);
    }

    // ⛔️ INI PENTING — FIX SPK PRODUKSI ONLY
    if (itemTypes.length === 0) {
      toast.warning("Tidak ada item yang bisa di-approve");
      return;
    }

    // ================= PROSES APPROVE =================
    try {
      setSubmittingId(spk.id);
      const successMessages: string[] = [];

      // Kita gunakan endpoint baru atau modifikasi fulfill untuk menerima partial
      const itemsToShip = spk.spkItems
        .filter((item) => (shippingQuantities[item.id] || 0) > 0)
        .map((item) => ({
          spkItemId: item.id,
          quantity: shippingQuantities[item.id],
        }));

      if (itemsToShip.length === 0) {
        toast.error("Tidak ada kuantitas yang diinput untuk dikirim");
        return;
      }

      const res = await fetch(`/api/spk/${spk.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToShip }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gagal approve barang");
        return;
      }

      successMessages.push(
        data.message || "Pengiriman parsial berhasil di-approve",
      );

      // Logic manual status update di frontend dihapus karena sudah ditangani oleh backend /api/spk/[id]/fulfill
      // yang akan memindahkan SPK ke status READY_TO_SHIP secara otomatis.

      toast.success(successMessages.join("\n"));
      fetchSpks();
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat approve barang jadi");
    } finally {
      setSubmittingId(null);
    }
  };

  const isSpkApproved = (spk: SpkForApproval) => {
    const fromStockItems = spk.spkItems.filter(
      (i) => i.fulfillmentMethod === "FROM_STOCK",
    );
    const tradingItems = spk.spkItems.filter(
      (i) => i.fulfillmentMethod === "TRADING",
    );

    const fromStockApproved =
      fromStockItems.length === 0 ||
      fromStockItems.every((i) => i.fulfillmentStatus === "FULFILLED");

    const tradingApproved =
      tradingItems.length === 0 ||
      tradingItems.every((i) => i.fulfillmentStatus === "FULFILLED");

    return fromStockApproved && tradingApproved;
  };

  const filteredSpks = spks
    .filter((spk) => {
      const approved = isSpkApproved(spk);

      // 🔍 SEARCH SPK & CUSTOMER
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSpk = spk.spkNumber.toLowerCase().includes(q);
        const matchCustomer = spk.lead?.nama_toko?.toLowerCase().includes(q);

        if (!matchSpk && !matchCustomer) return false;
      }

      // 🧰 FILTER LAYANAN
      if (filterService !== "ALL") {
        const hasService = spk.spkItems.some(
          (i) => i.fulfillmentMethod === filterService,
        );
        if (!hasService) return false;
      }

      // FILTER STATUS & TAB SPLIT
      const isFullyApproved = spk.spkItems.every(
        (item: any) => (item.approvedQty || 0) >= item.qty,
      );
      const isComplete = spk.status === "DONE" || isFullyApproved;

      if (activeTab === "waiting") {
        // Menunggu: Muncul jika belum sepenuhnya disetujui (Fully Approved)
        if (isComplete) return false;
      } else {
        // Riwayat: Muncul jika sudah sepenuhnya disetujui atau SHIPPED
        if (!isComplete) return false;
      }

      if (filterStatus === "APPROVED") return approved;
      if (filterStatus === "WAITING") return !approved;

      return true;
    })
    .sort((a, b) => {
      // URUTAN PRIORITAS di tab Waiting
      if (activeTab === "waiting") {
        // 1. Yang bisa di-approve (readyQty > 0) posisi paling atas
        if (a.canApprove && !b.canApprove) return -1;
        if (!a.canApprove && b.canApprove) return 1;
      }

      // 2. Default: Urutkan berdasarkan tanggal terbaru (paling atas)
      return new Date(b.tglSpk).getTime() - new Date(a.tglSpk).getTime();
    });

  const spkTotalPages = Math.ceil(filteredSpks.length / limit);

  const visibleSpks = filteredSpks.slice((page - 1) * limit, page * limit);

  const [expandedSpkId, setExpandedSpkId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSpkId((prev) => (prev === id ? null : id));
  };

  const StatusChip = ({ label, ok }: { label: string; ok: boolean }) => (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {label} {ok ? "✓" : "!"}
    </span>
  );

  const itemTypes = useMemo(() => {
    if (!selectedSpk?.spkItems) return [];

    return [
      ...new Set(
        selectedSpk.spkItems
          .map((item: any) => item.item?.itemType?.name)
          .filter(Boolean),
      ),
    ];
  }, [selectedSpk]);

  const openApproveModal = (spk: SpkForApproval) => {
    // Inisialisasi kuantitas pengiriman dengan readyQty yang ada,
    // tapi DIBATASI maksimal sebesar sisa pesanan (qty - shippedQty)
    const initialQtys: Record<string, number> = {};
    spk.spkItems.forEach((item) => {
      if (item.readyQty > 0) {
        const remainingToShip = Math.max(0, item.qty - (item.shippedQty || 0));
        initialQtys[item.id] = Math.min(item.readyQty, remainingToShip);
      }
    });

    setShippingQuantities(initialQtys);
    setSelectedSpk(spk);
    setOpenApprove(true);
  };

  const SpkCardSkeleton = () => (
    <div className="rounded-xl bg-white shadow-sm animate-pulse">
      {/* HEADER */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-4 w-14 bg-gray-200 rounded-full" />
          <div className="h-4 w-12 bg-gray-200 rounded-full" />
        </div>
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>

      {/* INFO */}
      <div className="px-4 pb-2 flex gap-4">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-3 w-28 bg-gray-200 rounded" />
      </div>

      {/* ITEMS */}
      <div className="px-4 pb-3 space-y-2">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex justify-between bg-gray-50 rounded-lg px-3 py-2"
          >
            <div className="space-y-1">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>

      {/* ACTION */}
      <div className="px-4 py-3 border-t flex justify-end">
        <div className="h-7 w-20 bg-gray-200 rounded-md" />
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 space-y-4">
          {/* TABS */}
          <div className="flex border-b border-gray-200 -mx-5 px-5">
            <button
              onClick={() => {
                setActiveTab("waiting");
                setPage(1);
              }}
              className={`pb-3 px-4 text-sm font-bold transition-all relative ${
                activeTab === "waiting"
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Menunggu Approval
              {activeTab === "waiting" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setPage(1);
              }}
              className={`pb-3 px-4 text-sm font-bold transition-all relative ${
                activeTab === "history"
                  ? "text-blue-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Riwayat Approval
              {activeTab === "history" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
              )}
            </button>
          </div>

          {/* CONTROL BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* LEFT CONTROLS */}
            <div className="flex flex-wrap items-center gap-2">
              {/* SEARCH */}
              <input
                type="text"
                placeholder="Cari No SPK / Nama Customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-[240px] px-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              />

              {/* FILTER LAYANAN */}
              <select
                value={filterService}
                onChange={(e) => {
                  setFilterService(e.target.value as any);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Layanan</option>
                <option value="FROM_STOCK">From Stock</option>
                <option value="TRADING">Trading</option>
                <option value="PRODUCTION">Produksi</option>
              </select>

              {/* SORT */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Urutkan: Terbaru</option>
                <option value="status">Urutkan: Status</option>
              </select>

              {/* FILTER STATUS */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="WAITING">Waiting Approval</option>
                <option value="APPROVED">Approved</option>
              </select>

              {/* LIMIT */}
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>Tampilkan 5</option>
                <option value={10}>Tampilkan 10</option>
                <option value={20}>Tampilkan 20</option>
                <option value={50}>Tampilkan 50</option>
              </select>
            </div>

            {/* RIGHT INFO */}
            <div className="text-sm text-gray-500">
              Menampilkan{" "}
              <span className="font-medium text-gray-700">
                {visibleSpks.length}
              </span>{" "}
              dari{" "}
              <span className="font-medium text-gray-700">{spks.length}</span>{" "}
              SPK
            </div>
          </div>
        </div>

        {loading ? (
          /* ================= SKELETON ================= */
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, i) => (
              <SpkCardSkeleton key={i} />
            ))}
          </div>
        ) : spks.length === 0 ? (
          /* ================= EMPTY STATE ================= */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ClipboardList className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 font-medium">
              Tidak ada SPK yang menunggu approval barang jadi
            </p>
            <p className="text-sm text-gray-500 mt-1">
              SPK akan muncul di sini setelah status IN_PROGRESS dan item
              FROM_STOCK memiliki fulfillmentStatus = COMPLETED.
            </p>
          </div>
        ) : (
          /* ================= REAL DATA ================= */
          <div className="space-y-3">
            {visibleSpks.map((spk) => {
              const PRODUCTION_DONE = ["DONE", "COMPLETED", "FULFILLED"];

              const fromStockItems = spk.spkItems.filter(
                (i) => i.fulfillmentMethod === "FROM_STOCK",
              );

              const tradingItems = spk.spkItems.filter(
                (i) => i.fulfillmentMethod === "TRADING",
              );

              const productionItems = spk.spkItems.filter(
                (i) => i.fulfillmentMethod === "PRODUCTION",
              );

              const canApprove = spk.canApprove;

              const anyApproved = spk.spkItems.some(
                (i) => (i.approvedQty || 0) > 0,
              );
              const isFullyApprovedLocal = spk.spkItems.every(
                (i) => (i.approvedQty || 0) >= i.qty,
              );
              const isPartialAuth = !isFullyApprovedLocal && anyApproved;
              const allShippedLocal = spk.spkItems.every(
                (i) => (i.shippedQty || 0) >= i.qty,
              );

              // 📦 GROUPING LOGIC
              const groups: Record<
                string,
                { name: string; items: any[]; type: string }
              > = {
                internal: {
                  name: "Produksi / Stok Internal",
                  items: [],
                  type: "INTERNAL",
                },
              };

              spk.spkItems.forEach((item: any) => {
                if (item.fulfillmentMethod === "TRADING" && item.poInfo) {
                  const poKey = `po-${item.poInfo.nomorPO}`;
                  if (!groups[poKey]) {
                    groups[poKey] = {
                      name: `Vendor: ${item.poInfo.kepada} (PO: ${item.poInfo.nomorPO})`,
                      items: [],
                      type: "PO",
                    };
                  }
                  groups[poKey].items.push(item);
                } else {
                  groups.internal.items.push(item);
                }
              });

              return (
                <div
                  key={spk.id}
                  className="bg-white border rounded-xl shadow-sm hover:shadow-md transition overflow-hidden"
                >
                  {/* HEADER */}
                  <div className="px-4 py-3 bg-gray-50/50 flex justify-between items-center gap-4">
                    {/* LEFT */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">
                          {spk.spkNumber}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shadow-sm ${
                            spk.status === "DONE"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : isFullyApprovedLocal
                                ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                                : isPartialAuth
                                  ? "bg-orange-100 text-orange-800 border-orange-200"
                                  : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {spk.status === "DONE"
                            ? "SHIPPED ALL"
                            : isFullyApprovedLocal
                              ? "FULL APPROVED"
                              : isPartialAuth
                                ? "PARTIAL"
                                : "WAITING"}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 mt-1 font-medium">
                        {spk.lead.nama_toko} • {formatDate(spk.tglSpk)}
                        {spk.deadline && (
                          <span className="text-rose-600 ml-1">
                            • Deadline: {formatDate(spk.deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="flex items-center gap-3">
                      {spk.fotoBuktiUrl && (
                        <a
                          href={spk.fotoBuktiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all active:scale-95 shadow-sm"
                        >
                          <Camera size={14} /> Lihat Bukti
                        </a>
                      )}
                      <button
                        onClick={() => toggleExpand(spk.id)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                      >
                        {expandedSpkId === spk.id
                          ? "Tutup Detail"
                          : "Buka Detail"}
                      </button>
                    </div>
                  </div>

                  {/* DETAIL & SPLIT VIEW */}
                  {expandedSpkId === spk.id && (
                    <div className="border-t divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-300 text-sm">
                      {Object.entries(groups).map(([key, group]) => {
                        if (group.items.length === 0) return null;

                        const groupCanApprove =
                          group.items.some((i) => i.readyQty > 0) &&
                          (group.type === "INTERNAL"
                            ? group.items
                                .filter(
                                  (i) => i.fulfillmentMethod === "PRODUCTION",
                                )
                                .every((i) =>
                                  ["DONE", "COMPLETED", "FULFILLED"].includes(
                                    i.fulfillmentStatus,
                                  ),
                                )
                            : true); // PO items are matched only if PO is approved/received on backend

                        const groupAllApproved = group.items.every(
                          (i) => (i.approvedQty || 0) >= i.qty,
                        );

                        return (
                          <div
                            key={key}
                            className="p-4 bg-white hover:bg-gray-50/30 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-1.5 h-6 rounded-full ${group.type === "PO" ? "bg-amber-500" : "bg-blue-500"}`}
                                />
                                <h4 className="text-sm font-bold text-gray-800 uppercase tracking-tight">
                                  {group.name}
                                </h4>
                              </div>

                              {!groupAllApproved && (
                                <button
                                  onClick={() =>
                                    openApproveModal({
                                      ...spk,
                                      spkItems: group.items,
                                    })
                                  }
                                  disabled={
                                    !groupCanApprove || submittingId === spk.id
                                  }
                                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2 ${
                                    !groupCanApprove || submittingId === spk.id
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                                      : group.type === "PO"
                                        ? "bg-amber-600 text-white hover:bg-amber-700 hover:shadow-amber-200/50"
                                        : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200/50"
                                  }`}
                                >
                                  {submittingId === spk.id
                                    ? "Memproses..."
                                    : `Approve ${group.type === "PO" ? "PO Ini" : "Internal"}`}
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              {groupAllApproved && (
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                  <CheckCircle2 size={14} /> Full Approved
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {group.items.map((i) => (
                                <div
                                  key={i.id}
                                  className="bg-gray-50/50 border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-start gap-3">
                                      {(i.approvedQty > 0 ||
                                        i.shippedQty > 0) && (
                                        <div className="mt-1 flex-shrink-0">
                                          <CheckCircle2
                                            size={18}
                                            className={
                                              i.shippedQty >= i.qty
                                                ? "text-emerald-500"
                                                : "text-blue-500"
                                            }
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-bold text-gray-900 leading-tight">
                                          {i.namaBarang}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest px-2 py-0.5 bg-gray-200 rounded">
                                            {i.fulfillmentMethod}
                                          </span>
                                          {i.fulfillmentMethod ===
                                            "PRODUCTION" && (
                                            <span
                                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                [
                                                  "DONE",
                                                  "COMPLETED",
                                                  "FULFILLED",
                                                ].includes(i.fulfillmentStatus)
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "bg-amber-100 text-amber-700"
                                              }`}
                                            >
                                              {i.fulfillmentStatus}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-black text-blue-600 leading-none">
                                        {i.qty}
                                      </p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                                        {i.satuan}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 mt-4">
                                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
                                      <p className="text-[8px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-1">
                                        Ready Fisik
                                      </p>
                                      <p
                                        className={`text-base font-black ${i.readyQty > i.qty - (i.shippedQty || 0) ? "text-amber-500" : "text-emerald-600"}`}
                                      >
                                        {i.readyQty}
                                      </p>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 shadow-sm text-center">
                                      <p className="text-[8px] text-blue-400 font-bold uppercase tracking-[0.2em] mb-1">
                                        Ter-Approve
                                      </p>
                                      <p className="text-base font-black text-blue-600">
                                        {i.approvedQty || 0}
                                      </p>
                                    </div>
                                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 shadow-sm text-center">
                                      <p className="text-[8px] text-orange-400 font-bold uppercase tracking-[0.2em] mb-1">
                                        In Transit
                                      </p>
                                      <p className="text-base font-black text-orange-600">
                                        {i.onTruckQty || 0}
                                      </p>
                                    </div>
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 shadow-sm text-center border-dashed">
                                      <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-[0.2em] mb-1">
                                        Bisa Approved
                                      </p>
                                      <p className="text-base font-black text-indigo-600">
                                        {i.availableToApprove}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {spkTotalPages > 1 && (
          <div className="flex justify-between items-center pt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 text-sm rounded-md border disabled:opacity-40"
            >
              ← Sebelumnya
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: spkTotalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-sm rounded-md border ${
                      page === p
                        ? "bg-blue-600 text-white border-blue-600"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              disabled={page === spkTotalPages}
              onClick={() => setPage((p) => Math.min(spkTotalPages, p + 1))}
              className="px-3 py-1 text-sm rounded-md border disabled:opacity-40"
            >
              Berikutnya →
            </button>
          </div>
        )}

        {openApprove && selectedSpk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
              {/* Header */}
              <div className="px-6 py-4 border-b">
                <h3 className="text-base font-semibold text-gray-900">
                  Konfirmasi Approval Barang Jadi
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Pastikan data SPK sudah benar sebelum melanjutkan
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4 text-sm text-gray-700">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="font-semibold text-blue-900 mb-3">
                    Item yang akan dikirim :
                  </p>
                  <div className="space-y-3">
                    {selectedSpk.spkItems.map((item: SpkItem) => {
                      const maxPossible = item.availableToApprove;
                      const sisaPesanan = Math.max(
                        0,
                        item.qty -
                          (item.shippedQty || 0) -
                          (item.onTruckQty || 0),
                      );
                      const isAnomaly =
                        item.readyQty +
                          (item.shippedQty || 0) +
                          (item.onTruckQty || 0) >
                        item.qty;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${isAnomaly ? "bg-amber-50 border-amber-200" : "bg-white border-blue-100"}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {item.namaBarang}
                              </p>
                              {isAnomaly && (
                                <span title="Kuantitas SIAP melebihi sisa Pesanan">
                                  <AlertCircle
                                    size={14}
                                    className="text-amber-500"
                                  />
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 text-[10px] mt-1 text-gray-600">
                              <span>
                                Total: <b>{item.qty}</b>
                              </span>
                              <span className="text-blue-600 font-bold">
                                Bisa Izin: <b>{item.availableToApprove}</b>
                              </span>
                              <span>
                                Sisa SO: <b>{sisaPesanan}</b>
                              </span>
                              <span>
                                Kirim: <b>{item.shippedQty}</b>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={maxPossible}
                              step={0.1}
                              value={shippingQuantities[item.id] || 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setShippingQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(val, maxPossible),
                                }));
                              }}
                              disabled={maxPossible <= 0}
                              className="w-20 h-9 px-2 border rounded-md text-right font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                            <span className="text-xs text-gray-500">
                              {item.satuan}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                  <p className="font-medium">Dampak Approval:</p>
                  <ul className="mt-1 list-disc list-inside text-sm">
                    <li>
                      Kuantitas barang di atas akan{" "}
                      <b>dikurangkan dari saldo Gudang</b>
                    </li>
                    <li>
                      Transaksi <b>Barang Keluar (Surat JalanParsial)</b> akan
                      otomatis tercatat
                    </li>
                    <li>
                      Status SPK akan berubah menjadi <b>PARTIAL</b> jika belum
                      terkirim semua
                    </li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t">
                <button
                  onClick={() => setOpenApprove(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  onClick={() => {
                    setOpenApprove(false);
                    handleApprove(selectedSpk); // <- fungsi approve kamu
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-xl
                     bg-gradient-to-r from-green-600 to-emerald-600
                     text-white hover:from-green-700 hover:to-emerald-700"
                >
                  Ya, Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
