import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ambil daftar notifikasi terbaru
export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// Tandai notifikasi sebagai terbaca
export async function PATCH(request: Request) {
  try {
    const { id, all } = await request.json();

    if (all) {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true }
      });
    } else if (id) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
