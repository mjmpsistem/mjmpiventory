"use client";

import { ReactNode } from "react";

interface PDFTemplateProps {
  title: string;
  subtitle?: string;

  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;

  logoSrc?: string;

  documentInfo?: {
    date?: string;
    documentNumber?: string;
    status?: string;
  };

  children: ReactNode;
  footer?: ReactNode;

  showSignature?: boolean;
  signatureLeft?: {
    label: string;
    name: string;
  };
  signatureRight?: {
    label: string;
    name: string;
  };
}

/** helper warna status */
function getStatusStyle(status?: string) {
  const s = status?.toLowerCase();

  if (s?.includes("approve"))
    return "bg-green-50 text-green-700 border-green-300";
  if (s?.includes("pending"))
    return "bg-gray-100 text-gray-700 border-gray-300";
  if (s?.includes("reject") || s?.includes("tolak"))
    return "bg-red-50 text-red-700 border-red-300";
  if (s?.includes("progress"))
    return "bg-blue-50 text-blue-700 border-blue-300";

  return "bg-gray-50 text-gray-600 border-gray-300";
}

export default function PDFTemplate({
  title,
  subtitle,
  companyName = "PT Maju Jaya Mitra Plastindo",
  companyAddress = "Komplek Pergudangan Meiko Abadi 7 Blok E18 dan 19.",
  companyPhone = "812-8931-9889",
  logoSrc,
  documentInfo,
  children,
  footer,
  showSignature = false,
  signatureLeft,
  signatureRight,
}: PDFTemplateProps) {
  return (
    <div className="relative min-h-screen print:min-h-0 bg-white p-8 print:p-0 print:overflow-visible overflow-hidden font-sans">
      {/* ================= WATERMARK ================= */}
      {logoSrc && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <img
            src={logoSrc}
            alt="Watermark"
            className="w-[500px] opacity-[0.025]"
          />
        </div>
      )}

      {/* Print Button */}
      <div className="relative z-10 mb-6 print:hidden flex justify-end">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Cetak Dokumen
        </button>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto bg-white">
        {/* ================= HEADER ================= */}
        <div className="mb-8 relative pb-6">
          <div className="flex justify-between items-center mb-6">
             <div className="text-left">
                <h1 className="text-3xl font-black text-blue-900 tracking-tight leading-none uppercase mb-1">
                  {title}
                </h1>
                {documentInfo?.documentNumber && (
                  <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-100 uppercase tracking-widest">
                    {documentInfo.documentNumber}
                  </div>
                )}
             </div>
             {logoSrc && (
               <img src={logoSrc} alt="Logo" className="h-16 w-auto grayscale contrast-125" />
             )}
          </div>

          <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-transparent" />
          {subtitle && <p className="mt-2 text-sm text-blue-600/70 font-medium italic">{subtitle}</p>}
        </div>

        {/* ================= INFO BAR ================= */}
        <div className="mb-10 grid grid-cols-2 gap-8 text-sm">
          {/* LEFT: COMPANY INFO */}
          <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
            <p className="font-bold text-gray-900 text-base mb-1">{companyName}</p>
            <p className="text-gray-500 leading-relaxed max-w-xs">{companyAddress}</p>
            <div className="mt-2 pt-2 border-t border-gray-200/50 flex items-center gap-2 text-blue-600 font-medium">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
               </svg>
               {companyPhone}
            </div>
          </div>

          {/* RIGHT: DOCUMENT INFO */}
          <div className="flex flex-col items-end justify-center pr-4">
            <div className="text-right mb-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Tanggal Dokumen</p>
              <p className="text-lg font-bold text-gray-900">{documentInfo?.date ?? "-"}</p>
            </div>

            <div className={`px-4 py-1.5 rounded-full border shadow-sm text-xs font-black uppercase tracking-wider ${getStatusStyle(documentInfo?.status)}`}>
              {documentInfo?.status ?? "-"}
            </div>
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="mb-16 text-gray-800">
          <div className="prose prose-sm max-w-none">
            {children}
          </div>
        </div>

        {/* ================= SIGNATURE ================= */}
        {showSignature && (signatureLeft || signatureRight) && (
          <div className="mt-12 grid grid-cols-2 gap-12">
            {signatureLeft && (
              <div className="text-center">
                <p className="mb-20 text-xs font-bold uppercase tracking-widest text-gray-400">
                  {signatureLeft.label}
                </p>
                <div className="mx-auto w-56 space-y-1">
                  <p className="text-sm font-black text-gray-900 underline underline-offset-4 decoration-blue-500/30">
                    {signatureLeft.name}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Petugas Terkait</p>
                </div>
              </div>
            )}

            {signatureRight && (
              <div className="text-center">
                <p className="mb-20 text-xs font-bold uppercase tracking-widest text-gray-400">
                  {signatureRight.label}
                </p>
                <div className="mx-auto w-56 space-y-1">
                  <p className="text-sm font-black text-gray-900 underline underline-offset-4 decoration-blue-500/30">
                    {signatureRight.name}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Pembuat Dokumen</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= FOOTER ================= */}
        {footer ? (
          <div className="mt-16 border-t border-gray-100 pt-6 text-[10px] text-gray-400 uppercase tracking-widest text-center font-bold">
            {footer}
          </div>
        ) : (
          <div className="mt-16 pt-6 text-[10px] text-gray-300 italic text-center border-t border-dashed border-gray-200">
            Dokumen ini dihasilkan secara otomatis oleh JMP Inventory System pada {new Date().toLocaleString('id-ID')}
          </div>
        )}
      </div>
    </div>
  );
}
