import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function InvoiceTableTooltip({ children, content }) {
  if (!content) {
    return children;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild className="cursor-help">
          {children}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}