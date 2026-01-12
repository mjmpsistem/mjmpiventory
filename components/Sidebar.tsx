"use client";

import Link from "next/link";
import { Warehouse, Menu, X, User, ChevronDown } from "lucide-react";

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
  handleLogout: () => void;
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
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.href);

    if (hasChildren) {
      return (
        <div key={item.href}>
          <button
            onClick={() => toggleMenu(item.href)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              active || isExpanded
                ? "bg-white/20 text-white shadow-lg"
                : "text-blue-100 hover:bg-white/10"
            } ${!sidebarOpen ? "justify-center" : ""}`}
            title={!sidebarOpen ? item.title : ""}
          >
            <item.icon size={20} className="flex-shrink-0" />
            {sidebarOpen && (
              <>
                <span className="font-medium flex-1 text-left">
                  {item.title}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </>
            )}
          </button>
          {sidebarOpen && isExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-2">
              {item.children!.map((child) => {
                const childActive =
                  pathname === child.href || pathname?.startsWith(child.href);
                return (
                  <Link
                    prefetch={false}
                    key={child.href}
                    href={child.href}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      childActive
                        ? "bg-white/20 text-white"
                        : "text-blue-100 hover:bg-white/10"
                    }`}
                  >
                    <child.icon size={16} className="flex-shrink-0" />
                    <span className="text-sm font-medium">{child.title}</span>
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
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          active
            ? "bg-white/20 text-white shadow-lg"
            : "text-blue-100 hover:bg-white/10"
        } ${!sidebarOpen ? "justify-center" : ""}`}
        title={!sidebarOpen ? item.title : ""}
      >
        <item.icon size={20} className="flex-shrink-0" />
        {sidebarOpen && (
          <span className="font-medium flex-1">{item.title}</span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`hidden lg:block bg-gradient-to-b from-blue-700 to-indigo-900 text-white transition-all duration-300 ease-in-out ${
        sidebarOpen ? "w-64" : "w-20"
      } fixed h-screen z-30`}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Warehouse size={28} />
              <span className="font-bold text-lg">Inventory</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-white/10">
          <div
            className={`flex items-center gap-3 ${
              !sidebarOpen ? "justify-center" : ""
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User size={20} />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-blue-200 truncate">{user.role}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
