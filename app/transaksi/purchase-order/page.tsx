/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, X, Edit2, Trash2, Printer, FileText } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { SkeletonTable } from "@/components/ui/SkeletonTable";

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
  user: { name: string };
  items: PurchaseOrderItem[];
}

export default function PurchaseOrderPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [itemsLoading, setItemsLoading] = useState(false);

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
  }, [fetchPurchaseOrders]);

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
      alert("Mohon lengkapi data PO");
      return;
    }

    if (
      items.length === 0 ||
      items.some(
        (item) => !item.namaBarang || !item.satuan || item.subTotal === 0
      )
    ) {
      alert("Mohon lengkapi data item");
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
        setShowModal(false);
        resetForm();
        fetchPurchaseOrders();
      } else {
        const data = await res.json();
        alert(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
    }
  };

  const resetForm = () => {
    setEditingPO(null);
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
        }))
      );

      setItemsLoading(false); // ⬅️ MATIKAN SKELETON
    }, 300); // 200–400ms ideal
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus PO ini?")) return;

    try {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchPurchaseOrders();
      } else {
        const data = await res.json();
        alert(data.error || "Terjadi kesalahan");
      }
    } catch (error) {
      alert("Terjadi kesalahan");
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Date Range */}
            <div className="flex items-end gap-2">
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

            {/* Reset */}
            <button
              onClick={() => {
                setItemsLoading(false); // ⬅️ penting
                resetForm();
                setShowModal(true);
              }}
              className="h-10 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Reset
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action */}
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="h-10 inline-flex items-center gap-2 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-semibold"
            >
              <Plus size={18} />
              Tambah PO
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Nomor PO
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Kepada
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Jatuh Tempo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* ================= LOADING ================= */}
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <SkeletonTable rows={6} cols={7} />
                    </td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  /* ================= EMPTY ================= */
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <FileText
                        className="mx-auto text-gray-400 mb-3"
                        size={48}
                      />
                      <p className="text-gray-600 font-medium">
                        Tidak ada data Purchase Order
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Klik Tambah PO untuk menambahkan data
                      </p>
                    </td>
                  </tr>
                ) : (
                  /* ================= DATA ================= */
                  purchaseOrders.map((po) => {
                    const total = po.items.reduce(
                      (sum, item) => sum + item.subTotal,
                      0
                    );

                    return (
                      <tr
                        key={po.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {po.nomorPO}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.kepada}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(po.tanggal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(po.jatuhTempo)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {po.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handlePrint(po)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Printer size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(po)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(po.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={18} />
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
                                        e.target.value
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
                                        e.target.value
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
                                        parseFloat(e.target.value) || 0
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
                                        e.target.value
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
                                        e.target.value
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
                                        parseFloat(e.target.value) || 0
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
