/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "react-toastify";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { ClipboardList } from "lucide-react";
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
  satuan: string;
  fulfillmentMethod: string;
  fulfillmentStatus: string;
  item: Item | null;
  salesOrder?: {
    spesifikasi_barang?: string | null;
  };
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

  useEffect(() => {
    fetchSpks();
  }, []);

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

      const sortedSpks = (data.spks || []).sort(
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
    // 1️⃣ PRODUKSI HARUS DONE/COMPLETED/FULFILLED
    const unfinishedProduction = spk.spkItems.some(
      (i) =>
        i.fulfillmentMethod === "PRODUCTION" &&
        !PRODUCTION_DONE_STATUSES.includes(i.fulfillmentStatus),
    );
    if (unfinishedProduction) return false;

    // 2️⃣ TRADING HARUS PO APPROVED
    if (
      spk.spkItems.some((i) => i.fulfillmentMethod === "TRADING") &&
      !spk.tradingApproved
    ) {
      return false;
    }

    // 3️⃣ FROM STOCK HARUS COMPLETED / FULFILLED
    const unfinishedStock = spk.spkItems.some(
      (i) =>
        i.fulfillmentMethod === "FROM_STOCK" &&
        !["COMPLETED", "FULFILLED"].includes(i.fulfillmentStatus),
    );
    if (unfinishedStock) return false;

    return true;
  };

  const handleApprove = async (spk: SpkForApproval) => {
    // ================= VALIDASI AWAL =================
    if (!canApproveSpk(spk)) {
      const reasons: string[] = [];

      // ✅ BENAR
      const productionItems = spk.spkItems.filter(
        (i) => i.fulfillmentMethod === "PRODUCTION",
      );

      // Debug logging
      console.log("🔍 DEBUG handleApprove:", {
        spkNumber: spk.spkNumber,
        productionItems: productionItems.map((i) => ({
          id: i.id,
          namaBarang: i.namaBarang,
          fulfillmentStatus: i.fulfillmentStatus,
          isDone: PRODUCTION_DONE_STATUSES.includes(i.fulfillmentStatus),
        })),
        PRODUCTION_DONE_STATUSES,
      });

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

      toast.warning(`SPK belum bisa di-approve karena: ${reasons.join(", ")}`);
      return;
    }

    // ================= AMBIL ITEM =================
    const fromStockItems = spk.spkItems.filter(
      (i) =>
        i.fulfillmentMethod === "FROM_STOCK" &&
        i.fulfillmentStatus === "COMPLETED",
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

    if (
      !confirm(
        `Approve barang jadi untuk SPK ${spk.spkNumber}? (${itemTypes.join(
          ", ",
        )}) Stok akan dikurangkan dan transaksi barang keluar akan tercatat.`,
      )
    ) {
      return;
    }

    // ================= PROSES APPROVE =================
    try {
      setSubmittingId(spk.id);
      const successMessages: string[] = [];

      // ===== FROM STOCK =====
      if (fromStockItems.length > 0) {
        const res = await fetch(`/api/spk/${spk.id}/fulfill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spkItemIds: fromStockItems.map((i) => i.id),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Gagal approve FROM_STOCK");
          return;
        }

        successMessages.push(data.message || "FROM_STOCK berhasil di-approve");
      }

      // ===== TRADING =====
      if (tradingItems.length > 0 && spk.tradingApproved) {
        const res = await fetch(`/api/spk/${spk.id}/approve-trading`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spkItemIds: tradingItems.map((i) => i.id),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Gagal approve TRADING");
          return;
        }

        successMessages.push(data.message || "TRADING berhasil di-approve");
      }

      // ===== PRODUCTION (DONE = BOLEH) =====
      if (completedProductionItems.length > 0) {
        const res = await fetch(`/api/spk/${spk.id}/approve-production`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spkItemIds: completedProductionItems.map((i) => i.id),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Gagal approve PRODUCTION");
          return;
        }

        successMessages.push(data.message || "PRODUCTION berhasil di-approve");
      }

      // ================= UPDATE STATUS SPK =================
      const checkSpk = await fetch(`/api/spk/${spk.id}`);
      if (checkSpk.ok) {
        const spkData = await checkSpk.json();
        const allFinished = spkData.spk.spkItems.every((item: any) => {
          if (item.fulfillmentMethod === "PRODUCTION") {
            return PRODUCTION_DONE_STATUSES.includes(item.fulfillmentStatus);
          }

          return item.fulfillmentStatus === "FULFILLED";
        });

        if (allFinished) {
          await fetch(`/api/spk/${spk.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "READY_TO_SHIP" }),
          });
        }
      }

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

  const filteredSpks = spks.filter((spk) => {
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

    // FILTER STATUS
    if (filterStatus === "APPROVED") return approved;
    if (filterStatus === "WAITING") return !approved;

    return true;
  });

  const totalPages = Math.ceil(filteredSpks.length / limit);

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
          {/* TITLE */}

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

              const fromStockDone =
                fromStockItems.length > 0 &&
                fromStockItems.every(
                  (i) => i.fulfillmentStatus === "FULFILLED",
                );

              const productionDone =
                productionItems.length > 0 &&
                productionItems.every((i) =>
                  PRODUCTION_DONE.includes(i.fulfillmentStatus),
                );

              const canApprove = canApproveSpk(spk);

              const isApproved = spk.spkItems.every((item) => {
                if (item.fulfillmentMethod === "PRODUCTION") {
                  return PRODUCTION_DONE.includes(item.fulfillmentStatus);
                }
                return item.fulfillmentStatus === "FULFILLED";
              });

              return (
                <div
                  key={spk.id}
                  className="bg-white border rounded-xl shadow-sm hover:shadow-md transition"
                >
                  {/* HEADER */}
                  <div className="px-4 py-3 flex justify-between items-center gap-4">
                    {/* LEFT */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900">
                          {spk.spkNumber}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isApproved
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {isApproved ? "APPROVED" : "WAITING"}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        {spk.lead.nama_toko} • {formatDate(spk.tglSpk)}
                        {spk.deadline &&
                          ` • Deadline ${formatDate(spk.deadline)}`}
                      </div>

                      <div className="flex gap-2 mt-2 flex-wrap">
                        {fromStockItems.length > 0 && (
                          <StatusChip label="FROM STOCK" ok={fromStockDone} />
                        )}

                        {tradingItems.length > 0 && (
                          <StatusChip
                            label="TRADING"
                            ok={spk.tradingApproved}
                          />
                        )}

                        {productionItems.length > 0 && (
                          <StatusChip label="PRODUKSI" ok={productionDone} />
                        )}
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(spk.id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {expandedSpkId === spk.id
                          ? "Tutup Detail"
                          : "Lihat Detail"}
                      </button>

                      {isApproved ? (
                        <span className="text-xs text-gray-500 italic">
                          Sudah di-approve
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApprove(spk)}
                          disabled={!canApprove || submittingId === spk.id}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                            !canApprove || submittingId === spk.id
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {submittingId === spk.id ? "Memproses..." : "Approve"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DETAIL */}
                  {expandedSpkId === spk.id && (
                    <div className="border-t px-4 py-3 space-y-4 text-sm">
                      {/* FROM STOCK */}
                      {fromStockItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            FROM STOCK
                          </p>
                          <div className="space-y-1">
                            {fromStockItems.map((i) => (
                              <div
                                key={i.id}
                                className="bg-gray-50 rounded-md px-3 py-1.5"
                              >
                                <div className="flex justify-between">
                                  <span>{i.namaBarang}</span>
                                  <span className="text-xs text-gray-500">
                                    {i.qty} {i.satuan}
                                  </span>
                                </div>
                                {i.salesOrder?.spesifikasi_barang && (
                                  <div className="text-[11px] text-gray-500 italic pl-2 border-l-2 border-gray-200 mt-1 ml-1">
                                    Spec: {i.salesOrder.spesifikasi_barang}
                                  </div>
                                )}
                              </div>

                            ))}
                          </div>
                        </div>
                      )}

                      {/* TRADING */}
                      {tradingItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            TRADING
                          </p>
                          <div className="space-y-1">
                            {tradingItems.map((i) => (
                              <div
                                key={i.id}
                                className="bg-gray-50 rounded-md px-3 py-1.5"
                              >
                                <div className="flex justify-between">
                                  <span>{i.namaBarang}</span>
                                  <span className="text-xs text-gray-500">
                                    {i.qty} {i.satuan}
                                  </span>
                                </div>
                                {i.salesOrder?.spesifikasi_barang && (
                                  <div className="text-[11px] text-gray-500 italic pl-2 border-l-2 border-gray-200 mt-1 ml-1">
                                    Spec: {i.salesOrder.spesifikasi_barang}
                                  </div>
                                )}
                              </div>

                            ))}
                          </div>
                        </div>
                      )}

                      {/* PRODUKSI */}
                      {productionItems.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">
                            PRODUKSI
                          </p>
                          <div className="space-y-1">
                            {productionItems.map((i) => (
                              <div
                                key={i.id}
                                className="bg-gray-50 rounded-md px-3 py-1.5"
                              >
                                <div className="flex justify-between">
                                  <span>{i.namaBarang}</span>
                                  <span className="text-xs">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                                        PRODUCTION_DONE.includes(
                                          i.fulfillmentStatus,
                                        )
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {i.fulfillmentStatus}
                                    </span>
                                  </span>
                                </div>
                                {i.salesOrder?.spesifikasi_barang && (
                                  <div className="text-[11px] text-gray-500 italic pl-2 border-l-2 border-gray-200 mt-1 ml-1">
                                    Spec: {i.salesOrder.spesifikasi_barang}
                                  </div>
                                )}
                              </div>

                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 text-sm rounded-md border disabled:opacity-40"
            >
              ← Sebelumnya
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
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
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 text-sm rounded-md border disabled:opacity-40"
            >
              Berikutnya →
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
