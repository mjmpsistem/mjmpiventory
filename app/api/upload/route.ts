import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { UserRole } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    requireAuth(request, [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_GUDANG,
      UserRole.STAFF_GUDANG,
      UserRole.DRIVER
    ]);

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client is not initialized. Check your environment variables (SUPABASE_SERVICE_ROLE_KEY, etc).");
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // 3. Prepare File Data
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Gunakan filename yang bersih (alfanumerik + underscore + timestamp)
    const cleanOrigName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
    const fileName = `${Date.now()}-${cleanOrigName}`;
    const filePath = `shipments/${fileName}`;

    // 4. Upload to Supabase Storage (Using Admin Client to bypass RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("bukti-pengiriman") 
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 5. Get Public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("bukti-pengiriman")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error("Gagal mendapatkan Public URL dari Supabase");
    }

    return NextResponse.json({ 
      url: publicUrlData.publicUrl,
      path: filePath,
      name: file.name
    });

  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah file" },
      { status: 500 }
    );
  }
}
