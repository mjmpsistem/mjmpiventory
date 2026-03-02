"use client";

import { Recycle, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getWasteDashboardSummary } from "@/app/actions/dashboard-waste";
import { motion } from "framer-motion";

interface WasteSummary {
  totalWeight: number;
  breakdown: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  recentRecycled: {
    id: string;
    date: Date;
    itemName: string;
    quantity: number;
    unit: string;
    user: string;
  }[];
}

export function WasteSummaryCard({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const [data, setData] = useState<WasteSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        // Only show loading if no data previously or it feels like a refresh
        setLoading(true); 
        const res = await getWasteDashboardSummary(dateFrom, dateTo);
        if (res.success && res.data) {
            setData(res.data);
        }
        setLoading(false);
    }
    fetchData();
  }, [dateFrom, dateTo]);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-center h-full min-h-[200px]">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden h-full flex flex-col"
    >
      <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-white flex items-center gap-3 border-b border-green-100">
        <div className="p-2 rounded-xl bg-green-100/80">
          <Recycle className="text-green-600" size={20} />
        </div>
        <div>
           <h3 className="font-semibold text-gray-900">Monitoring Waste</h3>
           <p className="text-xs text-gray-500">Sisa produksi siap daur ulang</p>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-6">
         {/* Total Information */}
         <div className="flex items-center justify-between bg-green-50/50 p-4 rounded-xl border border-green-100">
            <div>
                 <p className="text-sm text-gray-500 font-medium">Total Waste Tersedia</p>
                 <p className="text-2xl font-bold text-gray-900 mt-1">{data.totalWeight.toLocaleString("id-ID")} <span className="text-sm font-normal text-gray-500">Kg</span></p>
            </div>
            <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <TrendingUp size={12} /> Live Data
                </span>
            </div>
         </div>

         {/* Breakdown List */}
         <div className="space-y-3 flex-1">
            <p className="text-sm font-semibold text-gray-700">Rincian Per Item:</p>
            {data.breakdown.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm italic">
                    Belum ada sisa produksi.
                </div>
            ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {data.breakdown.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50 transition">
                            <span className="text-gray-600 truncate flex-1 pr-2" title={item.name}>{item.name}</span>
                            <span className="font-semibold text-gray-900 whitespace-nowrap">{item.quantity} {item.unit}</span>
                        </div>
                    ))}
                    {data.breakdown.length > 5 && (
                         <div className="text-center pt-1">
                             <span className="text-xs text-blue-500 cursor-pointer hover:underline">Lihat semua ({data.breakdown.length})</span>
                         </div>
                    )}
                </div>
            )}
         </div>

         {/* Alert / Insight if high waste */}
         {data.totalWeight > 1000 && (
             <div className="flex gap-2 items-start text-xs bg-orange-50 text-orange-700 p-3 rounded-lg border border-orange-100 mt-auto">
                 <AlertCircle size={14} className="mt-0.5 shrink-0" />
                 <p>Stok waste cukup tinggi. Pertimbangkan untuk melakukan daur ulang segera untuk efisiensi ruang gudang.</p>
             </div>
         )}
      </div>
    </motion.div>
  );
}
