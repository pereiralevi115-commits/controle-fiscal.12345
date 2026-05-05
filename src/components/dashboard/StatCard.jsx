import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", color || "bg-primary/10")}>
          <Icon className={cn("w-5 h-5", color ? "text-white" : "text-primary")} />
        </div>
      </div>
    </div>
  );
}