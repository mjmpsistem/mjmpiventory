/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { ClipboardList, CheckCircle } from "lucide-react";
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
        alert(`Error: ${errorData.error || "Gagal mengambil data SPK"}`);
        setSpks([]);
        return;
      }

      const data = await res.json();
      console.log("Fetched SPK data:", data);

      // Debug: Log production completion status
      if (data.spks && data.spks.length > 0) {
        console.log(`=== DEBUG: Received ${data.spks.length} SPKs ===`);
        data.spks.forEach((spk: SpkForApproval) => {
          console.log(`SPK ${spk.spkNumber}:`, {
            hasProductionItems: spk.hasProductionItems,
            canApprove: spk.canApprove,
          });
        });
        console.log("=== END DEBUG ===");
      }

      const sortedSpks = (data.spks || []).sort(
        (a: SpkForApproval, b: SpkForApproval) =>
          new Date(b.tglSpk).getTime() - new Date(a.tglSpk).getTime()
      );

      setSpks(sortedSpks);
    } catch (error) {
      console.error("Error fetching SPK for finished goods approval:", error);
      alert(
        "Terjadi kesalahan saat mengambil data SPK. Silakan refresh halaman."
      );
      setSpks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (spk: SpkForApproval) => {
    if (!spk.canApprove) {
      alert("SPK belum bisa di-approve karena masih menunggu produksi selesai");
      return;
    }

    const fromStockItems = spk.spkItems.filter(
      (i) =>
        i.fulfillmentMethod === "FROM_STOCK" &&
        i.fulfillmentStatus === "COMPLETED"
    );

    if (fromStockItems.length === 0) {
      alert("Tidak ada item FROM_STOCK COMPLETED yang bisa di-approve");
      return;
    }

    if (
      !confirm(
        `Approve barang jadi untuk SPK ${spk.spkNumber}? Stok akan dikurangkan dan transaksi barang keluar akan tercatat.`
      )
    ) {
      return;
    }

    try {
      setSubmittingId(spk.id);

      const res = await fetch(`/api/spk/${spk.id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spkItemIds: fromStockItems.map((i) => i.id),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Terjadi kesalahan saat approve barang jadi");
        return;
      }

      alert(data.message || "Barang jadi berhasil di-approve");
      fetchSpks();
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat approve barang jadi");
    } finally {
      setSubmittingId(null);
    }
  };

  const isSpkApproved = (spk: SpkForApproval) => {
    const fromStockItems = spk.spkItems.filter(
      (i) => i.fulfillmentMethod === "FROM_STOCK"
    );

    return (
      fromStockItems.length > 0 &&
      fromStockItems.every((i) => i.fulfillmentStatus === "FULFILLED")
    );
  };

  const filteredSpks = spks.filter((spk) => {
    const approved = isSpkApproved(spk);

    if (filterStatus === "ALL") return true;
    if (filterStatus === "APPROVED") return approved;
    if (filterStatus === "WAITING") return !approved;

    return true;
  });

  const sortedSpks = [...filteredSpks].sort((a, b) => {
    if (sortBy === "status") {
      return Number(isSpkApproved(b)) - Number(isSpkApproved(a));
    }
    return new Date(b.tglSpk).getTime() - new Date(a.tglSpk).getTime();
  });

  const totalPages = Math.ceil(filteredSpks.length / limit);

  const visibleSpks = filteredSpks.slice((page - 1) * limit, page * limit);

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

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                {/* SORT */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-10 pl-3 pr-8 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all appearance-none"
                >
                  <option value="date">Urutkan: Terbaru</option>
                  <option value="status">Urutkan: Status</option>
                </select>

                {/* FILTER STATUS */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="h-10 pl-3 pr-8 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all appearance-none"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="WAITING">Waiting Approval</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>

              {/* LIMIT */}
              <div className="w-full sm:w-auto">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="w-full sm:w-auto h-10 pl-3 pr-8 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm appearance-none transition-all"
                >
                  <option value={5}>Tampilkan 5</option>
                  <option value={10}>Tampilkan 10</option>
                  <option value={20}>Tampilkan 20</option>
                  <option value={50}>Tampilkan 50</option>
                </select>
              </div>
            </div>

            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
              Menampilkan <span className="text-blue-600 dark:text-blue-400">{visibleSpks.length}</span> dari <span className="text-gray-900 dark:text-white">{spks.length}</span> SPK
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
          <div className="space-y-4">
            {visibleSpks.map((spk) => {
              const fromStockItems = spk.spkItems.filter(
                (i) => i.fulfillmentMethod === "FROM_STOCK"
              );
              const canApprove = spk.canApprove;

              const isApproved =
                fromStockItems.length > 0 &&
                fromStockItems.every(
                  (i) => i.fulfillmentStatus === "FULFILLED"
                );

              const productionItems = spk.spkItems.filter(
                (i) => i.fulfillmentMethod === "PRODUCTION"
              );

              const unfinishedProduction = productionItems.filter(
                (i) => i.fulfillmentStatus !== "COMPLETED"
              );

              return (
                <div
                  key={spk.id}
                  className={`rounded-xl bg-white transition shadow-sm hover:shadow-md ${
                    isApproved ? "opacity-80" : ""
                  }`}
                >
                  {/* ===== CARD CONTENT TETAP SAMA ===== */}
                  {/* HEADER */}
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
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

                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700">
                        {spk.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      {spk.lead.nama_toko}
                    </div>
                  </div>

                  {/* INFO BAR */}
                  <div className="px-4 pb-2 text-xs text-gray-500 flex flex-wrap gap-4">
                    <div>
                      <span className="font-medium">SPK:</span>{" "}
                      {formatDate(spk.tglSpk)}
                    </div>
                    {spk.deadline && (
                      <div>
                        <span className="font-medium">Deadline:</span>{" "}
                        {formatDate(spk.deadline)}
                      </div>
                    )}
                  </div>

                  {/* FROM STOCK ITEMS */}
                  <div className="px-4 pb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      FROM_STOCK
                    </p>

                    {fromStockItems.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Tidak ada item FROM_STOCK pada SPK ini.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {fromStockItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                          >
                            <div>
                              <p className="text-sm text-gray-900">
                                {item.namaBarang}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.qty} {item.satuan}
                              </p>
                            </div>

                            <div>
                              {item.fulfillmentStatus === "COMPLETED" && (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                  COMPLETED
                                </span>
                              )}
                              {item.fulfillmentStatus === "FULFILLED" && (
                                <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800">
                                  APPROVED
                                </span>
                              )}
                              {item.fulfillmentStatus === "PENDING" && (
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                  PENDING
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* PRODUKSI WARNING */}
                  {productionItems.length > 0 && (
                    <div
                      className={`mx-4 mb-3 rounded-lg px-4 py-3 text-xs ${
                        canApprove
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {!canApprove ? (
                        <>
                          <div className="flex items-center gap-2 mb-2 font-semibold">
                            <span className="text-base">⏳</span>
                            <span>Produksi belum selesai</span>
                          </div>

                          <div className="space-y-1">
                            {unfinishedProduction.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between bg-white/60 rounded-md px-3 py-1.5"
                              >
                                <span className="text-gray-700">
                                  {item.namaBarang}
                                </span>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  {item.fulfillmentStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 font-semibold">
                          <span className="text-base">✅</span>
                          <span>Semua item produksi sudah COMPLETED</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACTION */}
                  <div className="px-4 py-3 border-t flex justify-end">
                    {isApproved ? (
                      <span className="text-xs text-gray-500 italic">
                        Sudah di-approve
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApprove(spk)}
                        disabled={!spk.canApprove || submittingId === spk.id}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                          !spk.canApprove || submittingId === spk.id
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {submittingId === spk.id ? "Memproses..." : "Approve"}
                      </button>
                    )}
                  </div>
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
