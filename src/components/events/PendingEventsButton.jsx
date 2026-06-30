import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BellRing } from "lucide-react";
import PendingEventsDialog from "@/components/events/PendingEventsDialog";

export default function PendingEventsButton() {
  const [open, setOpen] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["pending-fiscal-events"],
    queryFn: () => base44.entities.PendingFiscalEvent.filter({ status: "pendente" }),
    refetchInterval: 60000,
  });

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="gap-2 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
      >
        <BellRing className="w-4 h-4" />
        Eventos para aprovar
        {events.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
            {events.length}
          </span>
        )}
      </Button>
      <PendingEventsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}