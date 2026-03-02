"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Warehouse, Menu, X, User, ChevronDown } from "lucide-react";
import Image from "next/image";

interface UserType {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface MenuChildItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

interface MenuItem extends MenuChildItem {
  children?: MenuChildItem[];
}

interface SidebarProps {
  user: UserType;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  expandedMenus: string[];
  toggleMenu: (href: string) => void;
  menuItems: MenuItem[];
  pathname: string | null;
}

export function Sidebar({
  user,
  sidebarOpen,
  setSidebarOpen,
  expandedMenus,
  toggleMenu,
  menuItems,
  pathname,
}: SidebarProps) {
  const isActive = (path: string) =>
    pathname === path || pathname?.startsWith(path);

  const renderMenuItem = (item: MenuItem) => {
    const active = isActive(item.href);
    const hasChildren = item.children?.length;
    const isExpanded = expandedMenus.includes(item.href);

    if (hasChildren) {
      return (
        <div key={item.href} className="relative group">
          <button
            onClick={() => toggleMenu(item.href)}
            className={`
              relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
              ${active || isExpanded ? "bg-blue-800 text-white shadow-lg" : "text-gray-700 dark:text-gray-300 hover:bg-blue-200 dark:hover:bg-blue-900/40 hover:text-blue-900 dark:hover:text-blue-100"}
              ${!sidebarOpen ? "justify-center" : ""}
            `}
            title={!sidebarOpen ? item.title : ""}
          >
            {active && sidebarOpen && (
              <motion.div
                layout
                className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-tr-lg rounded-br-lg shadow-lg"
              />
            )}

            <item.icon
              size={20}
              className="flex-shrink-0 transition-transform group-hover:scale-110"
            />

            {!sidebarOpen && item.badge ? (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}

            {sidebarOpen && (
              <>
                <span className="flex-1 text-left font-medium">
                  {item.title}
                </span>
                {item.badge ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                />
              </>
            )}
          </button>

          <AnimatePresence>
            {sidebarOpen && isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="ml-4 mt-1 space-y-1 border-l border-gray-300/40 dark:border-gray-700/50 pl-3"
              >
                {item.children!.map((child) => {
                  const childActive = isActive(child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      prefetch={false}
                      className={`
                        relative flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200
                        ${childActive ? "bg-blue-800 text-white shadow-md" : "text-gray-700 dark:text-gray-300 hover:bg-blue-200 dark:hover:bg-blue-900/40 hover:text-blue-900 dark:hover:text-blue-100"}
                      `}
                      title={!sidebarOpen ? child.title : ""}
                    >
                      {childActive && sidebarOpen && (
                        <motion.div
                          layout
                          className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-tr-lg rounded-br-lg shadow-md"
                        />
                      )}
                      <child.icon size={16} />
                      {sidebarOpen && <span className="flex-1">{child.title}</span>}
                      {child.badge ? (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {child.badge > 99 ? '99+' : child.badge}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={false}
        className={`
          relative group flex items-center gap-3 px-4 py-3 rounded-xl transition-all
          ${active ? "bg-blue-800 text-white shadow-lg" : "text-gray-700 dark:text-gray-300 hover:bg-blue-200 dark:hover:bg-blue-900/40 hover:text-blue-900 dark:hover:text-blue-100"}
          ${!sidebarOpen ? "justify-center" : ""}
        `}
        title={!sidebarOpen ? item.title : ""}
      >
        {active && sidebarOpen && (
          <motion.div
            layout
            className="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-tr-lg rounded-br-lg shadow-lg"
          />
        )}
        <item.icon size={20} />
        {sidebarOpen && <span className="flex-1 font-medium">{item.title}</span>}
        {item.badge ? (
          <span className={`
            bg-red-500 text-white text-[10px] font-bold rounded-full text-center
            ${sidebarOpen ? 'px-1.5 py-0.5 min-w-[20px]' : 'absolute top-2 right-2 w-4 h-4 flex items-center justify-center'}
          `}>
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 256 : 80 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="hidden lg:flex flex-col fixed h-screen z-30 shadow-lg border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-[#020617]"
    >
      {/* HEADER */}
      <div
        className="flex items-center justify-between p-3
             bg-blue-600 text-white
             border-b border-blue-700/50"
      >
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 relative">
              <Image
                src="/assets/logo.png"
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
            <span
              className="font-extrabold text-xl tracking-tight 
             bg-clip-text text-transparent 
             bg-gradient-to-r from-green-300 via-yellow-200 to-white
             drop-shadow-lg
             transition-transform duration-300 hover:scale-105"
            >
              MJMP Inventory
            </span>
          </motion.div>
        )}

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-blue-500/50 active:bg-blue-600/50 transition"
          title="Toggle Sidebar"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-[#020617] space-y-1 shadow-inner">
        {menuItems.map(renderMenuItem)}
      </nav>
      {/* USER FOOTER */}
      <div className="mt-auto p-3 bg-gray-100 dark:bg-slate-900 border-t dark:border-gray-800">
        <div
          className={`flex items-center gap-2 ${!sidebarOpen ? "justify-center" : ""}`}
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
            <User size={16} className="text-white" />
          </div>

          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
