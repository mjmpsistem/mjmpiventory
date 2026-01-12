"use client";

import { ReactNode } from "react";

interface PDFTemplateProps {
  title: string;
  subtitle?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
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

export default function PDFTemplate({
  title,
  subtitle,
  companyName = "PT. NAMA PERUSAHAAN",
  companyAddress = "Alamat Perusahaan",
  companyPhone = "Telp: 021-xxxxxxx",
  children,
  footer,
  showSignature = false,
  signatureLeft,
  signatureRight,
}: PDFTemplateProps) {
  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      {/* Print Button - Hidden when printing */}
      <div className="mb-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
              clipRule="evenodd"
            />
          </svg>
          Cetak PDF
        </button>
      </div>

      {/* PDF Content */}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold mb-2 uppercase tracking-wide">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-gray-700 font-medium">{subtitle}</p>
          )}
        </div>

        {/* Company Info */}
        <div className="mb-8 text-right border-b border-gray-300 pb-4">
          <p className="font-bold text-lg mb-1">{companyName}</p>
          <p className="text-sm text-gray-700">{companyAddress}</p>
          <p className="text-sm text-gray-700">{companyPhone}</p>
        </div>

        {/* Content */}
        <div className="mb-6">{children}</div>

        {/* Signature Section */}
        {showSignature && (signatureLeft || signatureRight) && (
          <div className="mt-12 flex justify-between print:mt-16">
            {signatureLeft && (
              <div className="text-center flex-1">
                <p className="mb-20 text-sm font-medium">{signatureLeft.label}</p>
                <div className="border-t-2 border-gray-800 pt-2 w-48 mx-auto">
                  <p className="text-sm font-semibold">{signatureLeft.name}</p>
                </div>
              </div>
            )}
            {signatureRight && (
              <div className="text-center flex-1">
                <p className="mb-20 text-sm font-medium">{signatureRight.label}</p>
                <div className="border-t-2 border-gray-800 pt-2 w-48 mx-auto">
                  <p className="text-sm font-semibold">{signatureRight.name}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="mt-8 text-center text-xs text-gray-500 border-t border-gray-300 pt-4">
            {footer}
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          @page {
            margin: 1.5cm;
            size: A4 portrait;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-4 {
            padding: 1rem !important;
          }
          .print\\:mt-16 {
            margin-top: 4rem !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
