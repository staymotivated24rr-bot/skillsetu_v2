ALTER TABLE "DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
