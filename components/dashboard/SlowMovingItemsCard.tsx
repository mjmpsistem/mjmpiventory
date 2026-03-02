"use client";

import { useEffect, useState } from "react";
import { getSlowMovingItems } from "@/app/actions/dashboard-analytics";
import { AlertTriangle, TrendingDown, Loader2, PackageX } from "lucide-react";

interface SlowItem {
  id: string;
  code: string;
  name: string;
  stock: number;
  unit: string;
  totalOut90Days: number;
}

export function SlowMovingItemsCard() {
  const [items, setItems] = useState<SlowItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await getSlowMovingItems();
      if (res.success && res.data) {
        setItems(res.data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
     return (
       <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-center h-full min-h-[250px]">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
       <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-white flex items-center gap-3 border-b border-red-100">
        <div className="p-2 rounded-xl bg-red-100">
          <PackageX className="text-red-600" size={20} />
        </div>
        <div>
           <h3 className="font-semibold text-gray-900">Slow Moving Items</h3>
           <p className="text-xs text-gray-500">Jarang keluar {">"} 90 Hari</p>
        </div>
      </div>

       <div className="flex-1 p-0 overflow-hidden">
        {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                <div className="bg-green-50 text-green-600 p-3 rounded-full mb-2">
                    <TrendingDown size={24} />
                </div>
                <p className="text-sm font-medium text-gray-900">Stok Sehat!</p>
                <p className="text-xs text-gray-500">Tidak ada barang penumpukan stok.</p>
            </div>
        ) : (
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                    <tr>
                        <th className="px-6 py-3">Barang</th>
                        <th className="px-6 py-3 text-right">Stok</th>
                        <th className="px-6 py-3 text-right">Keluar (90d)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition">
                            <td className="px-6 py-3">
                                <div className="font-medium text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500">{item.code}</div>
                            </td>
                            <td className="px-6 py-3 text-right">
                                <span className="font-semibold text-gray-700">{item.stock}</span> <span className="text-xs text-gray-400">{item.unit}</span>
                            </td>
                            <td className="px-6 py-3 text-right">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                                   {item.totalOut90Days} {item.unit}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
       </div>
    </div>
  );
}
