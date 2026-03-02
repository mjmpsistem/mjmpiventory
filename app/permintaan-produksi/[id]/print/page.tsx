"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import PDFTemplate from "@/components/pdf/PDFTemplate";

/* ===================== TYPES ===================== */
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
  spk: {
    lead: {
      nama_toko: string;
      alamat_toko: string;
      no_telp: string;
    };
    spkItems: {
      id: string;
      namaBarang: string;
      qty: number;
      satuan: string;
      salesOrder?: {
        spesifikasi_tambahan?: string;
      };
    }[];
  };
}

/* ===================== PAGE ===================== */
export default function PrintProductionRequestPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<ProductionRequest | null>(null);
  const [loading, setLoading] = useState(true);

  /* ===== FETCH ===== */
  useEffect(() => {
    if (!params?.id) return;

    const fetchRequest = async () => {
      try {
        const res = await fetch(`/api/production-requests/${params.id}`);
        if (!res.ok) throw new Error("Failed fetch");

        const data = await res.json();
        setRequest(data.request || data.productionRequest);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [params?.id]);

  /* ===== AUTO PRINT ===== */
  useEffect(() => {
    if (request?.status === "APPROVED") {
      setTimeout(() => window.print(), 500);
    }
  }, [request]);

  /* ===================== STATES ===================== */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Memuat data…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">Data tidak ditemukan</p>
      </div>
    );
  }

  if (request.status !== "APPROVED") {
    return (
      <div className="flex min-h-screen items-center justify-center text-center">
        <div>
          <p className="font-semibold text-red-600">
            Permintaan produksi belum di-approve
          </p>
          <p className="text-sm text-gray-600">
            Dokumen hanya bisa dicetak setelah approval
          </p>
        </div>
      </div>
    );
  }

  /* ===================== RENDER ===================== */

  const docNumber = `PR-${request.spkNumber.replace("SPK/", "")}`;

  return (
    <PDFTemplate
      title="PERMINTAAN PRODUKSI"
      companyName={request.spk?.lead?.nama_toko || "PT Maju Jaya Mitra Plastindo"}
      companyAddress={request.spk?.lead?.alamat_toko || "Komplek Pergudangan Meiko Abadi 7 Blok E18 dan 19."}
      companyPhone={`Telp: ${request.spk?.lead?.no_telp || "-"}`}
      logoSrc="/assets/template.png"
      documentInfo={{
        date: formatDate(request.createdAt),
        documentNumber: docNumber,
        status: request.status,
      }}
      showSignature
      signatureLeft={{
        label: "Disetujui oleh,",
        name: "Admin Produksi",
      }}
      signatureRight={{
        label: "Dibuat oleh,",
        name: request.user.name,
      }}
    >
      {/* ================= BARANG YANG DIKERJAKAN ================= */}
      <div className="mb-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-800">
          Produk yang Dikerjakan
        </p>

        <div className="space-y-3">
          {request.spk?.spkItems?.length ? (
            request.spk.spkItems.map((item) => (
              <div key={item.id}>
                <p className="text-sm font-medium text-gray-900">
                  {item.qty} {item.satuan} – {item.namaBarang}
                </p>

                {item.salesOrder?.spesifikasi_tambahan && (
                  <p className="mt-0.5 text-xs text-gray-600">
                    Spesifikasi:{" "}
                    <span className="italic">
                      {item.salesOrder.spesifikasi_tambahan}
                    </span>
                  </p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm font-medium text-gray-900">
              {request.productName}
            </p>
          )}
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="mb-6">
        <h2 className="mb-3 font-semibold">Bahan Baku yang Dibutuhkan</h2>

        <table className="w-full border-collapse border border-gray-800 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 w-10">No</th>
              <th className="border px-2 py-1">Kode</th>
              <th className="border px-2 py-1">Nama Barang</th>
              <th className="border px-2 py-1 w-20">Qty</th>
              <th className="border px-2 py-1 w-24">Satuan</th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item, idx) => (
              <tr key={item.id}>
                <td className="border px-2 py-1 text-center">{idx + 1}</td>
                <td className="border px-2 py-1 font-mono">{item.item.code}</td>
                <td className="border px-2 py-1">{item.item.name}</td>
                <td className="border px-2 py-1 text-center">
                  {item.quantity.toLocaleString("id-ID")}
                </td>
                <td className="border px-2 py-1">{item.item.unit.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MEMO ================= */}
      {request.memo && (
        <div className="mt-4">
          <p className="mb-2 font-semibold">Keterangan / Memo</p>
          <div className="whitespace-pre-line rounded border bg-gray-50 p-3 text-sm">
            {request.memo}
          </div>
        </div>
      )}
    </PDFTemplate>
  );
}
