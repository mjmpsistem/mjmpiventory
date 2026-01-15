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
  reservedStock: number;
  hargaSatuan?: number | null;
  transactions?: Array<{ quantity: number; price: number | null }>;
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

  const calculateWeightedAveragePrice = (item: Item): number => {
    if (!item.transactions || item.transactions.length === 0) {
      return 0;
    }

    let totalValue = 0;
    let totalQuantity = 0;

    for (const tx of item.transactions) {
      if (tx.price && tx.price > 0 && tx.quantity > 0) {
        totalValue += tx.quantity * tx.price;
        totalQuantity += tx.quantity;
      }
    }

    if (totalQuantity > 0) {
      const avgPrice = totalValue / totalQuantity;
      // Round to 2 decimal places to avoid floating point errors
      return Math.round(avgPrice * 100) / 100;
    }

    return 0;
  };

  const getUnitPrice = (item: Item): number => {
    if (item.hargaSatuan && item.hargaSatuan > 0) {
      return item.hargaSatuan;
    }
    return calculateWeightedAveragePrice(item);
  };

  const calculateTotalValue = () =>
    items.reduce((total, item) => {
      const unitPrice = getUnitPrice(item);
      return total + item.currentStock * unitPrice;
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
                    "Stok Fisik",
                    "Reserved",
                    "Stok Tersedia",
                    "Min",
                    "Harga Satuan",
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
                  const unitValue = getUnitPrice(item);
                  // Round stock value to avoid floating point errors
                  const stockValue =
                    Math.round(item.currentStock * unitValue * 100) / 100;
                  const isLowStock = item.currentStock < item.stockMinimum;
                  const availableStock = item.currentStock - item.reservedStock;

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
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.reservedStock} {item.unit.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {availableStock} {item.unit.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.stockMinimum} {item.unit.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(unitValue)}
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
