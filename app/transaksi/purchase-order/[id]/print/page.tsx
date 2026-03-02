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
  status?: "APPROVED" | "PENDING";
  user: { name: string };
  items: PurchaseOrderItem[];
}

export default function PrintPurchaseOrderPage() {
  const params = useParams();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) fetchPO();
  }, [params.id]);

  useEffect(() => {
    if (po) {
      setTimeout(() => window.print(), 500);
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
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        Purchase Order tidak ditemukan
      </div>
    );
  }

  const total = po.items.reduce((sum, item) => sum + item.subTotal, 0);

  return (
    <PDFTemplate
      title="PURCHASE ORDER"
      companyAddress="Komplek Pergudangan Meiko Abadi 7 Blok E18 dan 19."
      companyPhone="Telp: 812-8931-9889"
      logoSrc="/assets/template.png"
      documentInfo={{
        documentNumber: po.nomorPO,
        date: formatDate(po.tanggal),
        status: po.status === "APPROVED" ? "Approved" : "Pending",
      }}
      showSignature
      signatureLeft={{
        label: "Penerima,",
        name: po.kepada,
      }}
      signatureRight={{
        label: "Hormat Kami,",
        name: po.hormatKami || "PT Maju Jaya Mitra Plastindo",
      }}
      footer={
        <>
          <p>Dibuat oleh: {po.user.name}</p>
          <p>Tanggal dibuat: {formatDate(po.tanggal)}</p>
        </>
      }
    >
      {/* Informasi PO */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-gray-700">Kepada</p>
          <p>{po.kepada}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Jatuh Tempo</p>
          <p>{formatDate(po.jatuhTempo)}</p>
        </div>
      </div>

      {/* Tabel Item */}
      <div className="mb-6">
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-center w-12">No</th>
              <th className="border px-3 py-2 text-left">Nama Barang</th>
              <th className="border px-3 py-2 text-left">Ukuran</th>
              <th className="border px-3 py-2 text-center">Qty</th>
              <th className="border px-3 py-2 text-left">Satuan</th>
              <th className="border px-3 py-2 text-left">Notice / Merk</th>
              <th className="border px-3 py-2 text-right">Sub Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item, i) => (
              <tr key={item.id} className="odd:bg-white even:bg-gray-50">
                <td className="border px-3 py-2 text-center">{i + 1}</td>
                <td className="border px-3 py-2">{item.namaBarang}</td>
                <td className="border px-3 py-2">{item.ukuran || "-"}</td>
                <td className="border px-3 py-2 text-center">
                  {item.qty.toLocaleString("id-ID")}
                </td>
                <td className="border px-3 py-2">{item.satuan}</td>
                <td className="border px-3 py-2">
                  {item.noticeMerkJenis || "-"}
                </td>
                <td className="border px-3 py-2 text-right">
                  {formatCurrency(item.subTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={6} className="border px-3 py-2 text-right">
                TOTAL
              </td>
              <td className="border px-3 py-2 text-right text-base">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Keterangan Tambahan */}
      {po.keteranganTambahan && (
        <div className="mt-6">
          <p className="font-semibold text-sm mb-2">Keterangan Tambahan</p>
          <div className="border border-gray-300 rounded-md p-4 bg-gray-50 text-sm whitespace-pre-line">
            {po.keteranganTambahan}
          </div>
        </div>
      )}
    </PDFTemplate>
  );
}
