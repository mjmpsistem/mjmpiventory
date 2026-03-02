"use client";

import { useEffect, useState } from "react";
import { getProductionEfficiency } from "@/app/actions/dashboard-analytics";
import { PieChart, ArrowRight, Loader2 } from "lucide-react";

interface EfficiencyData {
  input: number;
  output: number;
  waste: number;
}

export function ProductionEfficiencyChart({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const [data, setData] = useState<EfficiencyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await getProductionEfficiency(dateFrom, dateTo);
      if (res.success && res.data) {
        setData(res.data);
      }
      setLoading(false);
    }
    fetchData();
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
       <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-center h-full min-h-[250px]">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) return null;

  const total = data.input + data.output + data.waste;
  
  // Calculate percentages (avoid division by zero)
  const inputPct = total > 0 ? (data.input / total) * 100 : 0;
  const outputPct = total > 0 ? (data.output / total) * 100 : 0;
  const wastePct = total > 0 ? (data.waste / total) * 100 : 0;

  // Simple Yield Calculation: Output / Input
  const yieldRate = data.input > 0 ? (data.output / data.input) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
       <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-white flex items-center gap-3 border-b border-purple-100">
        <div className="p-2 rounded-xl bg-purple-100">
          <PieChart className="text-purple-600" size={20} />
        </div>
        <div>
           <h3 className="font-semibold text-gray-900">Efisiensi Produksi</h3>
           <p className="text-xs text-gray-500">Input Bahan vs Output & Waste</p>
        </div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col justify-center">
         {/* Yield Score Big Display */}
         <div className="text-center mb-6">
             <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">Production Yield</span>
             <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`text-4xl font-bold ${yieldRate >= 90 ? 'text-green-600' : yieldRate >= 70 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {yieldRate.toFixed(1)}%
                </span>
             </div>
             <p className="text-xs text-gray-400 mt-1">Rasio Output Barang Jadi dibanding Input Bahan</p>
         </div>

         {/* Bar Visual */}
         <div className="space-y-4">
             {/* Input Bar */}
             <div className="space-y-1">
                 <div className="flex justify-between text-xs font-medium text-gray-600">
                     <span>Input (Bahan Baku)</span>
                     <span>{data.input.toLocaleString()} Kg</span>
                 </div>
                 <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
                 </div>
             </div>
             
             <div className="flex justify-center -my-2">
                 <ArrowRight size={14} className="text-gray-300 rotate-90" />
             </div>

             {/* Split Output/Waste */}
             <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <div className="text-xs font-medium text-green-700">Output (Jadi)</div>
                     <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                         <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (data.output/data.input)*100)}%` }}></div>
                     </div>
                     <div className="text-right text-xs text-gray-500">{data.output.toLocaleString()} Kg</div>
                 </div>

                 <div className="space-y-1">
                     <div className="text-xs font-medium text-red-700">Waste (Sisa)</div>
                     <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                         <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (data.waste/data.input)*100)}%` }}></div>
                     </div>
                     <div className="text-right text-xs text-gray-500">{data.waste.toLocaleString()} Kg</div>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
}
