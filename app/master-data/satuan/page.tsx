/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { toast } from "react-toastify";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Ruler, Plus, Edit2, Power, X } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

interface Unit {
  id: string;
  name: string;
  isActive: boolean;
}

const DEFAULT_UNITS = ["Kg", "Pcs", "Roll", "Ball", "Pack"];

export default function SatuanPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [name, setName] = useState("");
  const [confirmUnit, setConfirmUnit] = useState<Unit | null>(null);

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = units.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedUnits = units.slice(startIndex, endIndex);

  /* ================= FETCH ================= */
  const fetchUnits = async (isRefetch = false) => {
    try {
      isRefetch ? setRefetching(true) : setLoading(true);

      const res = await fetch("/api/units");
      const data = await res.json();

      const unitsArray = Array.isArray(data)
        ? data
        : Array.isArray(data.units)
          ? data.units
          : [];

      setUnits(unitsArray);

      if (unitsArray.length === 0 && !isRefetch) {
        await createDefaultUnits();
      }
    } catch (error) {
      console.error(error);
      setUnits([]);
    } finally {
      isRefetch ? setRefetching(false) : setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, units]);

  const createDefaultUnits = async () => {
    try {
      for (const unitName of DEFAULT_UNITS) {
        await fetch("/api/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: unitName }),
        });
      }
      await fetchUnits(true);
    } catch (error) {
      console.error(error);
    }
  };

  /* ================= ACTION ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingUnit ? `/api/units/${editingUnit.id}` : "/api/units";
      const method = editingUnit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        toast.success(
          editingUnit
            ? "Satuan berhasil diperbarui ✨"
            : "Satuan berhasil ditambahkan 🎉",
        );

        setShowModal(false);
        setEditingUnit(null);
        setName("");
        fetchUnits();
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setName(unit.name);
    setShowModal(true);
  };

  const handleToggleActive = (unit: Unit) => {
    setConfirmUnit(unit);
  };

  const confirmToggleActive = async () => {
    if (!confirmUnit) return;

    try {
      const res = await fetch(`/api/units/${confirmUnit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: confirmUnit.name,
          isActive: !confirmUnit.isActive,
        }),
      });

      if (res.ok) {
        toast.success(
          `Satuan berhasil ${
            confirmUnit.isActive ? "dinonaktifkan" : "diaktifkan"
          }`,
        );

        setConfirmUnit(null);
        fetchUnits();
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Breadcrumb />

        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => {
              setEditingUnit(null);
              setName("");
              setShowModal(true);
            }}
            className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-bold text-sm active:scale-95"
          >
            <Plus size={18} />
            Tambah Satuan
          </button>
        </div>

        {/* ================= PAGINATION BAR ================= */}
        <div
          className="
    flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
    px-6 py-4
    rounded-2xl
    bg-white/80 backdrop-blur
    border border-gray-200/60
    shadow-[0_8px_30px_rgb(0,0,0,0.04)]
  "
        >
          {/* LEFT — Data Info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">
              {totalItems === 0 ? 0 : startIndex + 1}–
              {Math.min(endIndex, totalItems)}
            </span>
            <span className="text-gray-400">of</span>
            <span className="text-gray-600">{totalItems} data</span>
          </div>

          {/* RIGHT — Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rows */}
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
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="
          h-9 w-9
          flex items-center justify-center
          rounded-xl
          border border-gray-200
          bg-white
          text-gray-600
          hover:bg-gray-100
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition
        "
              >
                «
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="
          h-9 w-9
          flex items-center justify-center
          rounded-xl
          border border-gray-200
          bg-white
          text-gray-600
          hover:bg-gray-100
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition
        "
              >
                ‹
              </button>

              {/* Page Indicator */}
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
                {currentPage}
                <span className="mx-1 opacity-70">/</span>
                {totalPages}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="
          h-9 w-9
          flex items-center justify-center
          rounded-xl
          border border-gray-200
          bg-white
          text-gray-600
          hover:bg-gray-100
          active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          transition
        "
              >
                ›
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="
          h-9 w-9
          flex items-center justify-center
          rounded-xl
          border border-gray-200
          bg-white
          text-gray-600
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

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                    Nama Satuan
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading || refetching ? (
                  <tr>
                    <td colSpan={3} className="p-0">
                      <SkeletonTable rows={8} cols={3} />
                    </td>
                  </tr>
                ) : paginatedUnits.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-16 text-center">
                      <Ruler className="mx-auto text-gray-400 mb-3" size={48} />
                      <p className="text-gray-700 font-medium">
                        Tidak ada data satuan
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Klik Tambah Satuan untuk menambahkan data
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUnits.map((unit, index) => (
                    <tr
                      key={unit.id}
                      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-blue-50/40 ${!unit.isActive ? "opacity-60" : ""}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {unit.name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            unit.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {unit.isActive ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(unit)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-100"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(unit)}
                            className={`p-2 rounded-lg ${
                              unit.isActive
                                ? "text-red-600 hover:bg-red-100"
                                : "text-green-600 hover:bg-green-100"
                            }`}
                          >
                            <Power size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= MODAL ================= */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h3 className="text-xl font-bold">
                  {editingUnit ? "Edit Satuan" : "Tambah Satuan Baru"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingUnit(null);
                    setName("");
                  }}
                  className="p-1 rounded-lg hover:bg-white/20"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Satuan *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Kg, Pcs, Roll"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingUnit(null);
                      setName("");
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg"
                  >
                    {editingUnit ? "Update" : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmUnit && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Konfirmasi
              </h3>

              <p className="text-sm text-gray-600 mb-6">
                Yakin ingin{" "}
                <span className="font-semibold">
                  {confirmUnit.isActive ? "menonaktifkan" : "mengaktifkan"}
                </span>{" "}
                satuan <b>{confirmUnit.name}</b>?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmUnit(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>

                <button
                  onClick={confirmToggleActive}
                  className={`px-4 py-2 rounded-lg text-white font-medium ${
                    confirmUnit.isActive
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
