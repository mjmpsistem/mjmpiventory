-- AddForeignKey
ALTER TABLE "production_request" ADD CONSTRAINT "production_request_spkNumber_fkey" FOREIGN KEY ("spkNumber") REFERENCES "spk"("spkNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
