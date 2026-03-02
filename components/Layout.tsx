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
  Recycle,
  Truck,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Sun, Moon, Bell } from "lucide-react";
import { toast } from "react-toastify";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface MenuChildItem {
  title: string;
  href: string;
  icon: any; // Using any for simplicity as Lucide icons have complex types
  badge?: number;
}

interface MenuItem extends MenuChildItem {
  children?: MenuChildItem[];
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [counts, setCounts] = useState<{
    purchaseOrder: number;
    productionRequest: number;
    productionApproval: number;
    gudangApproval: number;
    waste: number;
    poPending: number;
    tradingNeeded: number;
    shippingReady: number;
  }>({
    purchaseOrder: 0,
    productionRequest: 0,
    productionApproval: 0,
    gudangApproval: 0,
    waste: 0,
    poPending: 0,
    tradingNeeded: 0,
    shippingReady: 0,
  });

  const pathname = usePathname();
  const router = useRouter();

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize time on client only
    setNow(new Date());

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = now
    ? now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";

  const formattedTime = now
    ? now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path);

  const menuItems: MenuItem[] = [
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
        {
          title: "Monitoring Waste",
          href: "/transaksi/waste",
          icon: Recycle,
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
      title: "Pengiriman",
      href: "/shipping",
      icon: Truck,
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
            Pengiriman: "Kelola dan pantau pengiriman barang ke pelanggan",
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
        Pengiriman: "Kelola dan pantau pengiriman barang ke pelanggan",
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

  const fetchCounts = async () => {
    try {
      console.log("Fetching notification counts...");
      const res = await fetch("/api/notifications/counts");
      const data = await res.json();
      console.log("Counts data received:", data);
      if (data && !data.error) {
        setCounts(data);
      } else if (data.error) {
        console.error("API error fetching counts:", data.error);
      }
    } catch (err) {
      console.error("Failed to fetch notification counts", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      console.log("Fetching notifications list...");
      const res = await fetch("/api/notifications");
      const data = await res.json();
      console.log("Notifications data received:", data);
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        console.warn("Notifications data is not an array:", data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const markAsRead = async (id?: string, all = false) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id, all }),
      });
      if (all) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        );
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
}



  // --- AUDIO UNLOCKER ---
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const unlockAudio = () => {
    if (audioUnlocked) return;
    
    try {
      // Play a silent or very short sound to "unlock" audio for the session
      const audio = new Audio("/assets/notif.mp3");
      audio.volume = 0; // Silent play to prime the browser
      audio.play()
        .then(() => {
          setAudioUnlocked(true);
          console.log("Audio: System unlocked via user interaction ✅");
          // Remove listener once unlocked
          window.removeEventListener("click", unlockAudio);
        })
        .catch(() => {
          // Keep trying on next click if it fails
        });
    } catch (e) {
      console.error("Audio: Unlock failed", e);
    }
  };

  useEffect(() => {
    if (!audioUnlocked) {
      window.addEventListener("click", unlockAudio);
    }
    return () => window.removeEventListener("click", unlockAudio);
  }, [audioUnlocked]);
  // ------------------------

  const playNotificationSound = () => {
    try {
      const audioUrl = "/assets/notif.mp3";
      const audio = new Audio(audioUrl);
      audio.volume = 0.6;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => console.log("Audio: Notification played successfully ✅"))
          .catch(error => {
            console.warn("Audio: Play blocked ❌", error.name);
            // No more showing toast advice here since we have the unlocker
          });
      }
    } catch (err) {
      console.error("Audio: Critical error", err);
    }
  };

  useEffect(() => {
    fetchCounts();
    fetchNotifications();

    const channel = supabase
      .channel("inventory-notifications")
      // 1. General Notifications (Manual / System Alerts)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notification" },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => {
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
          fetchCounts(); 
          toast.info(newNotif.message || "Notifikasi Baru", {
            icon: <span>🔔</span>,
            onClick: () => router.push("/notifications")
          });
          playNotificationSound();
        },
      )
      // 2. New Purchase Order (Always Alert)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "purchase_order" },
        () => {
          fetchCounts();
          toast.success("Purchase Order Baru telah masuk!", { icon: <span>🛒</span> });
          playNotificationSound();
        },
      )
      // 3. Production Requests (New & Approved)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_request" },
        (payload) => {
          fetchCounts();
          
          if (payload.eventType === "INSERT") {
            toast.warning("Permintaan Produksi Baru!", { icon: <span>🏭</span> });
            playNotificationSound();
          } else if (payload.eventType === "UPDATE") {
            const oldRow = payload.old as any;
            const newRow = payload.new as any;
            // Only alert if status changed to APPROVED
            if (oldRow?.status !== "APPROVED" && newRow?.status === "APPROVED") {
              toast.success(`Produksi untuk ${newRow.productName} disetujui!`, { icon: <span>✅</span> });
              playNotificationSound();
            }
          }
        },
      )
      // 4. Waste Stock (Alert only on NEW waste)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waste_stock" },
        () => {
          fetchCounts();
          toast.error("Ada barang Waste baru di gudang!", { icon: <span>♻️</span> });
          playNotificationSound();
        },
      )
      // 5. Silent Updates (SPK changes only update counts/badges)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spk" },
        (payload) => {
          fetchCounts();
          if (payload.eventType === "UPDATE") {
             const oldRow = payload.old as any;
             const newRow = payload.new as any;
             const readyStatuses = ["READY_TO_SHIP", "PARTIAL"];
             if (
               readyStatuses.includes(newRow.status) &&
               !readyStatuses.includes(oldRow.status)
             ) {
               toast.info(`SPK ${newRow.spkNumber} siap dikirim!`, {
                 icon: <span>📦</span>,
               });
               playNotificationSound();
             }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spk_item" },
        () => fetchCounts(),
      )
      // 6. Maintenance (Update counts for other waste changes)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "waste_stock" },
        () => fetchCounts(),
      )
      .subscribe((status) => {
        console.log("Supabase Realtime Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  // Create a safe user object for rendering
  const currentUser = user || {
    id: "loading",
    name: "...",
    role: "...",
    username: "...",
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getMenuItemsWithBadges = () => {
    const role = currentUser.role;
    const isSuper = role === "SUPERADMIN" || role === "FOUNDER";
    const isKepala = role === "KEPALA_INVENTORY";
    const isAdmin = role === "ADMIN";

    return menuItems
      .filter((item) => {
        if (isSuper) return true;
        if (isKepala) {
          return item.href !== "/approval-barang-jadi";
        }
        if (isAdmin) {
          const allowed = [
            "/dashboard",
            "/transaksi",
            "/laporan",
            "/tentang-aplikasi",
          ];
          return allowed.includes(item.href);
        }
        return true;
      })
      .map((item) => {
        // Clone the item
        const newItem = { ...item };

        // Clone children if they exist to prevent mutation and filter them
        if (newItem.children) {
          newItem.children = newItem.children
            .filter((child) => {
              if (isSuper) return true;
              if (isKepala) {
                return child.href !== "/permintaan-produksi/approval";
              }
              if (isAdmin) {
                if (newItem.title === "Transaksi") {
                  return child.title === "Monitoring Waste";
                }
                return true;
              }
              return true;
            })
            .map((child) => ({ ...child }));
        }

      // Assign badges to specific children
      if (newItem.title === "Transaksi") {
        const poChild = newItem.children?.find(
          (c: MenuChildItem) => c.title === "Purchase Order",
        );
        const wasteChild = newItem.children?.find(
          (c: MenuChildItem) => c.title === "Monitoring Waste",
        );
        if (poChild) poChild.badge = counts.purchaseOrder;
        if (wasteChild) wasteChild.badge = counts.waste;
      }

      if (newItem.title === "Permintaan Produksi") {
        const daftarChild = newItem.children?.find(
          (c: MenuChildItem) => c.title === "Daftar Permintaan",
        );
        const approvalChild = newItem.children?.find(
          (c: MenuChildItem) => c.title === "Approval",
        );
        if (daftarChild) daftarChild.badge = counts.productionRequest;
        if (approvalChild) approvalChild.badge = counts.productionApproval;
      }

      if (newItem.title === "Approval Produksi") {
        newItem.badge = counts.gudangApproval;
      }

      if (newItem.title === "Pengiriman") {
        newItem.badge = counts.shippingReady;
      }

      // AGGREGATION LOGIC: If a parent has children with badges, sum them up for the parent badge
      if (newItem.children && newItem.children.length > 0) {
        const totalChildrenBadge = newItem.children.reduce(
          (sum, child) => sum + (child.badge || 0),
          0,
        );
        
        // Only set parent badge if it doesn't already have one (or combine them)
        if (totalChildrenBadge > 0) {
          newItem.badge = (newItem.badge || 0) + totalChildrenBadge;
        }
      }

      return newItem;
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <Warehouse className="text-blue-600" size={24} />
              <span className="font-bold text-gray-900 dark:text-white">
                JMP Inventory
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
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
                  <div className="absolute right-4 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 z-20">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {currentUser.role}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors rounded-b-lg"
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
        className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-700 to-indigo-900 text-white z-50 transform transition-transform duration-300 ease-in-out print:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Warehouse size={24} />
              <span className="font-bold text-lg">JMP Inventory</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="space-y-1">
            {getMenuItemsWithBadges().map((item) => {
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
                        {item.badge ? (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
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
                              <span className="text-sm font-medium flex-1">
                                {child.title}
                              </span>
                              {child.badge ? (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                                  {child.badge > 99 ? "99+" : child.badge}
                                </span>
                              ) : null}
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
                  <span className="font-medium flex-1">{item.title}</span>
                  {item.badge ? (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
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
        <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-800 py-3 px-4 transition-colors print:hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} Inventory System
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Warehouse size={14} className="text-blue-600" />
              <span>Inventory</span>
            </div>
          </div>
        </footer>
      </main>

      <div className="hidden lg:flex">
        {/* Desktop Sidebar */}
        <div className="print:hidden">
          <Sidebar
            user={currentUser}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            expandedMenus={expandedMenus}
            toggleMenu={toggleMenu}
            menuItems={getMenuItemsWithBadges()}
            pathname={pathname}
          />
        </div>

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
    print:hidden
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

                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition relative"
                    title="Notifikasi"
                  >
                    <Bell size={18} className="text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10 bg-black/5"
                        onClick={() => setNotificationsOpen(false)}
                      />

                      {/* Dropdown */}
                      <div
                        className="
        absolute right-0 mt-3 w-[360px]
        rounded-2xl overflow-hidden
        bg-white dark:bg-slate-900
        border border-gray-200 dark:border-gray-800
        shadow-xl
        z-20
        animate-in fade-in slide-in-from-top-2
      "
                      >
                        {/* Header */}
                        <div
                          className="
          flex items-center justify-between px-4 py-3
          bg-gray-50 dark:bg-slate-800
          border-b border-gray-200 dark:border-gray-800
        "
                        >
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            🔔 Notifikasi
                          </p>

                          <button
                            onClick={() => markAsRead(undefined, true)}
                            className="
            text-xs px-3 py-1 rounded-full
            bg-blue-100 text-blue-700
            hover:bg-blue-200
            dark:bg-blue-900/30 dark:text-blue-400
            transition
          "
                          >
                            Tandai semua
                          </button>
                        </div>

                        {/* Content */}
                        <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                          {notifications.length === 0 ? (
                            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                              <Bell
                                size={28}
                                className="mx-auto mb-3 opacity-30"
                              />
                              <p className="text-sm font-medium">
                                Belum ada notifikasi
                              </p>
                              <p className="text-xs mt-1 opacity-70">
                                Semua update akan muncul di sini
                              </p>
                            </div>
                          ) : (
                            notifications.map((n, idx) => (
                              <button
                                key={n.id || `notif-${idx}`}
                                onClick={() => {
                                  markAsRead(n.id);
                                  setNotificationsOpen(false);
                                  if (n.targetUrl) router.push(n.targetUrl);
                                }}
                                className={`
                group relative w-full text-left px-4 py-3
                transition-colors
                hover:bg-gray-50 dark:hover:bg-slate-800
                ${!n.isRead ? "bg-blue-50 dark:bg-blue-900/10" : ""}
              `}
                              >
                                {/* Accent unread */}
                                {!n.isRead && (
                                  <span className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
                                )}

                                <div className="flex gap-3">
                                  {/* Dot */}
                                  <div
                                    className={`
                    mt-2 w-2 h-2 rounded-full flex-shrink-0
                    ${!n.isRead ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}
                  `}
                                  />

                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                                      {n.title}
                                    </p>

                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                      {n.message}
                                    </p>

                                    <p className="mt-1 text-[10px] text-gray-400">
                                      {new Date(n.createdAt).toLocaleString(
                                        "id-ID",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          day: "2-digit",
                                          month: "short",
                                        },
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

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
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-blue-100">
                        {currentUser.role}
                      </p>
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
                bg-white dark:bg-slate-900 rounded-xl shadow-xl
                border border-gray-200 dark:border-gray-800 z-20 overflow-hidden
              "
                      >
                        <div className="p-3 bg-gray-50 dark:bg-slate-800 border-b dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {currentUser.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {currentUser.role}
                          </p>
                        </div>

                        <button
                          onClick={handleLogout}
                          className="
                  w-full flex items-center gap-3
                  px-4 py-3 text-sm
                  text-gray-700 dark:text-gray-300
                  hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400
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
          <footer className="hidden lg:block bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-gray-800 py-4 px-6 transition-colors print:hidden">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                © {new Date().getFullYear()} Inventory Management System. All
                rights reserved.
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
