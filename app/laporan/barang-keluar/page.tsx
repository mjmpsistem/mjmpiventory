"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { formatDate } from "@/lib/utils";
import { Filter, PackageMinus } from "lucide-react";
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
  destination: string | null;
  spkNumber: string | null;
  memo: string;
  user: { name: string };
}

export default function LaporanBarangKeluarPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterSpk, setFilterSpk] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate, filterSpk]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = "/api/transactions?type=KELUAR";
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      const data = await res.json();

      let filtered = data.transactions || [];
      if (filterSpk) {
        filtered = filtered.filter((tx: Transaction) =>
          tx.spkNumber?.toLowerCase().includes(filterSpk.toLowerCase())
        );
      }

      setTransactions(filtered);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalQuantity = transactions.reduce((sum, tx) => sum + tx.quantity, 0);

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8 space-y-6">
        <Breadcrumb />
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl p-5 shadow">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-80">Total Quantity Keluar</p>
                <p className="text-xl font-bold">
                  {totalQuantity.toLocaleString("id-ID")}
                </p>
              </div>
              <PackageMinus size={32} className="opacity-80" />
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
                Nomor SPK
              </label>
              <input
                type="text"
                value={filterSpk}
                onChange={(e) => setFilterSpk(e.target.value)}
                placeholder="Cari SPK"
                className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setFilterSpk("");
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
                    "Tujuan",
                    "SPK",
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
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tx.destination || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {tx.spkNumber || "-"}
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
