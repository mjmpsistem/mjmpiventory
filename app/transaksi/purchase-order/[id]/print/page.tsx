"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import PDFTemplate from "@/components/pdf/PDFTemplate";

interface PurchaseOrderItem {
  id: string;
  namaBarang: string;
  ukuran: string | null;
  qty: number;
  satuan: string;
  noticeMerkJenis: string | null;
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

export default function PrintPurchaseOrderPage() {
  const params = useParams();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPO();
    }
  }, [params.id]);

  useEffect(() => {
    if (po) {
      // Auto print when page loads
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [po]);

  const fetchPO = async () => {
    try {
      const res = await fetch(`/api/purchase-orders/${params.id}`);
      const data = await res.json();
      setPO(data.purchaseOrder);
    } catch (error) {
      console.error("Error fetching PO:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Purchase Order tidak ditemukan</p>
      </div>
    );
  }

  const total = po.items.reduce((sum, item) => sum + item.subTotal, 0);

  return (
    <PDFTemplate
      title="PURCHASE ORDER"
      subtitle={`Nomor: ${po.nomorPO}`}
      companyName="PT. NAMA PERUSAHAAN"
      companyAddress="Alamat Perusahaan"
      companyPhone="Telp: 021-xxxxxxx"
      showSignature={true}
      signatureLeft={{
        label: "Penerima,",
        name: po.kepada,
      }}
      signatureRight={{
        label: "Hormat Kami,",
        name: po.hormatKami || "PT. NAMA PERUSAHAAN",
      }}
      footer={
        <>
          <p>Dibuat oleh: {po.user.name}</p>
          <p>Tanggal dibuat: {formatDate(po.tanggal)}</p>
        </>
      }
    >
      {/* PO Details */}
      <div className="mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Kepada:</p>
            <p className="text-sm">{po.kepada}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Tanggal:</p>
            <p className="text-sm">{formatDate(po.tanggal)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Jatuh Tempo:</p>
            <p className="text-sm">{formatDate(po.jatuhTempo)}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border-2 border-gray-800">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                No
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                Nama Barang
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                Ukuran
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-sm">
                QTY
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                Satuan
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                Notice/Merk/Jenis
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-right font-bold text-sm">
                Sub Total
              </th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item, index) => (
              <tr key={item.id}>
                <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm">
                  {index + 1}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-sm">
                  {item.namaBarang}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-sm">
                  {item.ukuran || "-"}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm">
                  {item.qty.toLocaleString("id-ID")}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-sm">
                  {item.satuan}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-sm">
                  {item.noticeMerkJenis || "-"}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-right text-sm">
                  {formatCurrency(item.subTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td
                colSpan={6}
                className="border-2 border-gray-800 px-4 py-3 text-right text-sm"
              >
                TOTAL:
              </td>
              <td className="border-2 border-gray-800 px-4 py-3 text-right text-lg">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Additional Notes */}
      {po.keteranganTambahan && (
        <div className="mb-6">
          <p className="font-semibold mb-2 text-sm">Keterangan Tambahan:</p>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <p className="text-sm whitespace-pre-line">{po.keteranganTambahan}</p>
          </div>
        </div>
      )}
    </PDFTemplate>
  );
}
