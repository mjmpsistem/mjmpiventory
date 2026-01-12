"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import PDFTemplate from "@/components/pdf/PDFTemplate";

interface Item {
  id: string;
  code: string;
  name: string;
  unit: { name: string };
}

interface ProductionRequestItem {
  id: string;
  item: Item;
  quantity: number;
}

interface ProductionRequest {
  id: string;
  spkNumber: string;
  productName: string;
  status: string;
  memo: string;
  createdAt: string;
  user: { name: string };
  items: ProductionRequestItem[];
}

export default function PrintProductionRequestPage() {
  const params = useParams();
  const [request, setRequest] = useState<ProductionRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchRequest();
    }
  }, [params.id]);

  useEffect(() => {
    if (request && request.status === "APPROVED") {
      // Auto print when page loads (only for approved requests)
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [request]);

  const fetchRequest = async () => {
    try {
      const res = await fetch(`/api/production-requests/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setRequest(data.request || data.productionRequest);
      }
    } catch (error) {
      console.error("Error fetching production request:", error);
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

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Permintaan produksi tidak ditemukan</p>
      </div>
    );
  }

  if (request.status !== "APPROVED") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">
            Permintaan produksi belum di-approve
          </p>
          <p className="text-gray-600">
            Hanya permintaan yang sudah di-approve yang dapat dicetak
          </p>
        </div>
      </div>
    );
  }

  return (
    <PDFTemplate
      title="PERMINTAAN PRODUKSI"
      subtitle={`Nomor SPK: ${request.spkNumber}`}
      companyName="PT. NAMA PERUSAHAAN"
      companyAddress="Alamat Perusahaan"
      companyPhone="Telp: 021-xxxxxxx"
      showSignature={true}
      signatureLeft={{
        label: "Disetujui oleh,",
        name: "Admin Produksi",
      }}
      signatureRight={{
        label: "Dibuat oleh,",
        name: request.user.name,
      }}
      footer={
        <>
          <p>SPK: {request.spkNumber}</p>
          <p>Tanggal dibuat: {formatDate(request.createdAt)}</p>
          <p>Status: {request.status}</p>
        </>
      }
    >
      {/* Request Details */}
      <div className="mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Produk yang Dikerjakan:
            </p>
            <p className="text-sm">{request.productName}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Tanggal:</p>
            <p className="text-sm">{formatDate(request.createdAt)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Status:</p>
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {request.status}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Dibuat oleh:</p>
            <p className="text-sm">{request.user.name}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Bahan Baku yang Dibutuhkan</h2>
        <table className="w-full border-collapse border-2 border-gray-800">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                No
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                Kode Barang
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                Nama Barang
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-center font-bold text-sm">
                QTY
              </th>
              <th className="border-2 border-gray-800 px-4 py-3 text-left font-bold text-sm">
                Satuan
              </th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item, index) => (
              <tr key={item.id}>
                <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm">
                  {index + 1}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-sm font-mono">
                  {item.item.code}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-sm">
                  {item.item.name}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-center text-sm">
                  {item.quantity.toLocaleString("id-ID")}
                </td>
                <td className="border-2 border-gray-800 px-4 py-3 text-sm">
                  {item.item.unit.name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Memo */}
      {request.memo && (
        <div className="mb-6">
          <p className="font-semibold mb-2 text-sm">Keterangan / Memo:</p>
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
            <p className="text-sm whitespace-pre-line">{request.memo}</p>
          </div>
        </div>
      )}
    </PDFTemplate>
  );
}
