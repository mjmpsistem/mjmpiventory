import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRaw`
CREATE OR REPLACE FUNCTION public.notify_on_new_record()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    notif_title TEXT;
    notif_message TEXT;
    notif_type TEXT := 'INFO';
    notif_url TEXT;
    target_spk_number TEXT;
BEGIN
    -- Logika berdasarkan tabel mana yang memicu
    IF (TG_TABLE_NAME = 'spk') THEN
        notif_title := 'SPK Baru';
        notif_message := 'SPK #' || NEW."spkNumber" || ' telah dibuat.';
        notif_url := '/dashboard';
        
    ELSIF (TG_TABLE_NAME = 'production_request') THEN
        target_spk_number := COALESCE(NEW."spkNumber", NEW."spkReturNumber");
        
        -- Kasus INSERT (Baru)
        IF (TG_OP = 'INSERT') THEN
            notif_title := 'Permintaan Produksi Baru';
            notif_message := 'SPK #' || target_spk_number || ' - ' || NEW."productName";
            notif_url := '/permintaan-produksi';
            
        -- Kasus UPDATE (Approval)
        ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'PENDING' AND NEW.status = 'APPROVED') THEN
            notif_title := 'Permintaan Form Stok';
            notif_message := 'Bahan baku untuk SPK #' || target_spk_number || ' siap diproses dari Gudang.';
            notif_url := '/transaksi/barang-keluar';
        END IF;
        
    ELSIF (TG_TABLE_NAME = 'purchase_order') THEN
        notif_title := 'Purchase Order Baru';
        notif_message := 'PO #' || NEW."nomorPO" || ' untuk ' || NEW.kepada;
        notif_url := '/transaksi/purchase-order';
        
    ELSIF (TG_TABLE_NAME = 'waste_stock') THEN
        notif_title := 'Pencatatan Waste Baru';
        notif_message := 'Ada pencatatan waste material baru sebesar ' || NEW.quantity || ' Kg.';
        notif_type := 'WARNING';
        notif_url := '/transaksi/waste';
    END IF;

    -- Masukkan ke tabel notification (hanya jika pesan ada)
    IF (notif_title IS NOT NULL) THEN
        INSERT INTO public.notification (id, title, message, type, "targetUrl", "isRead", "createdAt")
        VALUES (gen_random_uuid(), notif_title, notif_message, notif_type, notif_url, false, now());
    END IF;

    RETURN NEW;
END;
$function$
  `
  console.log("Trigger function updated!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
