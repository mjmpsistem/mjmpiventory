/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

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

  useEffect(() => {
    fetchItemTypes();
  }, []);

  useEffect(() => {
    if (filterCategory === "ALL") {
      setFilteredItemTypes(itemTypes);
    } else {
      setFilteredItemTypes(
        itemTypes.filter((item) => item.category === filterCategory)
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
      alert("Pilih kategori jenis barang");
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
        setShowModal(false);
        setEditingItemType(null);
        setName("");
        setCategory("");
        fetchItemTypes();
      } else {
        const data = await res.json();
        alert(data.error || "Terjadi kesalahan");
      }
    } catch (_) {
      alert("Terjadi kesalahan");
    }
  };

  const handleEdit = (itemType: ItemType) => {
    setEditingItemType(itemType);
    setName(itemType.name);
    setCategory(itemType.category);
    setShowModal(true);
  };

  const handleToggleActive = async (itemType: ItemType) => {
    if (
      !confirm(
        `Yakin ingin ${
          itemType.isActive ? "nonaktifkan" : "aktifkan"
        } jenis barang ini?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/item-types/${itemType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemType.name,
          category: itemType.category,
          isActive: !itemType.isActive,
        }),
      });

      if (res.ok) {
        fetchItemTypes();
      } else {
        const data = await res.json();
        alert(data.error || "Terjadi kesalahan");
      }
    } catch (_) {
      alert("Terjadi kesalahan");
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
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="ALL">Semua Kategori</option>
              <option value={ItemCategory.BAHAN_BAKU}>Bahan Baku</option>
              <option value={ItemCategory.BARANG_JADI}>Barang Jadi</option>
            </select>
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
                  filteredItemTypes.map((itemType, index) => (
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
      </div>
    </Layout>
  );
}
