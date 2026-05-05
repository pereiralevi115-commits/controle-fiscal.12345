import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Upload, Store, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Notas Fiscais", path: "/notas", icon: FileText },
  { label: "Importar XML", path: "/importar", icon: Upload },
  { label: "Fornecedores", path: "/fornecedores", icon: Store },
  { label: "Filiais", path: "/filiais", icon: Building2 },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-40">
      <div className="flex items-center h-16 px-6 gap-8">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">Controle Fiscal</span>
        </div>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}