/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { toast } from "react-toastify";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Tag, Plus, Edit2, Power, X, Filter } from "lucide-react";
import { ItemCategory } from "@/lib/constants";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

interface ItemType {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
}

export default function JenisBarangPage() {
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [filteredItemTypes, setFilteredItemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItemType, setEditingItemType] = useState<ItemType | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalItems = filteredItemTypes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [confirmItem, setConfirmItem] = useState<ItemType | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  useEffect(() => {
    let data = [...itemTypes];

    // filter kategori
    if (filterCategory !== "ALL") {
      data = data.filter((item) => item.category === filterCategory);
    }

    // filter status
    if (filterStatus !== "ALL") {
      data = data.filter((item) =>
        filterStatus === "ACTIVE" ? item.isActive : !item.isActive,
      );
    }

    // search nama
    if (search.trim()) {
      data = data.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      );
    }

    setFilteredItemTypes(data);
    setCurrentPage(1);
  }, [itemTypes, filterCategory, filterStatus, search]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedItemTypes = filteredItemTypes.slice(startIndex, endIndex);

  useEffect(() => {
    fetchItemTypes();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory]);

  useEffect(() => {
    if (filterCategory === "ALL") {
      setFilteredItemTypes(itemTypes);
    } else {
      setFilteredItemTypes(
        itemTypes.filter((item) => item.category === filterCategory),
      );
    }
  }, [filterCategory, itemTypes]);

  const fetchItemTypes = async (isRefetch = false) => {
    try {
      isRefetch ? setRefetching(true) : setLoading(true);
      const res = await fetch("/api/item-types?includeInactive=true");
      const data = await res.json();
      setItemTypes(data.itemTypes || []);
    } catch (error) {
      console.error(error);
    } finally {
      isRefetch ? setRefetching(false) : setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category && !editingItemType) {
      toast.error("Pilih kategori jenis barang");
      return;
    }
    try {
      const url = editingItemType
        ? `/api/item-types/${editingItemType.id}`
        : "/api/item-types";
      const method = editingItemType ? "PUT" : "POST";

      const body: any = { name };
      // Hanya kirim category saat tambah baru, tidak saat edit
      if (!editingItemType && category) {
        body.category = category;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(
          editingItemType
            ? "Jenis barang berhasil diperbarui ✨"
            : "Jenis barang berhasil ditambahkan 🎉",
        );

        setShowModal(false);
        setEditingItemType(null);
        setName("");
        setCategory("");
        fetchItemTypes();
      } else {
        const data = await res.json();
        toast.error(data.error || "Terjadi kesalahan");
      }
    } catch (_) {
      toast.error("Terjadi kesalahan");
    }
  };

  const handleEdit = (itemType: ItemType) => {
    setEditingItemType(itemType);
    setName(itemType.name);
    setCategory(itemType.category);
    setShowModal(true);
  };

  const handleToggleActive = (itemType: ItemType) => {
    setConfirmItem(itemType);
  };

  const confirmToggleActive = async () => {
    if (!confirmItem) return;

    try {
      const res = await fetch(`/api/item-types/${confirmItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: confirmItem.name,
          category: confirmItem.category,
          isActive: !confirmItem.isActive,
        }),
      });

      if (res.ok) {
        toast.success(
          `Jenis barang berhasil ${
            confirmItem.isActive ? "dinonaktifkan" : "diaktifkan"
          }`,
        );

        setConfirmItem(null);
        fetchItemTypes();
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={() => {
              setEditingItemType(null);
              setName("");
              setCategory("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            <Plus size={18} />
            Tambah Jenis Barang
          </button>

          {/* Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* SEARCH */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama jenis barang..."
              className="
      px-4 py-2
      border border-gray-300
      rounded-lg
      w-53
      focus:ring-2 focus:ring-blue-500
      focus:border-blue-500
    "
            />

            {/* FILTER KATEGORI */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="ALL">Semua Kategori</option>
              <option value={ItemCategory.BAHAN_BAKU}>Bahan Baku</option>
              <option value={ItemCategory.BARANG_JADI}>Barang Jadi</option>
            </select>

            {/* FILTER STATUS */}
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
              }
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Tidak Aktif</option>
            </select>
          </div>
        </div>

        {/* Pagination Bar */}
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
            {/* Rows per page */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
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

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Nama Jenis Barang
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Kategori
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading || refetching ? (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <SkeletonTable rows={8} cols={4} />
                    </td>
                  </tr>
                ) : filteredItemTypes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <Tag className="mx-auto text-gray-400 mb-3" size={48} />
                      <p className="text-gray-700 font-medium">
                        Tidak ada data jenis barang
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {filterCategory !== "ALL"
                          ? `Tidak ada data untuk kategori ${
                              filterCategory === ItemCategory.BAHAN_BAKU
                                ? "Bahan Baku"
                                : "Barang Jadi"
                            }`
                          : "Klik Tambah Jenis Barang untuk menambahkan data"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedItemTypes.map((itemType, index) => (
                    <tr
                      key={itemType.id}
                      className={`
          transition-colors
          ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
          hover:bg-blue-50/40
          ${!itemType.isActive ? "opacity-60" : ""}
        `}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {itemType.name}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            itemType.category === ItemCategory.BAHAN_BAKU
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {itemType.category === ItemCategory.BAHAN_BAKU
                            ? "Bahan Baku"
                            : "Barang Jadi"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                            itemType.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {itemType.isActive ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(itemType)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>

                          <button
                            onClick={() => handleToggleActive(itemType)}
                            className={`p-2 rounded-lg transition-colors ${
                              itemType.isActive
                                ? "text-red-600 hover:bg-red-100"
                                : "text-green-600 hover:bg-green-100"
                            }`}
                            title={
                              itemType.isActive ? "Nonaktifkan" : "Aktifkan"
                            }
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h3 className="text-xl font-bold">
                  {editingItemType
                    ? "Edit Jenis Barang"
                    : "Tambah Jenis Barang Baru"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingItemType(null);
                    setName("");
                  }}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {!editingItemType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori *
                    </label>
                    <select
                      required={!editingItemType}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Pilih Kategori</option>
                      <option value={ItemCategory.BAHAN_BAKU}>
                        Bahan Baku
                      </option>
                      <option value={ItemCategory.BARANG_JADI}>
                        Barang Jadi
                      </option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Jenis Barang *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: Biji Plastik, Biji Sedotan, Pigmen Plastik, dll"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItemType(null);
                      setName("");
                      setCategory("");
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                  >
                    {editingItemType ? "Update" : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Konfirmasi
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Yakin ingin{" "}
                <span className="font-semibold">
                  {confirmItem.isActive ? "menonaktifkan" : "mengaktifkan"}
                </span>{" "}
                jenis barang <b>{confirmItem.name}</b>?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmItem(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={confirmToggleActive}
                  className={`px-4 py-2 rounded-lg text-white font-medium ${
                    confirmItem.isActive
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
