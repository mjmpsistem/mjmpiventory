/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PackagePlus, Filter } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";

interface Transaction {
  id: string;
  date: string;
  item: {
    name: string;
    code: string;
    unit: { name: string };
  };
  quantity: number;
  price: number | null;
  vendor: string | null;
  memo: string;
  user: { name: string };
}

export default function LaporanBarangMasukPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterItemId, setFilterItemId] = useState("");

  useEffect(() => {
    fetchTransactions();
    fetchItems();
  }, [startDate, endDate, filterItemId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = "/api/transactions?type=MASUK";
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
      if (filterItemId) url += `&itemId=${filterItemId}`;

      const res = await fetch(url);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    const res = await fetch("/api/items?isActive=true");
    const data = await res.json();
    setItems(data.items || []);
  };

  const totalQuantity = transactions.reduce((sum, tx) => sum + tx.quantity, 0);

  const totalValue = transactions.reduce(
    (sum, tx) => sum + tx.quantity * (tx.price || 0),
    0
  );

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <Breadcrumb />
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl p-5 shadow">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-80">Total Quantity Masuk</p>
                <p className="text-xl font-bold">
                  {totalQuantity.toLocaleString("id-ID")}
                </p>
              </div>
              <PackagePlus size={32} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-5 shadow">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-80">Total Nilai Barang</p>
                <p className="text-xl font-bold">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <PackagePlus size={32} className="opacity-80" />
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter size={16} />
            Filter Data
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barang
              </label>
              <select
                value={filterItemId}
                onChange={(e) => setFilterItemId(e.target.value)}
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Semua Barang</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setFilterItemId("");
                }}
                className="w-full h-10 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Memuat data transaksi...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Data transaksi tidak ditemukan
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Tanggal",
                    "Barang",
                    "Qty",
                    "Harga",
                    "Total",
                    "Vendor",
                    "Memo",
                    "User",
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
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {tx.item.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {tx.quantity} {tx.item.unit.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-500">
                      {tx.price ? formatCurrency(tx.price) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-500">
                      {tx.price ? formatCurrency(tx.quantity * tx.price) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tx.vendor || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {tx.memo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tx.user.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
