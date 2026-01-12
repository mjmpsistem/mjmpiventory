"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { usePathname } from "next/navigation";

interface BreadcrumbItem {
  label: string;
  href: string;
}

export default function Breadcrumb() {
  const pathname = usePathname();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname?.split("/").filter(Boolean) || [];

    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Dashboard", href: "/dashboard" },
    ];

    const pathMap: Record<string, string> = {
      dashboard: "Dashboard",
      "master-data": "Master Data",
      barang: "Data Barang",
      "jenis-barang": "Jenis Barang",
      satuan: "Satuan",
      transaksi: "Transaksi",
      "barang-masuk": "Barang Masuk",
      "barang-keluar": "Barang Keluar",
      "purchase-order": "Purchase Order",
      "permintaan-produksi": "Permintaan Produksi",
      approval: "Approval",
      laporan: "Laporan",
      stok: "Stok",
    };

    let currentPath = "";

    paths.forEach((path) => {
      // ✅ JANGAN tambahkan dashboard dua kali
      if (path === "dashboard") {
        currentPath = "/dashboard";
        return;
      }

      // Skip ID (uuid / number)
      if (
        path.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        ) ||
        /^\d+$/.test(path)
      ) {
        return;
      }

      // Skip action
      if (["print", "approve", "reject"].includes(path)) {
        return;
      }

      currentPath += `/${path}`;

      const label =
        pathMap[path] || path.charAt(0).toUpperCase() + path.slice(1);

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Jangan tampilkan breadcrumb jika hanya di dashboard
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center gap-2 text-sm mb-4"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {index === 0 ? (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <Home size={16} />
                </Link>
              ) : (
                <>
                  <ChevronRight size={16} className="text-gray-400" />
                  {isLast ? (
                    <span className="font-semibold text-gray-900">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
