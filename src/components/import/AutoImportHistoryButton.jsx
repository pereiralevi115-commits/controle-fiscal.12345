import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import AutoImportHistoryDialog from "@/components/import/AutoImportHistoryDialog";

export default function AutoImportHistoryButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
      >
        <History className="w-4 h-4" />
        Histórico de notas
      </Button>
      <AutoImportHistoryDialog open={open} onOpenChange={setOpen} />
    </>
  );
}