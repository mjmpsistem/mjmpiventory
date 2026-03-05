"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationCounts {
  purchaseOrder: number;
  productionRequest: number;
  productionApprovalNormal: number;
  productionApprovalRetur: number;
  gudangApproval: number;
  waste: number;
  poPending: number;
  tradingNeeded: number;
  shippingReady: number;
  productionRetur: number;
  gudangRetur: number;
  shippingRetur: number;
  shippingTransit: number;
  shippingReturTransit: number;
}

interface NotificationContextType {
  notifications: Notification[];
  counts: NotificationCounts;
  audioUnlocked: boolean;
  audioBlocked: boolean;
  user: User | null;
  unlockAudio: () => void;
  playNotificationSound: () => void;
  fetchCounts: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id?: string, all?: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts, setCounts] = useState<NotificationCounts>({
    purchaseOrder: 0,
    productionRequest: 0,
    productionApprovalNormal: 0,
    productionApprovalRetur: 0,
    gudangApproval: 0,
    waste: 0,
    poPending: 0,
    tradingNeeded: 0,
    shippingReady: 0,
    productionRetur: 0,
    gudangRetur: 0,
    shippingRetur: 0,
    shippingTransit: 0,
    shippingReturTransit: 0,
  });

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const lastPlayedRef = useRef<number>(0);
  const router = useRouter();

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/notifications/counts");
      const data = await res.json();
      if (data && !data.error) {
        setCounts(data);
      }
    } catch (err) {
      console.error("Failed to fetch notification counts", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotifications(data);
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

  const unlockAudio = () => {
    if (audioUnlocked) return;
    try {
      const audio = new Audio("/assets/notif.mp3");
      audio.volume = 0;
      audio.play()
        .then(() => {
          setAudioUnlocked(true);
          setAudioBlocked(false);
          console.log("Audio: System unlocked ✅");
        })
        .catch(() => {
          setAudioBlocked(true);
        });
    } catch (e) {
      console.error("Audio: Unlock failed", e);
    }
  };

  const playNotificationSound = () => {
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;

    try {
      const audio = new Audio("/assets/notif.mp3");
      audio.volume = 0.6;
      audio.play()
        .then(() => {
          setAudioBlocked(false);
          setAudioUnlocked(true);
        })
        .catch(() => {
          setAudioBlocked(true);
        });
    } catch (err) {
      console.error("Audio: Play error", err);
    }
  };

  // Auth Effect
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          sessionStorage.setItem("authUser", JSON.stringify(data.user));
        }
      } catch (err) {
        console.error("Auth fetch failed", err);
      }
    };
    fetchUser();
  }, []);

  // Real-time Effect
  useEffect(() => {
    fetchCounts();
    fetchNotifications();

    const channel = supabase
      .channel("inventory-notifications-global")
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "purchase_order" },
        () => {
          fetchCounts();
          toast.success("Purchase Order Baru telah masuk!", { icon: <span>🛒</span> });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "production_request" },
        (payload) => {
          fetchCounts();
          if (payload.eventType === "INSERT") {
            toast.warning("Permintaan Produksi Baru!", { icon: <span>🏭</span> });
          } else if (payload.eventType === "UPDATE") {
            const oldRow = payload.old as any;
            const newRow = payload.new as any;
            if (oldRow?.status !== "APPROVED" && newRow?.status === "APPROVED") {
              toast.success(`Produksi untuk ${newRow.productName} disetujui!`, { icon: <span>✅</span> });
              playNotificationSound();
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "waste_stock" },
        () => {
          fetchCounts();
          toast.error("Ada barang Waste baru di gudang!", { icon: <span>♻️</span> });
        },
      )
      .on(
         "postgres_changes",
         { event: "*", schema: "public", table: "spk" },
         (payload) => {
           fetchCounts();
           if (payload.eventType === "UPDATE") {
              const oldRow = payload.old as any;
              const newRow = payload.new as any;
              const readyStatuses = ["READY_TO_SHIP", "PARTIAL"];
              if (readyStatuses.includes(newRow.status) && !readyStatuses.includes(oldRow.status)) {
                toast.info(`SPK ${newRow.spkNumber} siap dikirim!`, { icon: <span>📦</span> });
              }
           }
         }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spk_item" },
        () => fetchCounts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spk_retur" },
        () => fetchCounts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spk_retur_item" },
        () => fetchCounts(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        counts,
        audioUnlocked,
        audioBlocked,
        user,
        unlockAudio,
        playNotificationSound,
        fetchCounts,
        fetchNotifications,
        markAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
