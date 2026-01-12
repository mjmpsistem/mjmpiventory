"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Filter, Package } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  itemType: { name: string };
  unit: { name: string };
  stockMinimum: number;
  currentStock: number;
  transactions?: Array<{ price: number | null }>;
}

export default function LaporanStokPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [filterCategory, showLowStock]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = "/api/items?isActive=true";
      if (filterCategory) url += `&category=${filterCategory}`;

      const res = await fetch(url);
      const data = await res.json();

      let filteredItems = data.items || [];
      if (showLowStock) {
        filteredItems = filteredItems.filter(
          (item: Item) => item.currentStock < item.stockMinimum
        );
      }

      setItems(filteredItems);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalValue = () =>
    items.reduce((total, item) => {
      const lastPrice = item.transactions?.[0]?.price || 0;
      return total + item.currentStock * lastPrice;
    }, 0);

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <Breadcrumb />
        {/* Header */}
        {/* Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-5 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Nilai Stok</p>
                <p className="text-xl font-bold">
                  {formatCurrency(calculateTotalValue())}
                </p>
              </div>
              <Package size={32} className="opacity-80" />
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter size={16} />
            Filter
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Kategori</option>
            <option value="BAHAN_BAKU">Bahan Baku</option>
            <option value="BARANG_JADI">Barang Jadi</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="flex items-center gap-1">
              <AlertTriangle size={14} className="text-red-500" />
              Stok di bawah minimum
            </span>
          </label>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Memuat data stok...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Data stok tidak ditemukan
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Kode",
                    "Nama Barang",
                    "Jenis",
                    "Kategori",
                    "Stok",
                    "Min",
                    "Nilai Stok",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const lastPrice = item.transactions?.[0]?.price || 0;
                  const stockValue = item.currentStock * lastPrice;
                  const isLowStock = item.currentStock < item.stockMinimum;

                  return (
                    <tr key={item.id} className={isLowStock ? "bg-red-50" : ""}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.itemType.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {item.category === "BAHAN_BAKU"
                            ? "Bahan Baku"
                            : "Barang Jadi"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {item.currentStock} {item.unit.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.stockMinimum} {item.unit.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(stockValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
