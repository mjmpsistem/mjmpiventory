/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Warehouse,
  LayoutDashboard,
  Database,
  Package,
  ShoppingCart,
  ClipboardList,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Boxes,
  Tag,
  Ruler,
  ArrowDownCircle,
  ArrowUpCircle,
  FileBarChart,
  CheckCircle,
  Info,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Sun, Moon } from "lucide-react";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formattedTime = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path);

  const menuItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Master Data",
      href: "/master-data",
      icon: Database,
      children: [
        { title: "Data Barang", href: "/master-data/barang", icon: Package },
        { title: "Jenis Barang", href: "/master-data/jenis-barang", icon: Tag },
        { title: "Satuan", href: "/master-data/satuan", icon: Ruler },
      ],
    },
    {
      title: "Transaksi",
      href: "/transaksi",
      icon: ShoppingCart,
      children: [
        {
          title: "Barang Masuk",
          href: "/transaksi/barang-masuk",
          icon: ArrowDownCircle,
        },
        {
          title: "Barang Keluar",
          href: "/transaksi/barang-keluar",
          icon: ArrowUpCircle,
        },
        {
          title: "Purchase Order",
          href: "/transaksi/purchase-order",
          icon: ClipboardList,
        },
      ],
    },
    {
      title: "Approval Produksi",
      href: "/approval-barang-jadi",
      icon: CheckCircle,
    },

    {
      title: "Permintaan Produksi",
      href: "/permintaan-produksi",
      icon: ClipboardList,
      children: [
        {
          title: "Daftar Permintaan",
          href: "/permintaan-produksi",
          icon: ClipboardList,
        },
        {
          title: "Approval",
          href: "/permintaan-produksi/approval",
          icon: CheckCircle,
        },
      ],
    },
    {
      title: "Laporan",
      href: "/laporan",
      icon: FileBarChart,
      children: [
        {
          title: "Barang Masuk",
          href: "/laporan/barang-masuk",
          icon: ArrowDownCircle,
        },
        {
          title: "Barang Keluar",
          href: "/laporan/barang-keluar",
          icon: ArrowUpCircle,
        },
        { title: "Stok", href: "/laporan/stok", icon: Boxes },
      ],
    },
    {
      title: "Tentang Aplikasi",
      href: "/tentang-aplikasi",
      icon: Info,
    },
  ];

  // Mapping untuk title dan description setiap page
  const getPageInfo = () => {
    // Cari child yang aktif dulu
    for (const item of menuItems) {
      if (item.children) {
        const activeChild = item.children.find(
          (child) =>
            pathname === child.href || pathname?.startsWith(child.href + "/"),
        );
        if (activeChild) {
          const descriptions: Record<string, string> = {
            "Data Barang": "Kelola data bahan baku dan barang jadi",
            "Jenis Barang":
              "Kelola jenis-jenis barang (Biji Plastik, Pigmen, dll)",
            Satuan: "Kelola satuan barang (Kg, Pcs, Roll, Ball, Pack, dll)",
            "Barang Masuk": "Kelola transaksi barang masuk",
            "Barang Keluar": "Kelola transaksi barang keluar",
            "Purchase Order": "Kelola Purchase Order (PO)",
            "Approval Barang Jadi":
              "Approve pengeluaran barang jadi berdasarkan SPK (FROM_STOCK)",
            "Daftar Permintaan": "Daftar permintaan produksi",
            Approval: "Review dan approve permintaan produksi",
            Stok: "Laporan stok barang",
          };
          return {
            title: activeChild.title,
            href: activeChild.href,
            description: descriptions[activeChild.title] || "",
          };
        }
      }
    }
    // Kalau tidak ada child aktif, cari parent yang aktif
    const activeParent = menuItems.find((item) => isActive(item.href));
    if (activeParent) {
      const descriptions: Record<string, string> = {
        Dashboard: "Ringkasan aktivitas inventory hari ini",
        "Master Data": "Kelola data master",
        Transaksi: "Kelola transaksi barang",
        "Permintaan Produksi": "Kelola permintaan produksi",
        Laporan: "Laporan inventory",
      };
      return {
        title: activeParent.title,
        href: activeParent.href,
        description: descriptions[activeParent.title] || "",
      };
    }
    return {
      title: "Dashboard",
      href: "/dashboard",
      description: "Ringkasan aktivitas inventory hari ini",
    };
  };

  useEffect(() => {
    let isMounted = true;

    // 1️⃣ Ambil cache dulu (sync, tapi dibungkus function)
    const loadCachedUser = () => {
      if (typeof window === "undefined") return;

      const cachedUser = sessionStorage.getItem("authUser");
      if (!cachedUser) return;

      try {
        const parsed = JSON.parse(cachedUser) as User;
        if (isMounted) {
          setUser(parsed);
        }
      } catch {
        sessionStorage.removeItem("authUser");
      }
    };

    // 2️⃣ Fetch user dari API
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (!isMounted) return;

        if (data.user) {
          setUser(data.user);
          sessionStorage.setItem("authUser", JSON.stringify(data.user));
        } else {
          sessionStorage.removeItem("authUser");
          router.push("/login");
        }
      } catch {
        sessionStorage.removeItem("authUser");
        router.push("/login");
      }
    };

    loadCachedUser();
    fetchUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Auto expand menu jika pathname aktif
  useEffect(() => {
    const activeMenu = menuItems.find((item) => {
      if (item.children) {
        return item.children.some(
          (child) =>
            pathname === child.href || pathname?.startsWith(child.href),
        );
      }
      return pathname === item.href || pathname?.startsWith(item.href);
    });
    if (activeMenu && activeMenu.children) {
      setExpandedMenus((prev: string[]) => {
        if (!prev.includes(activeMenu.href)) {
          return [...prev, activeMenu.href];
        }
        return prev;
      });
    }
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const toggleMenu = (href: string) => {
    if (expandedMenus.includes(href)) {
      setExpandedMenus(expandedMenus.filter((h: string) => h !== href));
    } else {
      setExpandedMenus([...expandedMenus, href]);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <Warehouse className="text-blue-600" size={24} />
              <span className="font-bold text-gray-900">Inventory</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={16} className="text-blue-600" />
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-4 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="p-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors rounded-b-lg"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-700 to-indigo-900 text-white z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Warehouse size={24} />
              <span className="font-bold text-lg">Inventory</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus.includes(item.href);

              if (hasChildren) {
                return (
                  <div key={item.href}>
                    <button
                      onClick={() => toggleMenu(item.href)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive(item.href) || isExpanded
                          ? "bg-white/20 text-white"
                          : "text-blue-100 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} />
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-2">
                        {item.children!.map((child) => {
                          const childActive =
                            pathname === child.href ||
                            pathname?.startsWith(child.href);
                          return (
                            <Link
                              prefetch={false}
                              key={child.href}
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                                childActive
                                  ? "bg-white/20 text-white"
                                  : "text-blue-100 hover:bg-white/10"
                              }`}
                            >
                              <child.icon size={16} />
                              <span className="text-sm font-medium">
                                {child.title}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  prefetch={false}
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? "bg-white/20 text-white"
                      : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Content Area */}
      <main className="lg:hidden flex flex-col min-h-screen">
        <div className="flex-1 p-4">{children}</div>
        {/* Mobile Footer */}
        <footer className="bg-white border-t border-gray-200 py-3 px-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Inventory System
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Warehouse size={14} className="text-blue-600" />
              <span>Inventory</span>
            </div>
          </div>
        </footer>
      </main>

      <div className="hidden lg:flex">
        {/* Desktop Sidebar */}
        <Sidebar
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          expandedMenus={expandedMenus}
          toggleMenu={toggleMenu}
          menuItems={menuItems}
          pathname={pathname}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 min-h-screen flex flex-col transition-all duration-300 ${
            sidebarOpen ? "lg:ml-64" : "lg:ml-20"
          }`}
        >
          {/* Desktop Header */}
          <header
            className="
    hidden lg:block sticky top-0 z-20
    bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700
    border-b border-blue-800/60
  "
          >
            <div className="flex items-center justify-between px-6 h-16">
              {/* LEFT — TITLE + DATE */}
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-white/20 text-white">
                  <LayoutDashboard size={20} />
                </div>

                <div className="leading-tight">
                  <h1 className="text-lg font-semibold text-white">
                    {getPageInfo().title}
                  </h1>

                  <div className="flex items-center gap-2 text-xs text-blue-100">
                    <span>{formattedDate}</span>
                    {getPageInfo().description && (
                      <>
                        <span className="opacity-50">•</span>
                        <span>{getPageInfo().description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT — TIME + ACTION */}
              <div className="flex items-center gap-3">
                {/* TIME BADGE */}
                <div
                  className="
          px-3 py-1.5
          rounded-xl
          bg-white/15
          border border-white/20
          font-mono text-sm
          text-white
          tracking-wider
        "
                >
                  {formattedTime}
                </div>

                {/* Dark Mode */}
                <button
                  onClick={toggleDarkMode}
                  className="
          p-2 rounded-xl
          bg-white/20 hover:bg-white/30
          transition
        "
                  title="Toggle dark mode"
                >
                  {darkMode ? (
                    <Sun size={18} className="text-yellow-300" />
                  ) : (
                    <Moon size={18} className="text-white" />
                  )}
                </button>

                {/* USER */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="
            flex items-center gap-3 px-3 py-2 rounded-xl
            hover:bg-white/20 transition
          "
                  >
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <div className="text-right leading-tight">
                      <p className="text-sm font-medium text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-blue-100">{user.role}</p>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-white transition-transform ${
                        userDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {userDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserDropdownOpen(false)}
                      />

                      <div
                        className="
                absolute right-0 mt-2 w-48
                bg-white rounded-xl shadow-xl
                border border-gray-200 z-20 overflow-hidden
              "
                      >
                        <div className="p-3 bg-gray-50 border-b">
                          <p className="text-sm font-medium text-gray-900">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">{user.role}</p>
                        </div>

                        <button
                          onClick={handleLogout}
                          className="
                  w-full flex items-center gap-3
                  px-4 py-3 text-sm
                  text-gray-700
                  hover:bg-red-50 hover:text-red-600
                  transition
                "
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 p-4 lg:p-6">{children}</div>

          {/* Footer */}
          <footer className="hidden lg:block bg-white border-t border-gray-200 py-4 px-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} Inventory Management System. All
                rights reserved.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Warehouse size={16} className="text-blue-600" />
                <span className="font-medium">Inventory System</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
